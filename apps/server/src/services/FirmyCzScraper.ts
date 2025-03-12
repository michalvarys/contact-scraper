import { PrismaClient } from '@contact-scraper/db';
import { FirmyCzScraper } from '@contact-scraper/scrapers';

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
