import { Page } from 'puppeteer';
import { DatabaseManager } from './DatabaseManager';
import { WebsiteScraper } from './WebsiteScraper';

export class GoogleMapsScraper {
  private page: Page;
  private dbManager: DatabaseManager;
  private websiteScraper: WebsiteScraper;

  constructor(page: Page) {
    this.page = page;
    this.dbManager = new DatabaseManager();
    this.websiteScraper = new WebsiteScraper(page);
  }

  async scrapeSearchResults(searchQuery: string, location: string) {
    const searchKey = `${searchQuery} ${location}`;
    const companies = await this.scrollAndCollectLinks();

    await this.dbManager.saveSearchResults(searchKey, companies);

    for (const companyUrl of companies) {
      await this.scrapeCompanyDetails(companyUrl, searchKey);
    }
  }

  private async scrollAndCollectLinks(): Promise<string[]> {
    const companies: string[] = [];
    let isEndReached = false;

    while (!isEndReached) {
      // Scroll until 'Back to top' button appears
      await this.page.evaluate(() => {
        const container = document.querySelector('.bJzME.Hu9e2e');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });

      // Check if end is reached
      const backToTopButton = await this.page.$('span:contains("Zpět na začátek")');
      if (backToTopButton) {
        isEndReached = true;
      }

      // Collect Google Maps links
      const links = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps"]')).map(
          (a) => a.href,
        );
      });

      companies.push(...links);

      await new Promise((r) => setTimeout(r, 1000)); // Wait for content to load
    }

    return [...new Set(companies)]; // Remove duplicates
  }

  private async scrapeCompanyDetails(companyUrl: string, searchKey: string) {
    await this.page.goto(companyUrl);
    await this.page.waitForSelector('.DUwDvf');

    const companyData = await this.page.evaluate(() => {
      const name = document.querySelector('.DUwDvf')?.textContent || '';
      const phone = document.querySelector('[data-item-id^="phone"]')?.textContent?.trim() || '';
      const website =
        document.querySelector('[data-item-id="authority"]')?.getAttribute('href') || '';
      const address = document.querySelector('[data-item-id="address"]')?.textContent?.trim() || '';
      const rating = document.querySelector('.F7nice span[aria-hidden="true"]')?.textContent || '';
      const reviewsCount =
        document.querySelector('.HHrUdb span')?.textContent?.replace('Recenze: ', '') || '';

      const reviews = Array.from(document.querySelectorAll('.jftiEf')).map((review) => ({
        name: review.querySelector('.d4r55')?.textContent || '',
        rating:
          review
            .querySelector('[aria-label$="hvězdiček"]')
            ?.getAttribute('aria-label')
            ?.split(' ')[0] || '',
        message: review.querySelector('.MyEned span')?.textContent || '',
      }));

      return {
        name,
        phone,
        website,
        address,
        rating,
        reviewsCount,
        reviews,
        map: window.location.href,
      };
    });

    if (companyData.website) {
      const { email, screenshot } = await this.websiteScraper.scrapeWebsite(companyData.website);
      companyData['email'] = email;
      companyData['website-img'] = screenshot;
    }

    await this.dbManager.saveCompanyDetails(searchKey, companyData);
  }
}
