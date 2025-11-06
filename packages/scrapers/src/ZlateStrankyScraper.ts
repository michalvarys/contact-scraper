import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Business, ScraperOptions } from './types';
import { getEmailFromWebsite } from './tools/email';
import { DatabaseManager } from './services/DatabaseManager';

export class ZlateStrankyScraper extends BaseScraper {
  private searchQuery: string;
  private taskId: string | null = null;
  private databaseManager: DatabaseManager;
  private nextPageUrl: string | null = null;
  private visitedPageUrls: Set<string> = new Set();
  private cookiesAccepted = false;

  constructor(options: ScraperOptions = {}) {
    super(options.baseUrl || 'https://www.zlatestranky.cz/', {
      headless: options.headless !== undefined ? options.headless : true,
      ...options,
    });
    this.searchQuery = options.searchQuery || '';
    this.databaseManager = new DatabaseManager();
  }

  private normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  private async findNextPageUrl(): Promise<string | null> {
    if (!this.page) return null;

    const nextUrl = await this.page.evaluate(() => {
      const pagination = document.querySelector('.pagination');
      if (!pagination) {
        return null;
      }

      const anchors = Array.from(
        pagination.querySelectorAll<HTMLAnchorElement>('li:not(.disabled) a'),
      );

      const arrowCandidate = anchors.find((anchor) => {
        const text = anchor.textContent?.trim() || '';
        return text === '»' || text === '›';
      });
      if (arrowCandidate) {
        return arrowCandidate.href || arrowCandidate.getAttribute('href');
      }

      const activeLi = pagination.querySelector('li.active');
      let cursor = activeLi?.nextElementSibling as HTMLElement | null;
      while (cursor) {
        if (cursor.classList.contains('disabled')) {
          cursor = cursor.nextElementSibling as HTMLElement | null;
          continue;
        }

        const anchor = cursor.querySelector('a[href]') as HTMLAnchorElement | null;
        if (anchor) {
          const text = anchor.textContent?.trim() || '';
          if (text && !['...', '«', '<', '›', '»', '>'].includes(text)) {
            return anchor.href || anchor.getAttribute('href');
          }
        }

        cursor = cursor.nextElementSibling as HTMLElement | null;
      }

      return null;
    });

    if (!nextUrl) {
      return null;
    }

    return nextUrl;
  }

  private async acceptCookiesOnce(): Promise<void> {
    if (this.cookiesAccepted || !this.page) {
      return;
    }

    try {
      const cookieButton = await this.page.$(
        'button.accept-cookies, button[id*="cookie"], button[class*="cookie"]',
      );
      if (cookieButton) {
        await cookieButton.click();
        await this.delay(500);
        this.cookiesAccepted = true;
      }
    } catch (error) {
      console.log('Cookie dialog not found');
    }
  }

  /**
   * Nastavení ID úlohy
   * @param taskId ID úlohy
   */
  setTaskId(taskId: string) {
    this.taskId = taskId;
  }

  protected getScraperName(): string {
    return 'zlate-stranky';
  }

  protected buildPageUrl(page: number, query?: string): string {
    const searchQuery = query || this.searchQuery;
    const encodedQuery = encodeURIComponent(searchQuery);
    return `${this.baseUrl}firmy/hledani/${encodedQuery}`;
  }

  protected async waitForPageLoad() {
    if (!this.page) {
      return;
    }

    try {
      await this.page.waitForSelector('a[href*="/profil/"]', {
        timeout: 10000,
      });
    } catch (error) {
      console.log('No profile links found on page');
    }

    await this.acceptCookiesOnce();
  }

  protected async checkNextPage(): Promise<boolean> {
    this.nextPageUrl = await this.findNextPageUrl();

    if (!this.nextPageUrl) {
      return false;
    }

    if (this.page) {
      const currentUrl = this.normalizeUrl(this.page.url());
      const nextUrl = this.normalizeUrl(this.nextPageUrl);
      if (nextUrl === currentUrl) {
        this.nextPageUrl = null;
        return false;
      }
    }

    return true;
  }

