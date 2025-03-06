import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, Business } from './BaseScraper';

export class FirmyCzScraper extends BaseScraper {
  private searchQuery: string;

  constructor(
    public industry: string,
    public region: string,
    headless: boolean = true,
  ) {
    super('https://www.firmy.cz/', industry, region, { headless });
    this.searchQuery = `${industry} ${region}`;
    this.init();
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
    await this.page?.waitForSelector('.companyTitle.statCompanyDetail', {
      timeout: 10000,
    });
  }

  protected async checkNextPage(): Promise<boolean> {
    if (!this.page) return false;

    return await this.page.evaluate(() => {
      const nextBtn = document.querySelector('#nextBtn');
      return nextBtn !== null;
    });
  }

  protected async goToNextPage() {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate(() => {
      const nextBtn = document.querySelector('#nextBtn');
      if (nextBtn) (nextBtn as any).click();
    });

    await this.page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
  }

  protected extractCompanyLinks(html: string): string[] {
    const $ = cheerio.load(html);
    return $('.companyTitle.statCompanyDetail')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter((link) => link && !link.startsWith('https://c.seznam.cz/click'))
      .map((link) =>
        link.startsWith('http') ? link : `${this.baseUrl}${link.replace(/^\//, '')}`,
      );
  }

  protected hasNextPage(html: string): boolean {
    const $ = cheerio.load(html);
    return $('#nextBtn').length > 0;
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

  protected async scrapeBusinessDetails(link: string): Promise<Business> {
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
      industry: this.industry,
      region: this.region,
      link: link,
      reviewsCount: 0,
      scrapedAt: new Date().toISOString(),
    };

    return business;
  }

  private extractId(link: string): string {
    const match = link.match(/\/detail\/(\d+)-/);
    return match ? match[1] : Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private extractEmail($: cheerio.CheerioAPI): string | null {
    const emailLink = $('.detailEmail a');
    return emailLink.length ? emailLink.attr('href')?.replace('mailto:', '') || null : null;
  }

  private extractPhone($: cheerio.CheerioAPI): string | null {
    const phone = $('.detailPhonePrimary').text().trim();
    return phone || null;
  }

  private extractWebsite($: cheerio.CheerioAPI): string | null {
    const websiteLink = $('.detailWebUrl');
    return websiteLink.length ? websiteLink.attr('href') || null : null;
  }

  private extractCategories($: cheerio.CheerioAPI): string[] {
    return $('.list.lcat ul li a')
      .map((_, el) => $(el).text().trim())
      .get();
  }
}
