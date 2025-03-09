import { BaseScraper } from './BaseScraper';
import { Business, WebsiteAnalysisResult } from '../types';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { Page } from 'puppeteer';
import { DatabaseManager } from './databaseManager';

// Inicializace Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export class AiGoogleMapsScraper extends BaseScraper {
  private screenshotsDir = path.join(process.cwd(), 'screenshots');

  constructor(industry: string = '', region: string = '', options: { headless?: boolean } = {}) {
    super('https://www.google.com/maps', industry, region, options);

    // Vytvoření adresáře pro screenshoty, pokud neexistuje
    this.initScreenshotsDir();
  }

  protected getScraperName(): string {
    return 'google-maps';
  }

  private async initScreenshotsDir() {
    try {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
    } catch (error) {
      console.error('Chyba při vytváření adresáře pro screenshoty:', error);
    }
  }

  protected buildPageUrl(page: number, query?: string): string {
    return 'https://www.google.com/maps';
  }

  protected extractCompanyLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    $('a[href^="https://www.google.com/maps/place/"]').each((_, el) => {
      const link = $(el).attr('href');
      if (link) links.push(link);
    });
    return Array.from(new Set(links));
  }

  protected async scrapeBusinessDetails(link: string): Promise<Business> {
    const page = this.browserManager.pageInstance;
    if (!page) throw new Error('Browser nebyl inicializován');

    // Navštívení stránky firmy
    await page.goto(link, { waitUntil: 'networkidle2' });
    await this.delay(2000); // Krátké čekání pro načtení obsahu

    // Získání HTML obsahu stránky
    const content = await page.content();

    // Extrakce základních dat o firmě pomocí Gemini
    const companyData = await this.extractCompanyDataWithGemini(content, link);

    // Přidání času scrapování
    companyData.scrapedAt = new Date().toISOString();

    console.dir(companyData, { depth: Infinity });

    // Pokud má firma webovou stránku, získáme z ní další data
    if (companyData.website) {
      const websiteData = await this.scrapeWebsite(companyData.website, companyData.email);
      console.dir(websiteData, { depth: Infinity });

      // Zde můžete přidat implementaci pro ukládání metadat o webu
    }

    return companyData;
  }

  protected async waitForPageLoad(page: Page) {
    await page
      .waitForSelector('a[href^="https://www.google.com/maps/place/"]', { timeout: 10000 })
      .catch(() => console.log('Selector nenalezen, pokračuji bez čekání'));

    await this.delay(2000);
  }

  protected async checkNextPage(): Promise<boolean> {
    const page = this.browserManager.pageInstance;
    if (!page) return false;

    // Kontrola, zda existuje tlačítko "Další"
    const nextButton = await page.$('button[aria-label="Další"]');
    return !!nextButton;
  }

  protected async goToNextPage() {
    const page = this.browserManager.pageInstance;
    if (!page) throw new Error('Browser nebyl inicializován');

    // Kliknutí na tlačítko "Další"
    await page.click('button[aria-label="Další"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  /**
   * Scrollování a extrakce odkazů na firmy
   */
  async scrollAndExtractLinks(): Promise<string[]> {
    const page = this.browserManager.pageInstance;
    if (!page) throw new Error('Browser nebyl inicializován');

    const links = new Set<string>();
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 30; // Maximální počet pokusů o scrollování

    // Selector pro výsledky vyhledávání
    const resultsSelector = 'a[href^="https://www.google.com/maps/place/"]';

    while (scrollAttempts < maxScrollAttempts) {
      // Získání současných odkazů
      const currentLinks = await page.evaluate((selector) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((el) => el.getAttribute('href')).filter(Boolean);
      }, resultsSelector);

      currentLinks.forEach((link) => {
        if (link) links.add(link);
      });

      // Scrollování dolů
      const currentHeight = await page.$eval('[role="main"]', (div) => {
        return div.scrollHeight;
      });

      if (currentHeight === previousHeight) {
        // Pokud se výška nezměnila, pravděpodobně jsme na konci seznamu
        scrollAttempts++;
        await this.delay(1000);
      } else {
        scrollAttempts = 0;
      }

      previousHeight = currentHeight;

      await page.evaluate(
        'document.querySelector("[role=main]").scrollTo(0, document.querySelector("[role=main]").scrollHeight)',
      );
      await this.delay(1500);
    }

    return Array.from(links);
  }

  /**
   * Hlavní metoda pro získávání dat o firmách podle oboru a regionu
   */
  async scrapeCompanies(industry: string, region: string) {
    // Nastavení průmyslu a regionu
    this.dbManager = new DatabaseManager(industry, region);
    await this.dbManager.init();
    // this.businesses = await this.dbManager.loadBusinesses();

    await this.browserManager.initialize();
    const page = this.browserManager.pageInstance;

    if (!page) throw new Error('Browser nebyl inicializován');

    try {
      // 1. Navštívení Google Maps a vyhledání dotazu
      const searchQuery = `${industry} ${region}`;
      await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });

      // Přijmutí cookies pokud se zobrazí dialog
      try {
        const cookieButton = await page.$('button[aria-label="Přijmout vše"]');
        if (cookieButton) {
          await cookieButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
      } catch (error) {
        console.log('Dialog cookies se nezobrazil nebo tlačítko nebylo nalezeno');
      }

      // Vyhledání dotazu
      await page.waitForSelector('#searchboxinput');
      await page.type('#searchboxinput', searchQuery);
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.delay(2000);

      // 2. Scrollování a získání všech odkazů na firmy
      const companyLinks = await this.scrollAndExtractLinks();
      console.log(`Nalezeno ${companyLinks.length} firem`);

      // 3. Procházení jednotlivých firem a extrakce dat
      for (const link of companyLinks) {
        try {
          // Přeskočit, pokud firma už existuje v databázi
          if (await this.dbManager.companyExists(link)) {
            console.log(`Firma s odkazem ${link} již existuje v databázi, přeskakuji.`);
            continue;
          }

          // Navštívení stránky firmy
          await page.goto(link, { waitUntil: 'networkidle2' });
          await this.delay(2000); // Krátké čekání pro načtení obsahu

          // Získání HTML obsahu stránky
          const content = await page.content();

          // 4. Extrakce základních dat o firmě pomocí Gemini
          const companyData = await this.extractCompanyDataWithGemini(content, link);

          // Přidání času scrapování
          companyData.scrapedAt = new Date().toISOString();

          console.dir(companyData, { depth: Infinity });

          // Uložení do databáze
          //   await this.dbManager.saveBusiness(companyData);

          // 7. Pokud má firma webovou stránku, získáme z ní další data
          if (companyData.website) {
            const websiteData = await this.scrapeWebsite(companyData.website, companyData.email);
            console.dir(websiteData, { depth: Infinity });

            // Zde můžete přidat implementaci pro ukládání metadat o webu
          }

          console.log(`Firma "${companyData.name}" byla úspěšně uložena.`);

          // Malá pauza mezi požadavky
          await this.delay(1000);
        } catch (error) {
          console.error(`Chyba při zpracování firmy s odkazem ${link}:`, error);
        }
      }

      return { success: true, message: `Úspěšně zpracováno ${companyLinks.length} firem.` };
    } catch (error) {
      console.error('Chyba při scrapování firem:', error);
      return { success: false, message: `Nastala chyba: ${error}` };
    } finally {
      await this.browserManager.close();
    }
  }

  /**
   * Extrakce dat o firmě pomocí Google Gemini
   */
  private async extractCompanyDataWithGemini(html: string, link: string): Promise<Business> {
    try {
      const prompt = `
      Extrahuj následující informace o firmě z této Google Maps stránky v HTML:
      - Název firmy
      - Adresa
      - Emailová adresa (pokud je dostupná)
      - Telefonní číslo (pokud je dostupné)
      - Webová stránka (pokud je dostupná)
      - Kategorie firmy (oblasti podnikání)
      - Počet recenzí

      Vrať data ve formátu JSON s těmito klíči:
      id, name, address, email, phone, website, categories (pole stringů), reviewsCount, link

      Jako ID použij unikátní identifikátor z Google Maps URL nebo vygeneruj náhodný řetězec.
      Pro link použij tuto hodnotu: ${link}

      Pokud nějaká informace není dostupná, nastav její hodnotu na null.
      `;

      const result = await model.generateContent(
        prompt + '\n\nHTML content:\n' + html.substring(0, 100000),
      );
      const textResult = result.response.text();

      // Parsování JSON z odpovědi
      const jsonMatch =
        textResult.match(/```json\n([\s\S]*?)\n```/) || textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      throw new Error('Nepodařilo se extrahovat JSON z odpovědi Gemini');
    } catch (error) {
      console.error('Chyba při extrakci dat pomocí Gemini:', error);
      // Vrátíme alespoň základní data
      return {
        id: `gm_${Date.now()}`,
        name: 'Neznámá firma',
        address: 'Neznámá adresa',
        email: null,
        phone: null,
        website: null,
        categories: [],
        reviewsCount: 0,
        link: link,
        scrapedAt: new Date().toISOString(),
      };
    }
  }
  /**
   * Scrapování webové stránky firmy
   */
  private async scrapeWebsite(
    websiteUrl: string,
    existingEmail: string | null,
  ): Promise<WebsiteAnalysisResult> {
    try {
      const browser = this.browserManager.browserInstance;
      if (!browser) throw new Error('Browser není inicializován');

      const newPage = await browser.newPage();
      if (!newPage) throw new Error('Nelze vytvořit novou stránku');

      // Nastavení timeoutu pro načítání stránky
      await newPage.setDefaultNavigationTimeout(30000);

      // Navigace na stránku
      await newPage.goto(websiteUrl, { waitUntil: 'networkidle2' }).catch(() => {
        console.log(
          `Timeout při načítání stránky ${websiteUrl}, pokračujeme s částečně načteným obsahem`,
        );
      });

      // Vytvoření screenshotu
      const screenshotFileName = `${Date.now()}_${websiteUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.png`;
      const screenshotPath = path.join(this.screenshotsDir, screenshotFileName);
      await newPage.screenshot({ path: screenshotPath, fullPage: false });

      // Získání HTML
      const content = await newPage.content();
      const $ = cheerio.load(content);

      // Metadata z webu
      const metadata: Record<string, string> = {};
      $('meta').each((_, el) => {
        const name = $(el).attr('name') || $(el).attr('property');
        const content = $(el).attr('content');
        if (name && content) {
          metadata[name] = content;
        }
      });

      // Hledání emailu, pokud ještě nemáme
      let email = existingEmail;
      if (!email) {
        // Nejprve zkusíme sitemap.xml
        let contactPageUrl = '';
        try {
          const sitemapResponse = await axios.get(`${new URL(websiteUrl).origin}/sitemap.xml`, {
            timeout: 5000,
          });
          const sitemapContent = sitemapResponse.data;
          const sitemapCheerio = cheerio.load(sitemapContent, { xmlMode: true });

          // Hledání stránky s kontakty v sitemap
          sitemapCheerio('url loc').each((_, el) => {
            const url = sitemapCheerio(el).text();
            if (
              url.toLowerCase().includes('contact') ||
              url.toLowerCase().includes('kontakt') ||
              url.toLowerCase().includes('about') ||
              url.toLowerCase().includes('o-nas')
            ) {
              contactPageUrl = url;
              return false; // break
            }
          });
        } catch (error) {
          console.log(`Sitemap.xml nebyl nalezen pro ${websiteUrl}`);
        }

        // Pokud jsme našli kontaktní stránku, zkusíme ji prozkoumat
        if (contactPageUrl) {
          try {
            await newPage.goto(contactPageUrl, { waitUntil: 'networkidle2' }).catch(() => {});
            const contactContent = await newPage.content();
            email = this.extractEmail(contactContent);
          } catch (error) {
            console.log(`Chyba při přístupu na kontaktní stránku ${contactPageUrl}`);
          }
        }

        // Pokud stále nemáme email, zkusíme ho extrahovat z aktuální stránky
        if (!email) {
          email = this.extractEmail(content);
        }
      }

      // Analýza webu pomocí Gemini
      const websiteAnalysis = await this.analyzeWebsiteWithGemini(content, websiteUrl);

      // Zavření stránky
      await newPage.close();

      return {
        metadata,
        email,
        thumbnail: screenshotFileName,
        websiteAnalysis,
      };
    } catch (error) {
      console.error(`Chyba při scrapování webu ${websiteUrl}:`, error);
      return {
        metadata: {},
        email: existingEmail,
        thumbnail: null,
        websiteAnalysis: {
          seoScore: null,
          errors: ['Nepodařilo se analyzovat web'],
          designScore: null,
          modernityScore: null,
          recommendations: ['Proveďte manuální analýzu webu'],
        },
      };
    }
  }

  /**
   * Extrakce emailu z HTML
   */
  private extractEmail(html: string): string | null {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = html.match(emailRegex);

    if (matches && matches.length > 0) {
      // Filtrujeme běžné falešné emaily
      const filteredEmails = matches.filter(
        (email) =>
          !email.includes('example.com') &&
          !email.includes('yourdomain') &&
          !email.includes('domain.com'),
      );

      return filteredEmails.length > 0 ? filteredEmails[0] : null;
    }

    return null;
  }

  /**
   * Analýza webové stránky pomocí Google Gemini
   */
  private async analyzeWebsiteWithGemini(html: string, url: string) {
    try {
      const prompt = `
      Proveď SEO a design analýzu této webové stránky. 
      URL: ${url}
  
      Vrať následující informace ve formátu JSON:
      1. seoScore: Číslo od 0 do 100 hodnotící SEO kvalitu stránky
      2. errors: Pole stringů s nejzávažnějšími chybami na webu (max 5)
      3. designScore: Číslo od 0 do 100 hodnotící design stránky
      4. modernityScore: Číslo od 0 do 100 hodnotící, jak moderní stránka je
      5. recommendations: Pole stringů s doporučeními pro zlepšení (max 5)
  
      Hodnocení by mělo být založeno na:
      - SEO: meta tagy, struktura nadpisů, alt texty u obrázků, URL struktura
      - Design: přehlednost, responzivita, konzistence barev a fontů
      - Modernita: použité technologie, vizuální styl, UX prvky
  
      Analyzuj pouze dostupné informace v HTML.
      `;

      const result = await model.generateContent(
        prompt + '\n\nHTML content:\n' + html.substring(0, 100000),
      );
      const textResult = result.response.text();

      // Parsování JSON z odpovědi
      const jsonMatch =
        textResult.match(/```json\n([\s\S]*?)\n```/) || textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      throw new Error('Nepodařilo se extrahovat JSON z odpovědi Gemini');
    } catch (error) {
      console.error('Chyba při analýze webu pomocí Gemini:', error);
      return {
        seoScore: 0,
        errors: ['Nepodařilo se analyzovat web'],
        designScore: 0,
        modernityScore: 0,
        recommendations: ['Proveďte manuální analýzu webu'],
      };
    }
  }

  /**
   * Pomocná metoda pro zpoždění
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
