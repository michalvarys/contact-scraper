import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import { prisma } from '@contact-scraper/db';
import { Business, ScraperOptions } from './types';
import { launchBrowser } from './tools/puppeteer';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected businesses: Record<string, Business> = {};
  protected readonly cookiesPath: string;
  protected headless: boolean;

  constructor(
    public baseUrl: string,
    options: ScraperOptions = {},
  ) {
    this.headless = options.headless !== undefined ? options.headless : true;
    this.cookiesPath = path.join(__dirname, '..', '..', `cookies-${this.getScraperName()}.json`);
  }

  // Method to get scraper name for cookies file (to be implemented by child classes)
  protected abstract getScraperName(): string;

  // Initialize database connections
  public async init() {}

  // Cookie management
  protected async saveCookies(): Promise<void> {
    if (!this.page) return;
    const cookies = await this.page.cookies();
    await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
  }

  protected async loadCookies(): Promise<void> {
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

  // Browser initialization
  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await launchBrowser(this.headless);
    }

    if (!this.page) {
      this.page = await this.browser.newPage();
      await this.loadCookies();

      // Set User-Agent and other headers
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      );
    }
  }

  protected async closeBrowser() {
    if (this.page) {
      try {
        await this.saveCookies();
      } catch {}
      try {
        await this.page.close();
      } catch {}
      this.page = null;
    }
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
      this.browser = null;
    }
  }

  // Public method to close browser
  public async close() {
    await this.closeBrowser();
  }

  async loadDatabase() {}

  // Abstract methods to be implemented by child classes
  protected abstract buildPageUrl(page: number, query?: string): string;
  protected abstract extractCompanyLinks(html: string): string[];
  protected abstract scrapeBusinessDetails(link: string): Promise<Business>;

  // Optional method to check if there's a next page
  protected hasNextPage(html: string): boolean {
    return false; // Default implementation, override as needed
  }

  // Save business to database
  protected async saveToDatabase(business: Business) {}

  // Helper method for delays
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // Helper method to check if company exists in database
  protected async companyExists(link: string): Promise<boolean> {
    const existingCompany = await prisma.company.findFirst({
      where: { link },
    });
    return !!existingCompany;
  }

  async searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]> {
    await this.initializeBrowser();
    await this.init();
    await this.loadDatabase();
    const links: string[] = [];
    const seen = new Set<string>();

    try {
      let currentPage = 1;
      let hasNextPage = true;
      const pageUrl = this.buildPageUrl(currentPage, query);

      if (!this.page) {
        throw new Error('Page not initialized');
      }

      await this.page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      while (hasNextPage) {
        console.log(`Scraping page ${currentPage}: ${this.page.url()}`);

        // Wait for the page to load properly (specific to each scraper)
        await this.waitForPageLoad();

        const pageHtml = await this.page.content();
        const companyLinks = this.extractCompanyLinks(pageHtml);

        const newLinks: string[] = [];
        for (const link of companyLinks) {
          if (!seen.has(link)) {
            seen.add(link);
            links.push(link);
            newLinks.push(link);
          }
        }

        if (newLinks.length > 0 && onBatch) {
          await onBatch(newLinks);
        }

        // Check for next page
        hasNextPage = await this.checkNextPage();

        if (hasNextPage) {
          try {
            await this.goToNextPage();
            currentPage++;

            // Optional delay between pages
            await this.delay(1000);
          } catch (navigationError) {
            console.error('Navigation error:', navigationError);
            hasNextPage = false;
          }
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
    } finally {
      await this.closeBrowser();
    }
    return links;
  }

  // Main scrape method
  async scrape(searchQuery?: string): Promise<any> {
    await this.initializeBrowser();
    await this.init();
    await this.loadDatabase();
    const links = [];

    try {
      let currentPage = 1;
      let hasNextPage = true;
      const pageUrl = this.buildPageUrl(currentPage, searchQuery);

      if (!this.page) {
        throw new Error('Page not initialized');
      }

      await this.page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      while (hasNextPage) {
        console.log(`Scraping page ${currentPage}: ${this.page.url()}`);

        // Wait for the page to load properly (specific to each scraper)
        await this.waitForPageLoad();

        const pageHtml = await this.page.content();
        const companyLinks = this.extractCompanyLinks(pageHtml);

        console.log(`Found ${companyLinks.length} company links on page ${currentPage}`);
        links.push(...companyLinks);

        for (const link of companyLinks) {
          try {
            // Skip if already exists
            if (await this.companyExists(link)) {
              console.log(`Business ${link} already exists in database, skipping.`);
              continue;
            }
            const businessDetails = await this.scrapeBusinessDetails(link);
            // Save to database
            await this.saveToDatabase(businessDetails);
            // Small delay between requests
            await this.delay(1000);
          } catch (error) {
            console.error(`Error scraping ${link}:`, error);
          }
        }

        // Check for next page
        hasNextPage = await this.checkNextPage();

        if (hasNextPage) {
          try {
            await this.goToNextPage();
            currentPage++;

            // Optional delay between pages
            await this.delay(1000);
          } catch (navigationError) {
            console.error('Navigation error:', navigationError);
            hasNextPage = false;
          }
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
    } finally {
      await this.closeBrowser();
    }
    return links;
  }

  // Method to wait for page elements to load
  protected async waitForPageLoad() {
    // Default implementation - override in child classes
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Method to check if there's a next page
  protected async checkNextPage(): Promise<boolean> {
    // Default implementation - override in child classes
    return false;
  }

  // Method to go to next page
  protected async goToNextPage() {
    // Default implementation - override in child classes
    throw new Error('goToNextPage not implemented');
  }

  // Method to scrape a single link
  async scrapeLink(link: string) {
    await this.initializeBrowser();
    await this.init();

    try {
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      await this.page.goto(link, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      const business = await this.scrapeBusinessDetails(link);
      console.dir({ link, business }, { depth: 5 });

      // Check if business exists and update/create accordingly
      const exists = await this.companyExists(link);
      if (exists) {
        await this.updateCompany(business);
      } else {
        await this.saveToDatabase(business);
      }

      return business;
    } catch (error) {
      console.error(`Error scraping link ${link}:`, error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  // Method to update an existing company
  protected async updateCompany(business: Business) {
    try {
      // Prepare category connections
      const categoryConnections = [];
      if (business.categories && business.categories.length > 0) {
        for (const categoryName of business.categories) {
          // Find or create category
          const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          categoryConnections.push({ id: category.id });
        }
      }

      // Update company in database
      await prisma.company.update({
        where: { link: business.link },
        data: {
          name: business.name,
          address: business.address,
          email: business.email,
          phone: business.phone,
          website: business.website,
          reviewsCount: business.reviewsCount,
          scrapedAt: new Date(),
          categories: {
            connect: categoryConnections,
          },
        },
      });

      console.log(`Business ${business.name} successfully updated in database.`);
    } catch (error) {
      console.error(`Error updating business ${business.id}:`, error);
    }
  }

  // Protected method to auto-scroll for lazy-loaded content
  protected async autoScroll(scrollDistance = 1000, maxScrolls = 10) {
    if (!this.page) return;

    await this.page.evaluate(
      async (scrollDistance, maxScrolls) => {
        await new Promise<void>((resolve) => {
          let scrolls = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, scrollDistance);
            scrolls++;

            if (scrolls >= maxScrolls) {
              clearInterval(timer);
              resolve();
            }
          }, 400);
        });
      },
      scrollDistance,
      maxScrolls,
    );
  }
}
