import { BaseScraper } from './BaseScraper';
import { getEmailFromWebsite } from './tools/email';
import { Business, ScraperOptions } from './types';

export class GoogleMapsScraper extends BaseScraper {
  private mapLinks: Set<string> = new Set();
  private taskId: string | null = null;

  constructor(options: ScraperOptions = {}) {
    super(options.baseUrl || 'https://www.google.com/maps', {
      headless: options.headless !== undefined ? options.headless : true,
      ...options,
    });
  }

  /**
   * Nastavení ID úlohy
   * @param taskId ID úlohy
   */
  setTaskId(taskId: string) {
    this.taskId = taskId;
  }

  protected getScraperName(): string {
    return 'google-maps';
  }

  protected buildPageUrl(page: number, query?: string): string {
    // Google Maps doesn't use traditional pagination
    return this.baseUrl;
  }

  protected async waitForPageLoad() {
    await this.page?.waitForSelector('[role="main"]', {
      timeout: 15000,
    });
  }

  protected async checkNextPage(): Promise<boolean> {
    // Google Maps doesn't have traditional pagination
    return false;
  }

  protected async goToNextPage() {
    throw new Error('Google Maps does not support traditional pagination');
  }

  extractCompanyLinks(html: string): string[] {
    // This is handled differently for Google Maps since we need browser interaction
    // This will be empty as we use collectMapLinks() instead
    return [];
  }

