import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Business {
    id: string;
    name: string;
    address: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    industry?: string;
    region?: string;
    rating?: string;
    reviewsCount: number;
    reviews?: Review[];
    categories?: string[];
    openingHours?: string[];
    link: string;
    contacts?: Contact[];
    scrapedAt: string;
}

interface Review {
    rating: number;
    text?: string;
}

interface Contact {
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
}

export class FirmyCzScraper {
    private baseUrl = 'https://www.firmy.cz/';
    private searchQuery: string;
    private businesses: Record<string, Business> = {};
    private readonly cookiesPath: string;

    private browser: Browser | null = null;
    private page: Page | null = null;
    private industryId: number | null = null;
    private regionId: number | null = null;

    constructor(
        public industry: string,
        public region: string,
    ) {
        this.searchQuery = `${industry} ${region}`;
        this.cookiesPath = path.join(__dirname, '..', '..', 'cookies-firmy-cz.json');
        this.init();
    }

    private async init() {
        // Najít nebo vytvořit industry
        let industry = await prisma.industry.findUnique({
            where: { name: this.industry },
        });

        if (!industry) {
            console.error(`Industry ${this.industry} nebyl nalezen v databázi.`);
            industry = await prisma.industry.create({ data: { name: this.industry } });
        }

        // Najít nebo vytvořit region
        let region = await prisma.region.findUnique({
            where: { name: this.region },
        });

        if (!region) {
            console.error(`Region ${this.region} nebyl nalezen v databázi.`);
            region = await prisma.region.create({ data: { name: this.region } });
        }

        this.industryId = industry?.id;
        this.regionId = region?.id;
    }

    private async saveCookies(): Promise<void> {
        if (!this.page) return;
        const cookies = await this.page.cookies();
        await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
    }

    private async loadCookies(): Promise<void> {
        if (!this.page) return;
        try {
            if (existsSync(this.cookiesPath)) {
                const cookiesString = readFileSync(this.cookiesPath, 'utf8');
                const cookies = JSON.parse(cookiesString);
                await this.page.setCookie(...cookies);
            }
        } catch (error) {
            console.error('Error loading cookies:', error);
        }
    }

