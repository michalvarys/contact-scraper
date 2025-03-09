// baseScraper.ts - Základní abstraktní třída pro scrapery
import { BrowserManager } from './browserManager';
import { DatabaseManager } from './databaseManager';
import { Business, ScraperOptions } from '../types';
import { Page } from 'puppeteer';

export abstract class BaseScraper {
  protected browserManager: BrowserManager;
  protected dbManager: DatabaseManager;
  protected businesses: Record<string, Business> = {};

  constructor(
    public baseUrl: string,
    public industry: string = '',
    public region: string = '',
    options: ScraperOptions = {},
  ) {
    const headless = options.headless !== undefined ? options.headless : true;
    this.browserManager = new BrowserManager(this.getScraperName(), headless);
    this.dbManager = new DatabaseManager(industry, region);
  }

  // Method to get scraper name for cookies file (to be implemented by child classes)
  protected abstract getScraperName(): string;

  // Abstract methods to be implemented by child classes
  protected abstract buildPageUrl(page: number, query?: string): string;
  protected abstract extractCompanyLinks(html: string): string[];
  protected abstract scrapeBusinessDetails(link: string): Promise<Business>;

  // Optional method to wait for page elements to load
  protected async waitForPageLoad(page: Page) {
    // Default implementation - override in child classes
    await page.waitForTimeout(1000);
  }

  // Optional method to check if there's a next page
  protected hasNextPage(html: string): boolean {
    return false; // Default implementation, override as needed
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

  // Helper method for delays
  protected delay(ms: number): Promise<void> {
    return this.browserManager.delay(ms);
  }

  // Main scrape method
  async scrape(searchQuery?: string): Promise<any> {
    await this.browserManager.initialize();
    await this.dbManager.init();

    // Načtení existujících firem z databáze
    this.businesses = await this.dbManager.loadBusinesses();

    try {
      let currentPage = 1;
      let hasNextPage = true;
      const pageUrl = this.buildPageUrl(currentPage, searchQuery);
      const page = this.browserManager.pageInstance;

      if (!page) {
        throw new Error('Page not initialized');
      }

      await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      while (hasNextPage) {
        console.log(`Scraping page ${currentPage}: ${page.url()}`);

        // Wait for the page to load properly (specific to each scraper)
        await this.waitForPageLoad(page);

        const pageHtml = await page.content();
        const companyLinks = this.extractCompanyLinks(pageHtml);

        console.log(`Found ${companyLinks.length} company links on page ${currentPage}`);

        for (const link of companyLinks) {
          try {
            // Skip if already exists
            if (await this.dbManager.companyExists(link)) {
              console.log(`Business ${link} already exists in database, skipping.`);
              continue;
            }

            const businessDetails = await this.scrapeBusinessDetails(link);
            this.businesses[link] = businessDetails;

            // Save to database
            await this.dbManager.saveBusiness(businessDetails);

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
            await this.delay(2000);
          } catch (navigationError) {
            console.error('Navigation error:', navigationError);
            hasNextPage = false;
          }
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
    } finally {
      await this.browserManager.close();
    }
  }

  // Method to scrape a single link
  async scrapeLink(link: string) {
    await this.browserManager.initialize();
    await this.dbManager.init();

    try {
      const page = this.browserManager.pageInstance;

      if (!page) {
        throw new Error('Page not initialized');
      }

      await page.goto(link, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      const business = await this.scrapeBusinessDetails(link);
      console.dir({ link, business }, { depth: 5 });

      // Check if business exists and update/create accordingly
      const exists = await this.dbManager.companyExists(link);
      if (exists) {
        await this.dbManager.updateBusiness(business);
      } else {
        await this.dbManager.saveBusiness(business);
      }

      return business;
    } catch (error) {
      console.error(`Error scraping link ${link}:`, error);
      throw error;
    } finally {
      await this.browserManager.close();
    }
  }
}
