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
      const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));

      const nextArrow = allLinks.find((a) => {
        const text = a.textContent?.trim() || '';
        return text === '>' || text === '›';
      });
      if (nextArrow) {
        return nextArrow.href;
      }

      const currentUrl = window.location.pathname;
      const currentPageMatch = currentUrl.match(/\/(\d+)(?:\?|$)/);
      const currentPage = currentPageMatch ? parseInt(currentPageMatch[1], 10) : 1;
      const nextPage = currentPage + 1;

      const pageLink = allLinks.find((a) => {
        const href = a.getAttribute('href') || '';
        return href.includes(`/${nextPage}`) && href.includes('/firmy/hledani/');
      });
      if (pageLink) {
        return pageLink.href;
      }

      return null;
    });

    return nextUrl || null;
  }

  private async acceptCookiesOnce(): Promise<void> {
    if (this.cookiesAccepted || !this.page) {
      return;
    }

    try {
      const accepted = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const agreeLink = links.find((a) => {
          const href = a.getAttribute('href') || '';
          const text = a.textContent?.trim() || '';
          return href.includes('/Cookies/Agree') || text === 'Souhlasím';
        });
        if (agreeLink) {
          agreeLink.click();
          return true;
        }

        const buttons = Array.from(document.querySelectorAll('button'));
        const cookieBtn = buttons.find((b) => {
          const text = b.textContent?.trim() || '';
          return text === 'Souhlasím' || text === 'Přijmout' || text === 'Přijmout vše';
        });
        if (cookieBtn) {
          cookieBtn.click();
          return true;
        }
        return false;
      });

      if (accepted) {
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
      const name = document.querySelector('h1')?.textContent?.trim() || 'Unknown';

      // Email z mailto: odkazu
      let email: string | null = null;
      const mailtoEl = document.querySelector('a[href^="mailto:"]');
      if (mailtoEl) {
        const href = mailtoEl.getAttribute('href') || '';
        email = href.replace('mailto:', '').split('?').shift() || null;
      }

      // Telefon — hledáme formát +420 nebo čísla s mezerami
      let phone: string | null = null;
      const telLink = document.querySelector('a[href^="tel:"]');
      if (telLink) {
        phone = telLink.textContent?.trim() || telLink.getAttribute('href')?.replace('tel:', '') || null;
      }
      if (!phone) {
        const strongElements = Array.from(document.querySelectorAll('strong, a, span'));
        for (const el of strongElements) {
          const text = el.textContent?.trim() || '';
          if (/^\+?420[\s\d]{9,}/.test(text) || /^\d{3}\s*\d{3}\s*\d{3}$/.test(text)) {
            phone = text;
            break;
          }
        }
      }

      // Website — odkaz mimo zlatestranky.cz
      let website: string | null = null;
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      for (const a of allLinks) {
        const href = (a as HTMLAnchorElement).href;
        if (
          href &&
          !href.includes('zlatestranky.cz') &&
          !href.includes('google.') &&
          !href.includes('facebook.') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:') &&
          !href.startsWith('javascript:') &&
          (href.startsWith('http://') || href.startsWith('https://'))
        ) {
          const text = a.textContent?.trim() || '';
          if (text && (text.includes('www.') || text.includes('.cz') || text.includes('.com'))) {
            website = href.split('?').shift() || href;
            break;
          }
        }
      }

      // Adresa — text obsahující PSČ (formát XXX XX)
      let address: string | null = null;
      const bodyText = document.body.innerText;
      const addressMatch = bodyText.match(/([^\n]+\d{3}\s*\d{2}\s+[^\n]+)/);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }

      // Kategorie
      const categoryLinks = Array.from(document.querySelectorAll('a[href*="/firmy/rubrika/"]'));
      const categories = categoryLinks
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));

      const uniqueCategories = [...new Set(categories)];

      return {
        name,
        address,
        phone,
        email,
        website,
        categories: uniqueCategories,
      };
    });

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

    const companyData = {
      ...data,
      address: data.address || '',
      link,
      rating: null,
      reviewsCount: 0,
      scrapedAt: new Date(),
    };

    console.log(`Scraped: ${companyData.name}`);

    const savedCompany = await this.databaseManager.saveCompanyData(companyData);
    return savedCompany as unknown as Business;
  }
}
