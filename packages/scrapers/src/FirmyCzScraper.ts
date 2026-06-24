import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper';
import { Business, ScraperOptions } from './types';
import { getEmailFromWebsite } from './tools/email';

export class FirmyCzScraper extends BaseScraper {
  private searchQuery: string;
  private taskId: string | null = null;

  constructor(options: ScraperOptions = {}) {
    super(options.baseUrl || 'https://www.firmy.cz/', {
      headless: options.headless !== undefined ? options.headless : true,
      ...options,
    });
    this.searchQuery = options.searchQuery || '';
  }

  setTaskId(taskId: string) {
    this.taskId = taskId;
  }

  protected getScraperName(): string {
    return 'firmy-cz';
  }

  protected buildPageUrl(page: number, query?: string): string {
    const searchQuery = query || this.searchQuery;
    const encodedQuery = encodeURIComponent(searchQuery);
    return page === 1
      ? `${this.baseUrl}?q=${encodedQuery}`
      : `${this.baseUrl}?q=${encodedQuery}&page=${page}`;
  }

  protected async waitForPageLoad() {
    if (!this.page) return;
    try {
      await this.page.waitForSelector('a[href*="/detail/"]', {
        timeout: 10000,
      });
    } catch {
      console.log('No detail links found on page');
    }
  }