  private async collectMapLinks(): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll('a[href^="https://www.google.com/maps/"]'),
      );

      return links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => href !== null && !href.includes('/dir/'));
    });
  }

  async scrapeBusinessDetails(link: string): Promise<Business> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.goto(link, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for business info to load
      await this.page.waitForSelector('h1', { timeout: 10000 });

      // Extract business details
      const data = await this.page.evaluate(() => {
        function __name(target: any, value: any) {
          try {
            Object.defineProperty(target, 'name', { value, configurable: true });
          } catch {
            // ignore if we cannot redefine the name
          }
          return target;
        }

        function getText(selector: string) {
          const element = document.querySelector(selector);
          return element ? element.textContent || '' : '';
        }

        function getAddress() {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const ariaLabel = btn.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.includes('Adresa:')) {
              return ariaLabel.replace('Adresa:', '').trim();
            }
          }
          return '';
        }

        function getPhone() {
          const directPhone =
            document
              .querySelector('a[href^="tel:"]')
              ?.getAttribute('href')
              ?.replace('tel:', '')
              .trim() ||
            document.querySelector('[data-item-id^="phone"]')?.textContent?.trim() ||
            '';
          if (directPhone) {
            return directPhone;
          }

          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const ariaLabel = btn.getAttribute('aria-label') || '';
            if (/Telefon:|Volat/.test(ariaLabel)) {
              const match = ariaLabel.match(/(?:Telefon:|Volat)[:\s]*([+\d\s()-]+)/);
              if (match) {
                return match[1].trim();
              }
            }
          }

          return null;
        }

        function getWebsite() {
          const directWebsite =
            document.querySelector('[data-item-id="authority"]')?.getAttribute('href') || '';
          if (directWebsite && !directWebsite.includes('google')) {
            return directWebsite;
          }

          const regions = document.querySelectorAll('[role=region] a[href]');
          for (let index = 0; index < regions.length; index++) {
            const anchor = regions.item(index);
            const hrefValue = anchor.getAttribute('href');
            if (!hrefValue) continue;
            const [cleanHref] = hrefValue.split('?');
            if (
              cleanHref &&
              !cleanHref.includes('google') &&
              !cleanHref.startsWith('/maps') &&
              !cleanHref.startsWith('tel:')
            ) {
              return cleanHref;
            }
          }

          return null;
        }

        function getEmail() {
          const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
          const allText = document.body.innerText;
          const match = allText.match(emailRegex);
          return match ? match[0] : null;
        }

        function getRating() {
          const ratingElement = document.querySelector('[aria-label*="hvězdičkami"]');
          if (!ratingElement) {
            return null;
          }
          const aria = ratingElement.getAttribute('aria-label') || '';
          const match = aria.match(/[\d,.]+/);
          return match ? match[0] : null;
        }

        function getReviewsCount() {
          const reviewsText =
            document.querySelector('[aria-label*="recenzí"]')?.getAttribute('aria-label') || '';
          const match = reviewsText.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }

        function getCategories() {
          const categoryButton = document.querySelector('button.DkEaL');
          if (categoryButton) {
            return [categoryButton.textContent || ''];
          }
          return [];
        }

        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: getText('h1'),
          address: getAddress(),
          email: getEmail(),
          phone: getPhone(),
          website: getWebsite(),
          rating: getRating() ?? undefined,
          reviewsCount: getReviewsCount(),
          categories: getCategories(),
          link: window.location.href,
          scrapedAt: new Date().toISOString(),
        };
      });

      if (!data.name?.trim()) {
        throw new Error('Missing business name');
      }

      if (data.website && !data.email) {
        data.email = await getEmailFromWebsite(data.website);
      }

      return data;
    } catch (error) {
      console.error(`Error scraping details for ${link}:`, error);
      throw error;
    }
  }

  public async getBusinessData(link: string): Promise<Business> {
    await this.initializeBrowser();

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const data = await this.scrapeBusinessDetails(link);
    return this.taskId ? this.enrichBusinessData(data, link) : data;
  }

  /**
   * Metoda pro vyhledání odkazů
   * @param query Vyhledávací dotaz
   * @returns Pole odkazů
   */
  async searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]> {
    await this.initializeBrowser();

    try {
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      // Navigate to Google Maps
      await this.page.goto(this.baseUrl);

      // Wait for search input field
      await this.page.waitForSelector('#searchboxinput');

      // Enter search query
      await this.page.type('#searchboxinput', query);
      await this.page.keyboard.press('Enter');

      // Wait for results to load
      await this.page.waitForSelector('[role="main"]', { timeout: 15000 });

      // Scroll for more results
      await this.autoScroll(800, 20);

      // Collect all Google Maps links
      const mapLinks = await this.collectMapLinks();
      if (onBatch && mapLinks.length > 0) {
        await onBatch(mapLinks);
      }
      console.log(`Found ${mapLinks.length} business links to scrape`);

      return mapLinks;
    } catch (error) {
      console.error('Error during Google Maps search:', error);
      return [];
    }
  }

  /**
   * Metoda pro obohacení dat o firmě
   * @param business Data o firmě
   * @param link Odkaz na detail firmy
   * @returns Obohacená data o firmě
   */
  enrichBusinessData(business: Business, link: string): Business {
    // Přidání ID úlohy, pokud je nastaveno
    if (this.taskId) {
      business.taskId = this.taskId;
      business.sourceLink = link;
    }
    return business;
  }

  // Override the main scrape method for Google Maps' specific behavior
  async scrape(searchQuery?: string): Promise<Business[]> {
    const results: Business[] = [];

    await this.initializeBrowser();
    await this.init();
    await this.loadDatabase();

    try {
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      // Navigate to Google Maps
      await this.page.goto(this.baseUrl);

      // Wait for search input field
      await this.page.waitForSelector('#searchboxinput');

      // Prepare search query
      const query = searchQuery || '';

      // Enter search query
      await this.page.type('#searchboxinput', query);
      await this.page.keyboard.press('Enter');

      // Wait for results to load
      await this.page.waitForSelector('[role="main"]', { timeout: 15000 });

      // Scroll for more results
      await this.autoScroll(800, 50);

      // Collect all Google Maps links
      const mapLinks = await this.collectMapLinks();
      console.log(`Found ${mapLinks.length} business links to scrape`);

      // Visit each link and scrape detailed data
      for (const link of mapLinks) {
        if (this.mapLinks.has(link)) {
          continue;
        }

        this.mapLinks.add(link);

        try {
          const businessDetails = await this.getBusinessData(link);
          results.push(businessDetails);
        } catch (scrapeError) {
          console.error(`Failed to process Google Maps link ${link}:`, scrapeError);
        }

        // Add a small delay to avoid overwhelming the server
        await this.delay(1500);
      }

      // For backwards compatibility, also collect data from the current page
      const businesses = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[role="article"]');
        const data: Business[] = [];

        items.forEach((item) => {
          try {
            const name = item.querySelector('h3.fontHeadlineSmall')?.textContent || '';

            const phone =
              document.querySelector('[data-item-id^="phone"]')?.textContent?.trim() || '';
            const website =
              document.querySelector('[data-item-id="authority"]')?.getAttribute('href') || '';
            const address =
              document.querySelector('[data-item-id="address"]')?.textContent?.trim() || '';
            const rating =
              document.querySelector('.F7nice span[aria-hidden="true"]')?.textContent || '';
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

            if (name) {
              data.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name,
                address,
                phone,
                website,
                rating,
                reviewsCount: Number(reviewsCount),
                // reviews,
                email: null,
                link: window.location.href,
                scrapedAt: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('Error processing item:', error);
          }
        });

        return data;
      });

      // Save businesses from listing page and add to results
      for (const business of businesses) {
        if (!business.name?.trim() || !business.address?.trim()) {
          console.warn(`Skipping business with missing required fields: ${business.link}`);
          continue;
        }

        results.push(business as Business);
      }

      return results;
    } catch (error) {
      console.error('Error during Google Maps scraping:', error);
      return results;
    } finally {
      await this.closeBrowser();
    }
  }

  // Helper method to automatically scroll to load more results
  async autoScroll(scrollAmount: number = 500, maxScrolls: number = 10): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      const feed = await this.page.$('[role="feed"]');
      if (!feed) return;

      for (let i = 0; i < maxScrolls; i++) {
        await this.page.evaluate(
          (selector, amount) => {
            const element = document.querySelector(selector);
            if (element) {
              element.scrollTop += amount;
            }
          },
          '[role="feed"]',
          scrollAmount,
        );

        // Wait for potential new results to load
        await this.delay(1000);

        // Check if we've reached the bottom
        const isAtBottom = await this.page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            return element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
          }
          return true;
        }, '[role="feed"]');

        if (isAtBottom) break;
      }
    } catch (error) {
      console.error('Error during auto-scroll:', error);
    }
  }

  async searchAndScrape(query: string): Promise<Business[]> {
    return this.scrape(query);
  }
}

// Export functions to run the scraper
export async function runGoogleMapsScraper(
  query?: string,
  opt?: ScraperOptions,
): Promise<Business[]> {
  const scraper = new GoogleMapsScraper({ headless: opt?.headless });
  return await scraper.scrape(query);
}

export async function searchGoogleMaps(query: string): Promise<Business[]> {
  const scraper = new GoogleMapsScraper();
  return await scraper.searchAndScrape(query);
}

export async function scrapeGoogleMaps(query: string): Promise<Business[]> {
  const scraper = new GoogleMapsScraper();
  return await scraper.scrape(query);
}

export async function runGoogleMapsLinkScraper(link: string) {
  const scraper = new GoogleMapsScraper();
  return scraper.scrapeLink(link);
}
