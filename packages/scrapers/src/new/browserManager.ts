import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly cookiesPath: string;
  private headless: boolean;

  constructor(scraperName: string, headless: boolean = false) {
    this.headless = headless;
    this.cookiesPath = path.join(__dirname, '..', '..', `cookies-${scraperName}.json`);
  }

  // Gettery pro browser a page
  get browserInstance(): Browser | null {
    return this.browser;
  }

  get pageInstance(): Page | null {
    return this.page;
  }

  // Cookie management
  async saveCookies(): Promise<void> {
    if (!this.page) return;
    const cookies = await this.page.cookies();
    await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
  }

  async loadCookies(): Promise<void> {
    if (!this.page) return;
    try {
      if (existsSync(this.cookiesPath)) {
        const cookiesString = readFileSync(this.cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        await this.page.setCookie(...cookies);
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }

  // Browser initialization
  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });
    }

    if (!this.page) {
      this.page = await this.browser.newPage();
      await this.loadCookies();

      // Set User-Agent and other headers
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // Nastavení viewportu
      await this.page.setViewport({ width: 1280, height: 800 });
    }

    return { browser: this.browser, page: this.page };
  }

  // Close browser
  async close() {
    if (this.page) {
      await this.saveCookies();
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Vytvoření nové stránky v prohlížeči
  async createNewPage(): Promise<Page | null> {
    if (!this.browser) return null;
    return await this.browser.newPage();
  }

  // Helper method for delays
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // Protected method to auto-scroll for lazy-loaded content
  async autoScroll(scrollDistance = 1000, maxScrolls = 10) {
    if (!this.page) return;

    await this.page.evaluate(
      async (scrollDistance, maxScrolls) => {
        await new Promise<void>((resolve) => {
          let scrolls = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, scrollDistance);
            scrolls++;

            if (scrolls >= maxScrolls) {
              clearInterval(timer);
              resolve();
            }
          }, 400);
        });
      },
      scrollDistance,
      maxScrolls,
    );
  }
}