    async initializeBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: false, // můžete nastavit na false pro vizuální ladění
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process', // pokud máte málo paměti
                    '--disable-gpu',
                ],
            });
        }

        if (!this.page) {
            this.page = await this.browser.newPage();
            await this.loadCookies();

            // Nastavení User-Agent a dalších headers pro lepší maskování
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            );
        }
    }

    async closeBrowser() {
        if (this.page) {
            await this.saveCookies();
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async loadDatabase() {
        try {
            // Načtení existujících firem z databáze pro daný industry a region
            const industryRecord = await prisma.industry.findUnique({
                where: { name: this.industry },
            });

            const regionRecord = await prisma.region.findUnique({
                where: { name: this.region },
            });

            if (industryRecord && regionRecord) {
                const companies = await prisma.company.findMany({
                    where: {
                        industryId: industryRecord.id,
                        regionId: regionRecord.id,
                    },
                    include: {
                        categories: true,
                    },
                });

                // Převod na formát, který používá scraper
                companies.forEach((company) => {
                    this.businesses[company.link] = {
                        id: company.id,
                        name: company.name,
                        address: company.address,
                        email: company.email,
                        phone: company.phone,
                        website: company.website,
                        industry: this.industry,
                        region: this.region,
                        reviewsCount: company.reviewsCount,
                        categories: company.categories.map((cat) => cat.name),
                        link: company.link,
                        scrapedAt: company.scrapedAt.toISOString(),
                    };
                });

                console.log(`Načteno ${companies.length} firem z databáze.`);
            }
        } catch (err) {
            console.error('Chyba při načítání dat z databáze:', err);
        }
    }

    async scrapeLink(link: string) {
        await this.initializeBrowser();
        await this.page!.goto(link, {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });
        const business = await this.scrapeBusinessDetails(link);
        console.dir({ link, business }, { depth: 5 });
        await this.updateCompany(business);
    }

    async scrape() {
        await this.initializeBrowser();
        await this.loadDatabase();
        try {
            let currentPage = 1;
            let hasNextPage = true;
            const pageUrl = this.buildPageUrl(currentPage);
            await this.page!.goto(pageUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            while (hasNextPage) {
                console.log(`Scraping page ${currentPage}: ${pageUrl}`);

                await this.page!.waitForSelector('.companyTitle.statCompanyDetail', {
                    timeout: 10000,
                });

                const pageHtml = await this.page!.content();
                const companyLinks = this.extractCompanyLinks(pageHtml);

                for (const link of companyLinks) {
                    try {
                        console.log(link);
                        if (link.startsWith('https://c.seznam.cz/click')) {
                            continue;
                        }
                        // Kontrola, zda firma již existuje v databázi
                        const existingCompany = await prisma.company.findFirst({
                            where: { link },
                        });

                        if (existingCompany) {
                            console.log(`Firma ${link} již existuje v databázi, přeskakuji.`);
                            continue;
                        }

                        const businessDetails = await this.scrapeBusinessDetails(link);
                        this.businesses[link] = businessDetails;

                        // Uložení do databáze
                        await this.saveToDatabase(businessDetails);
                    } catch (error) {
                        console.error(`Error scraping ${link}:`, error);
                    }
                }

                // Kontrola existence tlačítka další stránky
                const nextButtonExists = await this.page!.evaluate(() => {
                    const nextBtn = document.querySelector('#nextBtn');
                    return nextBtn !== null;
                });

                hasNextPage = nextButtonExists;
                if (hasNextPage) {
                    try {
                        // Pokus o kliknutí na tlačítko další stránky
                        await this.page!.evaluate(() => {
                            const nextBtn = document.querySelector('#nextBtn');
                            if (nextBtn) (nextBtn as any).click();
                        });

                        // Počkej na načtení nové stránky
                        await this.page!.waitForNavigation({
                            waitUntil: 'networkidle2',
                            timeout: 30000,
                        });

                        currentPage++;
                    } catch (navigationError) {
                        console.error('Navigation error:', navigationError);
                        hasNextPage = false;
                    }
                }

                // Volitelná krátká pauza mezi stránkami
                await this.delay(2000);
            }
        } catch (error) {
            console.error('Scraping error:', error);
        } finally {
            await this.closeBrowser();
        }
    }

    private buildPageUrl(page: number): string {
        const encodedQuery = encodeURIComponent(this.searchQuery);
        return page === 1
            ? `${this.baseUrl}?q=${encodedQuery}`
            : `${this.baseUrl}?q=${encodedQuery}&page=${page}`;
    }

    private async fetchPage(url: string): Promise<string> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            throw error;
        }
    }

    private extractCompanyLinks(html: string): string[] {
        const $ = cheerio.load(html);
        return $('.companyTitle.statCompanyDetail')
            .map((_, el) => $(el).attr('href'))
            .get()
            .map((link) =>
                link.startsWith('http') ? link : `${this.baseUrl}${link.replace(/^\//, '')}`,
            );
    }

    private hasNextPage(html: string): boolean {
        const $ = cheerio.load(html);
        return $('#nextBtn').length > 0;
    }

    private async scrapeBusinessDetails(link: string): Promise<Business> {
        const detailHtml = await this.fetchPage(link);
        const $ = cheerio.load(detailHtml);

        const business: Business = {
            id: this.extractId(link),
            name: $('.detailPrimaryTitle').text().trim(),
            address: $('.detailAddress').text().trim().replace('Navigovat', ''),
            email: this.extractEmail($),
            phone: this.extractPhone($),
            website: this.extractWebsite($),
            categories: this.extractCategories($),
            industry: this.industry,
            region: this.region,
            link: link,
            reviewsCount: 0,
            scrapedAt: new Date().toISOString(),
        };

        return business;
    }

    private extractId(link: string): string {
        const match = link.match(/\/detail\/(\d+)-/);
        return match ? match[1] : '';
    }

    private extractEmail($: cheerio.CheerioAPI): string | null {
        const emailLink = $('.detailEmail a');
        return emailLink.length ? emailLink.attr('href')?.replace('mailto:', '') || null : null;
    }

    private extractPhone($: cheerio.CheerioAPI): string | null {
        const phone = $('.detailPhonePrimary').text().trim();
        return phone || null;
    }

    private extractWebsite($: cheerio.CheerioAPI): string | null {
        const websiteLink = $('.detailWebUrl');
        return websiteLink.length ? websiteLink.attr('href') || null : null;
    }

    private extractCategories($: cheerio.CheerioAPI): string[] {
        return $('.list.lcat ul li a')
            .map((_, el) => $(el).text().trim())
            .get();
    }

    private async updateCompany(business: Business) {
        try {
            // Připravit kategorie pro propojení
            const categoryConnections = [];
            if (business.categories && business.categories.length > 0) {
                for (const categoryName of business.categories) {
                    // Najít nebo vytvořit kategorii
                    const category = await prisma.category.upsert({
                        where: { name: categoryName },
                        update: {},
                        create: { name: categoryName },
                    });
                    categoryConnections.push({ id: category.id });
                }
            }

            // Vytvořit firmu v databázi
            await prisma.company.update({
                where: { link: business.link },
                data: {
                    name: business.name,
                    address: business.address,
                    email: business.email,
                    phone: business.phone,
                    website: business.website,
                    link: business.link,
                    reviewsCount: business.reviewsCount,
                    scrapedAt: new Date(business.scrapedAt),
                    categories: {
                        connect: categoryConnections,
                    },
                },
            });
        } catch (error) {
            console.error(`Error updating business ${business.id}:`, error);
        }
    }

    private async saveToDatabase(business: Business) {
        try {
            if (!this.industryId || !this.regionId) {
                throw new Error('Odvětví nebo region nebyly načtené nebo nalezeny v databázi');
            }

            // Připravit kategorie pro propojení
            const categoryConnections = [];
            if (business.categories && business.categories.length > 0) {
                for (const categoryName of business.categories) {
                    // Najít nebo vytvořit kategorii
                    const category = await prisma.category.upsert({
                        where: { name: categoryName },
                        update: {},
                        create: { name: categoryName },
                    });
                    categoryConnections.push({ id: category.id });
                }
            }

            // Vytvořit firmu v databázi
            await prisma.company.create({
                data: {
                    id: business.id,
                    name: business.name,
                    address: business.address,
                    email: business.email,
                    phone: business.phone,
                    website: business.website,
                    link: business.link,
                    reviewsCount: business.reviewsCount,
                    scrapedAt: new Date(business.scrapedAt),
                    industry: {
                        connect: { id: this.industryId },
                    },
                    region: {
                        connect: { id: this.regionId },
                    },
                    categories: {
                        connect: categoryConnections,
                    },
                },
            });

            console.log(`Firma ${business.name} byla úspěšně uložena do databáze.`);
        } catch (error) {
            console.error(`Chyba při ukládání firmy ${business.name} do databáze:`, error);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

export async function runScraper(industry: string, region: string): Promise<void> {
    const scraper = new FirmyCzScraper(industry, region);
    await scraper.scrape();
}

export async function runAllScrapers(): Promise<void> {
    try {
        // Načtení všech odvětví a regionů z databáze
        const industries = await prisma.industry.findMany();
        const regions = await prisma.region.findMany();

        console.log(
            `Spouštím scraping pro ${industries.length} odvětví a ${regions.length} regionů.`,
        );

        for (const region of regions) {
            for (const industry of industries) {
                console.log(`Spouštím scraping pro ${industry.name} v regionu ${region.name}.`);
                const scraper = new FirmyCzScraper(industry.name, region.name);
                await scraper.scrape();
            }
        }
    } catch (error) {
        console.error('Chyba při spouštění scraperů:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export async function fixEmptyLinks(): Promise<void> {
    try {
        const companies = await prisma.company.findMany({
            where: {
                AND: [
                    {
                        name: {
                            equals: '',
                        },
                    },
                    {
                        email: {
                            equals: null,
                        },
                    },
                    {
                        phone: {
                            equals: null,
                        },
                    },
                    {
                        website: {
                            equals: null,
                        },
                    },
                ],
            },
            include: {
                categories: true,
                industry: true,
                region: true,
            },
        });

        console.log(companies);

        const scraper = new FirmyCzScraper('', '');
        for (const company of companies) {
            await scraper.scrapeLink(company.link);
        }
        await scraper.closeBrowser();
    } catch (error) {
        console.error('Chyba při spouštění scraperů:', error);
    }
}

export async function clean(): Promise<void> {
    await prisma.$transaction([
        prisma.company.deleteMany({
            where: {
                link: {
                    startsWith: 'https://c.seznam.cz/click',
                },
            },
        }),
    ]);
}
