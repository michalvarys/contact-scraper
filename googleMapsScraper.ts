import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
// import {
//   extractMapScreenData,
//   extractMapData,
// } from './ai';

type Review = {
  name: string;
  message: string;
  rating: number;
};

type Contact = {
  name?: string;
  phone?: string;
  email?: string;
  occupation?: string;
};
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

interface SearchResult {
  query: string;
  link: string;
  companies: string[];
}

interface Database {
  search: SearchResult[];
  businesses: Business[];
  industries: string[];
  regions: string[];
}

class GoogleMapsScraper {
  private browser: Browser | null;
  private page: Page | null;
  private readonly cookiesPath: string;
  private readonly dbPath: string;
  private mapLinks: Set<string> = new Set();
  private database: Database;

  constructor() {
    this.browser = null;
    this.page = null;
    this.cookiesPath = path.join(__dirname, 'cookies.json');
    this.dbPath = path.join(__dirname, 'database.json');
    this.database = {
      search: [],
      businesses: [],
      industries: [],
      regions: [],
    };
    this.loadDatabase();
  }

  private async saveCookies(): Promise<void> {
    if (!this.page) return;
    const cookies = await this.page.cookies();
    fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
  }

  private async loadCookies(): Promise<void> {
    if (!this.page) return;
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const cookiesString = fs.readFileSync(this.cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        await this.page.setCookie(...cookies);
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }

  private loadDatabase(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        this.database.businesses = data.businesses;
        this.database.search = data.search;
        this.database.regions = data.regions;
        this.database.industries = data.industries;
        data.businesses.forEach((business: Business) => {
          this.mapLinks.add(business.link);
        });
      } else {
        this.database.businesses = [];
        fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2));
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.database.businesses = [];
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2));
    }
  }

  private saveToDb(business: Business): void {
    try {
      if (!this.mapLinks.has(business.link)) {
        this.database.businesses.push(business);
        this.mapLinks.add(business.link);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }

  private saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2));
      console.log('Database saved successfully');
    } catch (error) {
      console.error('Error saving database:', error);
    }
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

  private async scrapeBusinessDetails(url: string): Promise<Business | null> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.goto(url, { waitUntil: 'networkidle0' });
      // const screenName = `${process.cwd()}/screenshots/${Date.now()}.png`;
      // await this.page.screenshot({ path: screenName });
      // const screenshot = await this.page.screenshot({ encoding: 'base64', path: screenName });
      // const data = await extractMapScreenData([screenshot]);
      // const html = await this.page.evaluate(() => document.getElementById('QA0Szd')?.innerHTML);
      // if (!html) return null;

      // const data = await extractMapData(html);
      // console.log(data);
      // return data as unknown as Business;
      return await this.page.evaluate(() => {
        const getId = () =>
          window.location.href.split('/')?.[5]?.split('?')?.[0] || Date.now().toString();
        const data: Business = {
          id: getId(),
          link: window.location.href,
          scrapedAt: new Date().toISOString(),
          name: '',
          phone: '',
          website: '',
          email: '',
          address: '',
          rating: '',
          industry: '',
          region: '',
          reviewsCount: 0,
          reviews: [],
        };

        // Get business name
        const nameElement = document.querySelector('.DUwDvf');
        if (nameElement) data.name = nameElement.textContent?.trim() || '';

        // Get phone number
        const phoneElement = document.querySelector('.rogA2c .Io6YTe');
        if (phoneElement) {
          const phone = phoneElement.textContent?.trim();
          if (phone) data.phone = phone.replace(/\s/g, '');
        }

        // Get website
        const websiteElement = document.querySelector('a[data-tooltip="Otevřít stránky"]');
        if (websiteElement) data.website = websiteElement.getAttribute('href') || '';

        // Get address
        const addressElement = document.querySelector(
          'button[data-tooltip="Kopírovat adresu"] .Io6YTe',
        );
        if (addressElement) data.address = addressElement.textContent?.trim() || '';

        // Get rating
        const ratingElement = document.querySelector('.fontDisplayLarge');
        if (ratingElement) data.rating = ratingElement.textContent?.trim() || '';

        // Get reviews count
        const reviewsCountElement = document.querySelector('.HHrUdb span');
        if (reviewsCountElement) {
          const count = reviewsCountElement.textContent?.match(/\d+/);
          if (count) data.reviewsCount = Number(count[0]);
        }

        // Get industry
        const industryElement = document.querySelector('.DkEaL');
        if (industryElement)
          data.industry = industryElement.textContent?.trim().toLowerCase() || '';

        // Get region from address
        if (data.address) {
          const regionMatch = data.address.match(/\d{3}\s*\d{2}\s*([^,]+)/);
          if (regionMatch) data.region = regionMatch[1].trim();
        }

        // Get reviews
        const reviewElements = document.querySelectorAll('.jftiEf');
        reviewElements.forEach((element) => {
          const rating = Number(
            element.querySelector('.kvMYJc')?.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0',
          );
          const message = element.querySelector('.wiI7pd')?.textContent?.trim() || '';
          const name = element.querySelector('.d4r55')?.textContent?.trim() || '';

          if (rating && message && name) {
            data.reviews!.push({ rating, message, name });
          }
        });

        return data;
        // const getId = () =>
        //   window.location.href.split('/')?.[5]?.split('?')?.[0] || Date.now().toString();
        // const getText = (selector: string) =>
        //   document.querySelector(selector)?.textContent?.trim() || '';

        // const name = getText('h1.fontHeadlineLarge');
        // const address = getText('button[data-item-id^="address"]');
        // const phone = getText('button[data-tooltip="Zkopírovat telefonní číslo"]');
        // const website =
        //   document.querySelector('a[data-tooltip="Otevřít web"]')?.getAttribute('href') || '';
        // const rating = getText('div.fontDisplayLarge');
        // const reviews = getText('button[jsaction="pane.rating.moreReviews"]');

        // const categories = Array.from(
        //   document.querySelectorAll('button[jsaction="pane.rating.category"]'),
        // )
        //   .map((el) => el.textContent?.trim() || '')
        //   .filter(Boolean);

        // const openingHours = Array.from(document.querySelectorAll('table.WgFkxc tbody tr'))
        //   .map((row) => row.textContent?.trim() || '')
        //   .filter(Boolean);

        // return {
        //   id: getId(),
        //   name,
        //   address,
        //   phone,
        //   website,
        //   rating,
        //   reviews: [],
        //   categories,
        //   openingHours,
        //   googleMapsUrl: window.location.href,
        //   scrapedAt: new Date().toISOString(),
        // };
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (error?.response?.data) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        console.dir(error.response.data, { depth: 8 });
      }
      console.error(`Error scraping business details from ${url}:`);
      return null;
    }
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    this.page = await this.browser.newPage();
    await this.loadCookies();
  }

  async searchBusinesses(searchQuery: string, location: string): Promise<Business[]> {
    const results: Business[] = [];

    try {
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      // Navigate to Google Maps
      await this.page.goto('https://www.google.com/maps');

      // Wait for search input field
      await this.page.waitForSelector('#searchboxinput');

      // Enter search query
      await this.page.type('#searchboxinput', `${searchQuery} ${location}`);
      await this.page.keyboard.press('Enter');

      await this.page.waitForSelector('[role="feed"]');

      // Scroll for more results
      await this.autoScroll();

      // Collect all Google Maps links
      const mapLinks = await this.collectMapLinks();
      console.log(`Found ${mapLinks.length} business links to scrape`);

      // Visit each link and scrape detailed data
      for (const link of mapLinks) {
        if (!this.mapLinks.has(link)) {
          const businessDetails = await this.scrapeBusinessDetails(link);
          if (businessDetails) {
            await this.saveToDb(businessDetails);
            results.push(businessDetails);
          }
          // Add a small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // For backwards compatibility, also collect data from the current page
      const businesses = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[role="article"]');
        const data: Business[] = [];

        items.forEach((item) => {
          try {
            const name = item.querySelector('h3.fontHeadlineSmall')?.textContent || '';
            const address =
              Array.from(item.querySelectorAll('div.fontBodyMedium')).find((el) =>
                el.textContent?.includes('·'),
              )?.textContent || '';
            const phone =
              Array.from(item.querySelectorAll('div.fontBodyMedium')).find((el) =>
                el.textContent?.match(/\+?[0-9\s-()]{9,}/),
              )?.textContent || '';
            const website =
              item.querySelector('a[data-tooltip="Otevřít web"]')?.getAttribute('href') || '';

            data.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name,
              address,
              phone,
              website,
              email: '',
              link: window.location.href,
              scrapedAt: new Date().toISOString(),
              reviewsCount: 0,
            });
          } catch (error) {
            console.error('Error processing item:', error);
          }
        });

        return data;
      });

      results.push(...businesses);
    } catch (error) {
      console.error('Error during scraping:', error);
    }

    return results;
  }

  private async autoScroll(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.evaluate(async () => {
      const wrapper = document.querySelector('div[role="feed"]');
      if (!wrapper) return;

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < 10; i++) {
        wrapper.scrollTo(0, wrapper.scrollHeight);
        await delay(1000);
      }
    });
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.saveCookies();
    }
    this.saveDatabase();
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Example usage
async function main(): Promise<void> {
  const scraper = new GoogleMapsScraper();
  await scraper.initialize();

  try {
    const results = await scraper.searchBusinesses('stavební firma', 'Karlovy Vary');
    console.log('Found results:', results);

    // Save results to file
    fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
    console.log('Results have been saved to results.json');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
