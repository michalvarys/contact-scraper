import { BaseScraper } from './BaseScraper';
import { getEmailFromWebsite } from './tools/email';
import { launchBrowser } from './tools/puppeteer';
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

  private async handleGoogleConsent(): Promise<void> {
    if (!this.page) return;
    try {
      const url = this.page.url();
      const isConsentPage = url.includes('consent.google') || url.includes('accounts.google');

      const clicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const accept = buttons.find((b) => {
          const text = b.textContent?.trim() || '';
          const label = b.getAttribute('aria-label') || '';
          return /accept all|souhlasím|přijmout vše|akzeptieren|reject all|odmítnout vše/i.test(text) ||
                 /accept|souhlasím|reject|odmítnout/i.test(label);
        });
        if (accept) { accept.click(); return true; }

        const forms = Array.from(document.querySelectorAll('form[action*="consent"]'));
        for (const form of forms) {
          const btns = Array.from(form.querySelectorAll('button'));
          for (const btn of btns) {
            const text = btn.textContent?.trim() || '';
            if (/přijmout|souhlasím|accept|odmítnout|reject/i.test(text)) {
              btn.click();
              return true;
            }
          }
          if (btns.length > 0) { btns[0].click(); return true; }
        }
        return false;
      });

      if (clicked || isConsentPage) {
        await this.delay(3000);
        await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      }
    } catch {
      // no consent dialog
    }
  }

  private async findSearchInput() {
    if (!this.page) return null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const input = await this.page.$('#searchboxinput') || await this.page.$('input[name="q"]');
      if (input) return input;
      await this.handleGoogleConsent();
      await this.delay(2000);
    }
    return null;
  }

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
        document.querySelectorAll('a[href*="google.com/maps/place/"], a[href*="google.cz/maps/place/"]'),
      );

      const hrefs = links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => href !== null && !href.includes('/dir/'));

      return [...new Set(hrefs)];
    });
  }

  async scrapeBusinessDetails(link: string): Promise<Business> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.goto(link, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.handleGoogleConsent();
      await this.page.waitForSelector('h1', { timeout: 10000 });

      const isConsent = await this.page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const text = h1?.textContent?.trim() || '';
        return /než budete pokračovat|before you continue|bevor sie fortfahren/i.test(text);
      });

      if (isConsent) {
        await this.handleGoogleConsent();
        await this.delay(3000);
        const stillConsent = await this.page.evaluate(() => {
          const h1 = document.querySelector('h1');
          return /než budete pokračovat|before you continue|bevor sie fortfahren/i.test(h1?.textContent?.trim() || '');
        });
        if (stillConsent) {
          throw new Error('Stuck on Google consent page');
        }
        await this.page.waitForSelector('h1', { timeout: 10000 });
      }

      const data: any = await this.page.evaluate(`(function() {
        function getText(selector) {
          var element = document.querySelector(selector);
          return element ? element.textContent || '' : '';
        }

        function getAddress() {
          var buttons = Array.from(document.querySelectorAll('button'));
          for (var i = 0; i < buttons.length; i++) {
            var ariaLabel = buttons[i].getAttribute('aria-label') || '';
            if (/Adresa:|Address:/i.test(ariaLabel)) {
              return ariaLabel.replace(/Adresa:|Address:/i, '').trim();
            }
          }
          var addrEl = document.querySelector('[data-item-id="address"]');
          if (addrEl) return addrEl.textContent.trim() || '';
          return '';
        }

        function getPhone() {
          var telLink = document.querySelector('a[href^="tel:"]');
          if (telLink) {
            var href = telLink.getAttribute('href') || '';
            return href.replace('tel:', '').trim() || null;
          }
          var phoneEl = document.querySelector('[data-item-id^="phone"]');
          if (phoneEl) return phoneEl.textContent.trim() || null;
          var buttons = Array.from(document.querySelectorAll('button'));
          for (var i = 0; i < buttons.length; i++) {
            var ariaLabel = buttons[i].getAttribute('aria-label') || '';
            if (/Telefon:|Phone:|Volat/i.test(ariaLabel)) {
              var match = ariaLabel.match(/[+\\d][\\d\\s()-]{6,}/);
              if (match) return match[0].trim();
            }
          }
          return null;
        }

        function getWebsite() {
          var authority = document.querySelector('[data-item-id="authority"]');
          if (authority) {
            var href = authority.getAttribute('href') || '';
            if (href && href.indexOf('google') === -1) return href.split('?')[0];
          }
          var allLinks = Array.from(document.querySelectorAll('a[href]'));
          for (var i = 0; i < allLinks.length; i++) {
            var href = allLinks[i].getAttribute('href') || '';
            if (
              href.indexOf('http') === 0 &&
              href.indexOf('google.') === -1 &&
              href.indexOf('gstatic.') === -1 &&
              href.indexOf('tel:') !== 0 &&
              href.indexOf('mailto:') !== 0
            ) {
              return href.split('?')[0];
            }
          }
          return null;
        }

        function getEmail() {
          var mailtoLink = document.querySelector('a[href^="mailto:"]');
          if (mailtoLink) {
            var href = mailtoLink.getAttribute('href') || '';
            return href.replace('mailto:', '').split('?')[0] || null;
          }
          var emailRegex = /[\\w.-]+@[\\w.-]+\\.\\w{2,}/;
          var allText = document.body.innerText;
          var match = allText.match(emailRegex);
          return match ? match[0] : null;
        }

        function getRating() {
          var ariaElements = Array.from(document.querySelectorAll('[aria-label]'));
          for (var i = 0; i < ariaElements.length; i++) {
            var label = ariaElements[i].getAttribute('aria-label') || '';
            if (/hv\\u011bzdic|stars?/i.test(label)) {
              var match = label.match(/[\\d,.]+/);
              if (match) return match[0];
            }
          }
          return null;
        }

        function getReviewsCount() {
          var ariaElements = Array.from(document.querySelectorAll('[aria-label]'));
          for (var i = 0; i < ariaElements.length; i++) {
            var label = ariaElements[i].getAttribute('aria-label') || '';
            if (/recenz|review/i.test(label)) {
              var match = label.match(/(\\d[\\d\\s]*)/);
              if (match) return parseInt(match[1].replace(/\\s/g, ''), 10);
            }
          }
          return 0;
        }

        function getCategories() {
          var buttons = Array.from(document.querySelectorAll('button'));
          for (var i = 0; i < buttons.length; i++) {
            var parent = buttons[i].closest('[role="main"]');
            if (parent) {
              var text = (buttons[i].textContent || '').trim();
              if (text && text.length < 50 && text.indexOf('\\n') === -1 && buttons[i].offsetTop < 300) {
                return [text];
              }
            }
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
          rating: getRating() || undefined,
          reviewsCount: getReviewsCount(),
          categories: getCategories(),
          link: window.location.href,
          scrapedAt: new Date().toISOString()
        };
      })()`);

      if (!data.name?.trim()) {
        throw new Error('Missing business name');
      }

      if (/než budete pokračovat|before you continue|bevor sie fortfahren/i.test(data.name)) {
        throw new Error('Consent page detected instead of business detail');
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.ensurePage();
        const data = await this.scrapeBusinessDetails(link);
        return this.taskId ? this.enrichBusinessData(data, link) : data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === 0 && (msg.includes('main frame') || msg.includes('Consent page') || msg.includes('Session closed'))) {
          console.log(`GoogleMaps: retrying ${link} with fresh page (${msg})`);
          await this.resetPage();
          continue;
        }
        throw err;
      }
    }
    throw new Error('Unreachable');
  }

  private async ensurePage(): Promise<void> {
    if (!this.browser) {
      this.browser = await launchBrowser(this.headless);
    }
    if (!this.page || this.page.isClosed()) {
      this.page = await this.browser.newPage();
      await this.loadCookies();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      );
    }
  }

  private async resetPage(): Promise<void> {
    if (this.page) {
      try { await this.page.close(); } catch {}
      this.page = null;
    }
    await this.ensurePage();
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

      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.delay(2000);
      await this.handleGoogleConsent();

      const searchInput = await this.findSearchInput();
      if (!searchInput) {
        throw new Error('Search input not found on Google Maps');
      }

      await searchInput.click();
      await searchInput.type(query);
      await this.page.keyboard.press('Enter');

      const feedFound = await this.page.waitForSelector('[role="feed"]', { timeout: 15000 }).catch(() => null);
      if (!feedFound) {
        console.log('Google Maps: [role="feed"] not found, checking current page...');
        const currentUrl = this.page.url();
        console.log('Google Maps: current URL:', currentUrl);
        await this.handleGoogleConsent();
        await this.delay(3000);
        await this.page.waitForSelector('[role="feed"]', { timeout: 10000 }).catch(() => {});
      }
      await this.delay(3000);

      await this.autoScroll(800, 50);

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

      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.delay(2000);
      await this.handleGoogleConsent();

      const searchInput = await this.findSearchInput();
      if (!searchInput) {
        throw new Error('Search input not found on Google Maps');
      }

      const query = searchQuery || '';
      await searchInput.click();
      await searchInput.type(query);
      await this.page.keyboard.press('Enter');

      await this.page.waitForSelector('[role="feed"]', { timeout: 15000 }).catch(() => {});
      await this.delay(3000);

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
