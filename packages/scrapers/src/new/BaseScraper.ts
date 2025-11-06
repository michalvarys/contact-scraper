import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseBusinessData, BusinessData } from '../types';
import { launchBrowser } from '../tools/puppeteer';

export interface ScraperConfig {
  headless?: boolean;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
  }>;
  headers?: Record<string, string>;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected config: ScraperConfig;
  protected currentTaskId: string | null = null;

  constructor(config: ScraperConfig) {
    this.config = {
      headless: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: {
        width: 1920,
        height: 1080,
      },
      timeout: 30000,
      ...config,
    };
  }

  public setTaskId(taskId: string) {
    this.currentTaskId = taskId;
  }

  public async init(): Promise<void> {
    this.browser = await launchBrowser(this.config.headless);
    this.page = await this.createConfiguredPage();
  }

  public async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  protected async ensurePage(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      return;
    }

    if (!this.browser) {
      await this.init();
      return;
    }

    this.page = await this.createConfiguredPage();
  }

  private async createConfiguredPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    if (this.config.viewport) {
      await page.setViewport(this.config.viewport);
    }

    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }

    if (this.config.cookies) {
      await page.setCookie(...this.config.cookies);
    }

    if (this.config.headers) {
      await page.setExtraHTTPHeaders(this.config.headers);
    }

    if (this.config.timeout) {
      page.setDefaultTimeout(this.config.timeout);
    }

    return page;
  }

  /**
   * Vyhledá odkazy na stránce podle zadaného dotazu
   * @param query Vyhledávací dotaz
   * @returns Seznam nalezených odkazů
   */
  public abstract searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]>;

  /**
   * Získá data o firmě z daného odkazu
   * @param link Odkaz na detail firmy
   * @returns Data o firmě
   */
  public abstract scrapeLink(link: string): Promise<BaseBusinessData>;

  /**
   * Převede základní data o firmě na kompletní data včetně metadat
   * @param data Základní data o firmě
   * @param link Odkaz, ze kterého byla data získána
   * @returns Kompletní data o firmě
   */
  public enrichBusinessData(data: BaseBusinessData, link: string): BusinessData {
    if (!this.currentTaskId) {
      throw new Error('Task ID not set');
    }

    return {
      ...data,
      taskId: this.currentTaskId,
      sourceLink: link,
    };
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.delay(delay);
  }

  protected async scrollToBottom(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  protected async waitForNetworkIdle(timeout: number = 5000): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.waitForNetworkIdle({ timeout });
  }
}
