import puppeteer, { Browser, Page } from 'puppeteer';
import { Business } from '../types';
import { geminiService } from './GeminiService';

/**
 * Služba pro práci s prohlížečem
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(public headless: boolean = true) {}

  /**
   * Inicializace prohlížeče
   */
  async init() {
    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 720, height: 1280 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    );
  }

  /**
   * Zavření prohlížeče
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Získání aktuální stránky
   * @returns Aktuální stránka
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser nebyl inicializován');
    }
    return this.page;
  }

  /**
   * Získání prohlížeče
   * @returns Prohlížeč
   */
  getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser nebyl inicializován');
    }
    return this.browser;
  }

  /**
   * Pomocná metoda pro zpoždění
   */
  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Potvrzení cookies modalu
   */
  async confirmCookiesModal() {
    if (!this.page) throw new Error('Browser nebyl inicializován');

    // Přijmutí cookies pokud se zobrazí dialog
    try {
      const cookieButton = await this.page.$('button[aria-label="Přijmout vše"]');
      if (cookieButton) {
        await cookieButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.log('Dialog cookies se nezobrazil nebo tlačítko nebylo nalezeno');
    }
  }

  /**
   * Metoda pro scrollování a extrakci odkazů na firmy
   */
  async scrollAndExtractLinks(): Promise<Partial<Business> & { link: string }[]> {
    if (!this.page) throw new Error('Browser nebyl inicializován');

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 5; // Maximální počet pokusů o scrollování

    // Selector pro výsledky vyhledávání
    const resultsSelector = 'a[href^="https://www.google.com/maps/place/"]';

    while (scrollAttempts < maxScrollAttempts) {
      // Scrollování dolů
      const currentHeight = await this.page.$eval('[role="feed"]', (div) => {
        return div.scrollHeight;
      });
      if (currentHeight === previousHeight) {
        // Pokud se výška nezměnila, pravděpodobně jsme na konci seznamu
        scrollAttempts++;
        await this.delay(300);
      } else {
        scrollAttempts = 0;
      }

      previousHeight = currentHeight;

      await this.page.$eval('[role="feed"]', (div) => {
        div.scrollTo(0, div.scrollHeight);
      });

      await this.delay(1000);
    }

    const links = await this.page.$$eval(resultsSelector, (elements) => {
      return elements.map((el) => el.getAttribute('href')!).filter(Boolean);
    });

    const html = await this.page.$$eval(resultsSelector, (elements) => {
      return elements.map((el) => el.parentElement?.innerHTML || el.innerHTML).filter(Boolean);
    });

    const data = await geminiService.extractCompaniesFromHtml(html.join('\n'));

    return [...data, ...links.map((link) => ({ link }))];
  }

  /**
   * Navigace na stránku
   * @param url URL stránky
   */
  async navigateTo(url: string) {
    if (!this.page) throw new Error('Browser nebyl inicializován');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  /**
   * Získání HTML obsahu stránky
   * @returns HTML obsah stránky
   */
  async getPageContent(): Promise<string> {
    if (!this.page) throw new Error('Browser nebyl inicializován');
    return await this.page.content();
  }

  /**
   * Získání HTML obsahu elementu
   * @param selector Selektor elementu
   * @returns HTML obsah elementu
   */
  async getElementContent(selector: string): Promise<string> {
    if (!this.page) throw new Error('Browser nebyl inicializován');
    return await this.page.$eval(selector, (el) => el.innerHTML);
  }
}

// Export instance služby pro snadné použití
// export const browserManager = new BrowserManager();