  protected async goToNextPage() {
    if (!this.nextPageUrl) {
      throw new Error('Next page URL not initialized');
    }

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const targetUrl = this.nextPageUrl;
    this.nextPageUrl = null;

    await this.page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await this.acceptCookiesOnce();
    await this.delay(500);
  }

  protected extractCompanyLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    const seenLinks = new Set<string>();

    // Najdeme všechny odkazy na profily
    $('a[href*="/profil/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        // Extrahujeme pouze základní URL profilu bez parametrů
        const match = href.match(/(\/profil\/[^\/\?#]+)/);
        if (match) {
          const profilePath = match[1];
          const fullUrl = profilePath.startsWith('http')
            ? profilePath
            : `https://www.zlatestranky.cz${profilePath}`;

          if (!seenLinks.has(fullUrl)) {
            seenLinks.add(fullUrl);
            links.push(fullUrl);
          }
        }
      }
    });

    return links;
  }

  public async searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]> {
    await this.initializeBrowser();

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.cookiesAccepted = false;
    const searchUrl = this.buildPageUrl(1, query);
    await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await this.acceptCookiesOnce();

    const collectedLinks = new Set<string>();
    this.visitedPageUrls = new Set<string>();

    while (true) {
      if (!this.page) break;

      const currentUrl = this.normalizeUrl(this.page.url());
      if (this.visitedPageUrls.has(currentUrl)) {
        console.log(`Already processed page ${currentUrl}, stopping pagination loop.`);
        break;
      }
      this.visitedPageUrls.add(currentUrl);

      await this.waitForPageLoad();
      await this.delay(1000);

      const html = await this.page.content();
      const links = this.extractCompanyLinks(html);

      const newLinks: string[] = [];
      links.forEach((link) => {
        if (!collectedLinks.has(link)) {
          collectedLinks.add(link);
          newLinks.push(link);
        }
      });

      if (newLinks.length > 0 && onBatch) {
        await onBatch(newLinks);
      }

      const nextPageUrl = await this.findNextPageUrl();

      if (!nextPageUrl) {
        break;
      }

      const normalizedNext = this.normalizeUrl(nextPageUrl);
      if (this.visitedPageUrls.has(normalizedNext)) {
        break;
      }

      await this.page.goto(nextPageUrl, { waitUntil: 'networkidle2' });
      await this.acceptCookiesOnce();
      await this.delay(500);
    }

    console.log(`Found ${collectedLinks.size} company links for query: ${query}`);

    return Array.from(collectedLinks);
  }

  async scrape(searchQuery?: string): Promise<any> {
    this.visitedPageUrls = new Set<string>();
    this.cookiesAccepted = false;
    return super.scrape(searchQuery);
  }

  public async scrapeLink(link: string): Promise<Business> {
    await this.initializeBrowser();

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    return await this.scrapeBusinessDetails(link);
  }

  protected async scrapeBusinessDetails(link: string): Promise<Business> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.goto(link, { waitUntil: 'networkidle2' });
    await this.delay(1000);

    const data = await this.page.evaluate(() => {
      const getText = (selector: string): string | null => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || null : null;
      };

      // Název firmy
      const name = getText('h1') || 'Unknown';

      // Adresa z microdata
      const addressElement = document.querySelector('[itemprop="address"]');
      let fullAddress = null;
      let city = null;
      let region = null;
      let postalCode = null;

      if (addressElement) {
        const streetAddress = addressElement
          .querySelector('[itemprop="streetAddress"]')
          ?.getAttribute('content');
        const addressLocality = addressElement
          .querySelector('[itemprop="addressLocality"]')
          ?.getAttribute('content');
        const addressPostalCode = addressElement
          .querySelector('[itemprop="postalCode"]')
          ?.getAttribute('content');
        const descriptionElement = addressElement.querySelector('[itemprop="description"]');

        if (streetAddress && addressLocality && addressPostalCode) {
          fullAddress = `${streetAddress}, ${addressPostalCode} ${addressLocality}`;
          city = addressLocality;
          postalCode = addressPostalCode;
        } else if (descriptionElement) {
          fullAddress = descriptionElement.textContent?.trim() || null;

          if (fullAddress) {
            const postalMatch = fullAddress.match(/(\d{3}\s*\d{2})\s+([^,\n<]+)/);
            if (postalMatch) {
              postalCode = postalMatch[1].replace(/\s+/g, ' ');
              city = postalMatch[2].trim();
            }

            const regionMatch = fullAddress.match(/okres\s+([^,\n<]+)/i);
            if (regionMatch) {
              region = regionMatch[1].trim();
            }
          }
        }
      }

      // Telefony
      const phoneElements = document.querySelectorAll('[itemprop="telephone"]');
      let phone = null;
      if (phoneElements.length > 0) {
        phone = phoneElements[0].textContent?.trim() || null;
      }

      // Email
      const emailElements = document.querySelectorAll('a[href^="mailto:"]');
      let email = null;
      if (emailElements.length > 0) {
        const href = emailElements[0].getAttribute('href');
        if (href && href.startsWith('mailto:')) {
          email = href.substring(7);
        }
      }

      // Web
      const websiteElements = document.querySelectorAll('[itemprop="url"]');
      let website = null;
      for (let i = 0; i < websiteElements.length; i++) {
        const el = websiteElements[i];
        if (el.tagName === 'A') {
          const href = (el as HTMLAnchorElement).href;
          if (href && !href.includes('zlatestranky.cz')) {
            website = href;
            break;
          }
        }
      }

      // Kategorie
      const categoryElements = document.querySelectorAll('.tag, a[href*="/firmy/rubrika/"]');
      const categories: string[] = Array.from(categoryElements)
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));

      // Souřadnice
      let latitude = null;
      let longitude = null;
      const mapElement = document.querySelector('[data-centerpoi]');
      if (mapElement) {
        try {
          const centerPoi = mapElement.getAttribute('data-centerpoi');
          if (centerPoi) {
            const poiData = JSON.parse(centerPoi);
            if (poiData.lat && poiData.lng) {
              latitude = parseFloat(poiData.lat);
              longitude = parseFloat(poiData.lng);
            }
          }
        } catch (e) {
          console.error('Error parsing map coordinates:', e);
        }
      }

      // Popis
      const descriptionElement = document.querySelector('.company-description, .description');
      const description = descriptionElement
        ? descriptionElement.textContent?.trim() || null
        : null;

      return {
        name,
        description,
        address: fullAddress,
        city,
        region,
        postalCode,
        country: 'Česká republika',
        phone,
        email,
        website,
        categories: categories || [],
        latitude,
        longitude,
      };
    });

    // Pokud nemáme email a máme website, zkusíme najít email
    if (!data.email && data.website) {
      try {
        const email = await getEmailFromWebsite(data.website);
        if (email) {
          data.email = email;
        }
      } catch (error) {
        console.log('Could not fetch email from website:', error);
      }
    }
    const {
      address,
      city,
      country,
      description,
      latitude,
      longitude,
      postalCode,
      region,
      ...rest
    } = data;

    // Přidání scrapedAt
    const companyData = {
      ...rest,
      address: `${address}, ${city} ${postalCode}, ${region || ''}, ${country}`,
      link,
      rating: null,
      reviewsCount: 0,
      // openingHours: null,
      // priceLevel: null,
      scrapedAt: new Date(),
    };

    console.log(`Scraped: ${companyData.name}`);

    // Uložení do databáze a vrácení s ID
    const savedCompany = await this.databaseManager.saveCompanyData(companyData);
    return savedCompany as unknown as Business;
  }
}
