import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import database from './database.json';
import puppeteer, { Browser, Page } from 'puppeteer';
import { existsSync, readFileSync } from 'fs';

interface Business {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
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

async function folderExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

class FirmyCzScraper {
  private baseUrl = 'https://www.firmy.cz/';
  private searchQuery: string;
  private businesses: Record<string, Business> = {};
  private readonly cookiesPath: string;

  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(
    public industry: string,
    public region: string,
  ) {
    this.searchQuery = `${industry} ${region}`;
    this.cookiesPath = path.join(__dirname, 'cookies-firmy-cz.json');
    this.loadDatabase();
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
    const filename = this.getFilename();
    const outputDir = path.dirname(filename);
    const exists = await folderExists(outputDir);
    if (!exists) {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(filename, '{}', { encoding: 'utf8' });
    }

    try {
      const json = await fs.readFile(filename, { encoding: 'utf8' });
      this.businesses = JSON.parse(json);
    } catch (err) {
      console.log(err);
    }
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

      // await this.delay(2000);
      // await this.page!.type('#searchField', this.industry);
      // await this.delay(2000);
      // await this.page!.type('#localityField', this.region);
      // await this.delay(2000);
      // await this.page!.click('#submitImg');

      while (hasNextPage) {
        console.log(`Scraping page ${currentPage}: ${pageUrl}`);

        await this.page!.waitForSelector('.companyTitle.statCompanyDetail', { timeout: 10000 });

        const pageHtml = await this.page!.content();
        const companyLinks = this.extractCompanyLinks(pageHtml);

        for (const link of companyLinks) {
          try {
            console.log(link);
            if (this.businesses[link]) continue;

            const businessDetails = await this.scrapeBusinessDetails(link);
            this.businesses[link] = businessDetails;
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
              const nextBtn = document.querySelector('#nextBtn') as HTMLElement;
              if (nextBtn) nextBtn.click();
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
        await this.saveToJsonFile();
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
    const { current, all } = $('#nextBtn').first().data().dotData as {
      current: number;
      all: number;
    };
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

  private extractEmail($: cheerio.CheerioAPI): string {
    const emailLink = $('.detailEmail a');
    return emailLink.length ? emailLink.attr('href')?.replace('mailto:', '') || '' : '';
  }

  private extractPhone($: cheerio.CheerioAPI): string {
    return $('.detailPhonePrimary').text().trim();
  }

  private extractWebsite($: cheerio.CheerioAPI): string {
    const websiteLink = $('.detailWebUrl');
    return websiteLink.length ? websiteLink.attr('href') || '' : '';
  }

  private extractCategories($: cheerio.CheerioAPI): string[] {
    return $('.list.lcat ul li a')
      .map((_, el) => $(el).text().trim())
      .get();
  }

  private getFilename() {
    const outputDir = path.join(process.cwd(), 'output');
    return path.join(
      outputDir,
      `firmy_cz.json`,
      // `firmy_cz_${this.searchQuery.toLowerCase().replace(/\s+/g, '_')}.json`,
    );
  }

  private async saveToJsonFile() {
    await fs.writeFile(this.getFilename(), JSON.stringify(this.businesses, null, 2));
    console.log(`Saved ${Object.keys(this.businesses).length} businesses to ${this.getFilename()}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function main() {
  for (const region of database.regions)
    for (const industry of database.industries) {
      const scraper = new FirmyCzScraper(industry, region);
      await scraper.scrape();
    }
}

main().catch(console.error);