  protected async checkNextPage(): Promise<boolean> {
    if (!this.page) return false;

    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some((a) => {
        const text = a.textContent?.trim() || '';
        const cls = a.className || '';
        return text === '>' || text === '›' || a.getAttribute('rel') === 'next'
          || cls.includes('loadMorePremisesButton')
          || text.includes('Načíst další');
      });
    });
  }

  protected async goToNextPage() {
    if (!this.page) throw new Error('Page not initialized');

    const nextUrl = await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const nextLink = links.find((a) => {
        const text = a.textContent?.trim() || '';
        const cls = a.className || '';
        return text === '>' || text === '›' || a.getAttribute('rel') === 'next'
          || cls.includes('loadMorePremisesButton')
          || text.includes('Načíst další');
      });
      return nextLink?.href || null;
    });

    if (!nextUrl) throw new Error('Next page link not found');

    await this.page.goto(nextUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await this.waitForPageLoad();
  }

  protected extractCompanyLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    const seen = new Set<string>();

    $('a[href*="/detail/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      if (href.includes('c.seznam.cz/click')) return;

      const match = href.match(/(\/detail\/\d+-[^?#]+\.html)/);
      if (!match) return;

      const fullUrl = match[1].startsWith('http')
        ? match[1]
        : `https://www.firmy.cz${match[1]}`;

      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        links.push(fullUrl);
      }
    });

    return links;
  }

  protected hasNextPage(html: string): boolean {
    const $ = cheerio.load(html);
    const links = $('a');
    let found = false;
    links.each((_, el) => {
      const text = $(el).text().trim();
      const cls = $(el).attr('class') || '';
      if (text === '>' || text === '›' || $(el).attr('rel') === 'next'
        || cls.includes('loadMorePremisesButton')
        || text.includes('Načíst další')) {
        found = true;
      }
    });
    return found;
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  protected async scrapeBusinessDetails(link: string): Promise<Business> {
    const detailHtml = await this.fetchPage(link);
    const $ = cheerio.load(detailHtml);

    const business: Business = {
      id: this.extractId(link),
      name: $('h1').first().text().trim() || 'Unknown',
      address: this.extractAddress($),
      email: this.extractEmail($),
      phone: this.extractPhone($),
      website: this.extractWebsite($),
      categories: this.extractCategories($),
      link: link,
      reviewsCount: 0,
      scrapedAt: new Date().toISOString(),
    };

    if (business.website && !business.email) {
      business.email = await getEmailFromWebsite(business.website);
    }

    return business;
  }

  private extractId(link: string): string {
    const match = link.match(/\/detail\/(\d+)-/);
    return match ? match[1] : Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private extractAddress($: cheerio.CheerioAPI): string {
    const addrSpan = $('span.addrValue').first();
    if (addrSpan.length) {
      return addrSpan.text().trim();
    }
    const addrDiv = $('div.detailAddress span').first();
    if (addrDiv.length) {
      return addrDiv.text().trim();
    }
    return '';
  }

  private extractEmail($: cheerio.CheerioAPI): string | null {
    const mailtoLink = $('a[data-dot="e-mail"]').first();
    if (mailtoLink.length) {
      const href = mailtoLink.attr('href') || '';
      return href.replace('mailto:', '').split('?').shift() || null;
    }
    const fallback = $('a[href^="mailto:"]').first();
    if (fallback.length) {
      const href = fallback.attr('href') || '';
      return href.replace('mailto:', '').split('?').shift() || null;
    }
    return null;
  }

  private extractPhone($: cheerio.CheerioAPI): string | null {
    const phoneSpan = $('span[data-dot="origin-phone-number"]').first();
    if (phoneSpan.length) {
      return phoneSpan.text().trim() || null;
    }
    const telLink = $('a[href^="tel:"]').first();
    if (telLink.length) {
      return telLink.text().trim() || telLink.attr('href')?.replace('tel:', '') || null;
    }
    return null;
  }

  private extractWebsite($: cheerio.CheerioAPI): string | null {
    const webLinks = $('a[href*="utm_source=firmy.cz"]');
    let website: string | null = null;
    webLinks.each((_, el) => {
      if (website) return;
      const href = $(el).attr('href') || '';
      if (href && !href.includes('firmy.cz/detail')) {
        website = href.split('?').shift() || null;
      }
    });
    return website;
  }

  private extractCategories($: cheerio.CheerioAPI): string[] {
    const categories = new Set<string>();
    $('a[href*="/stitek/"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text) categories.add(text);
    });
    return [...categories];
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

      // Navigace na stránku s výsledky vyhledávání
      const pageUrl = this.buildPageUrl(1, query);
      await this.page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Získání HTML obsahu stránky
      const html = await this.page.content();

      // Extrakce odkazů na firmy
      const collectedLinks: string[] = [];
      const seen = new Set<string>();

      const processBatch = async (batch: string[]) => {
        const newLinks = batch.filter((link) => !seen.has(link));
        if (newLinks.length === 0) return;
        newLinks.forEach((link) => {
          seen.add(link);
          collectedLinks.push(link);
        });
        if (onBatch) {
          await onBatch(newLinks);
        }
      };

      const links = this.extractCompanyLinks(html);
      console.log(`Nalezeno ${links.length} odkazů na firmy na první stránce`);
      await processBatch(links);

      // Kontrola, zda existují další stránky
      let currentPage = 1;
      let hasNextPage = await this.checkNextPage();

      // Procházení dalších stránek
      while (hasNextPage) {
        try {
          await this.goToNextPage();
          currentPage++;

          // Získání HTML obsahu stránky
          const pageHtml = await this.page.content();

          // Extrakce odkazů na firmy
          const pageLinks = this.extractCompanyLinks(pageHtml);
          console.log(`Nalezeno ${pageLinks.length} odkazů na firmy na stránce ${currentPage}`);
          await processBatch(pageLinks);

          // Kontrola, zda existuje další stránka
          hasNextPage = await this.checkNextPage();
        } catch (error) {
          console.error(`Chyba při procházení stránky ${currentPage}:`, error);
          break;
        }
      }

      return collectedLinks;
    } catch (error) {
      console.error('Chyba při vyhledávání odkazů:', error);
      return [];
    }
  }

  /**
   * Metoda pro scrapování odkazu
   * @param link Odkaz na detail firmy
   * @returns Data o firmě
   */
  async scrapeLink(link: string): Promise<Business> {
    return this.scrapeBusinessDetails(link);
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
}
