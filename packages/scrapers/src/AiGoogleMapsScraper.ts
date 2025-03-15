import { Business, ScraperOptions } from './types';
import { geminiService, websiteAnalyzer, databaseManager, BrowserManager } from './services';
import * as cheerio from 'cheerio';
import { EmailScraper } from './scrapers/EmailScraper';
import { getEmailFromWebsite } from './tools/email';

// Flag pro sledování stavu Gemini API
let geminiTooManyRequestsError = false;
/**
 * Scraper pro Google Maps s využitím AI pro extrakci dat
 */
export class AiGoogleMapsScraper {
  private browserManager: BrowserManager;
  taskId: string | null = null;

  // Getter pro zjištění stavu Gemini API
  static get geminiTooManyRequestsError(): boolean {
    return geminiTooManyRequestsError;
  }

  // Setter pro nastavení stavu Gemini API
  static set geminiTooManyRequestsError(value: boolean) {
    geminiTooManyRequestsError = value;
  }

  constructor(options: ScraperOptions = { headless: true }) {
    this.browserManager = new BrowserManager(options.headless);
  }
  /**
   * Inicializace scraperu
   */
  async init() {
    try {
      this.browserManager.getPage();
    } catch {
      await this.browserManager.init();
    }
  }

  /**
   * Zavření scraperu
   */
  async close() {
    await this.browserManager.close();
  }

  async searchLinks(query: string) {
    await this.init();

    try {
      // 1. Navštívení Google Maps a vyhledání dotazu
      await this.browserManager.navigateTo('https://www.google.com/maps');
      await this.browserManager.confirmCookiesModal();

      // Vyhledání dotazu
      const page = this.browserManager.getPage();
      await page.waitForSelector('#searchboxinput');
      await page.type('#searchboxinput', query);
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.browserManager.delay(3000);

      // Single record under the query redirects to company page
      const url = page.url();
      const isPlace = url.startsWith('https://www.google.com/maps/place');
      if (isPlace) {
        return [url];
      }

      // 2. Scrollování a získání všech odkazů na firmy
      const companies = await this.browserManager.scrollAndExtractLinks();

      return companies.map((company) => company.link);
    } catch (error) {}
    return [];
  }

  setTaskId(taskId: string) {
    this.taskId = taskId;
  }

  async scrapeLink(link: string) {
    return this.getCompanyDataFromLink(link);
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

  /**
   * Získá data o firmě z odkazu a uloží je do databáze
   * @param link Odkaz na detail firmy v Google Maps
   * @returns Data o firmě
   */
  async getCompanyDataFromLink(link: string) {
    await this.init();

    // Navštívení stránky firmy
    await this.browserManager.navigateTo(link);
    await this.browserManager.confirmCookiesModal();
    await this.browserManager.delay(2000); // Krátké čekání pro načtení obsahu

    // Získání HTML obsahu stránky
    const content = await this.browserManager.getElementContent('[role=main]');

    // Extrakce základních dat o firmě pomocí Gemini
    const companyData = await geminiService.extractCompanyDataFromHtml(content, link);

    // Přidání času scrapování
    companyData.scrapedAt = new Date();

    // Pokud má firma webovou stránku a nemáme problém s Gemini API, získáme z ní další data
    if (companyData.website && !AiGoogleMapsScraper.geminiTooManyRequestsError) {
      // Nejprve zkontrolujeme, zda už existuje analýza pro tuto webovou stránku
      const existingAnalysis = await databaseManager.getExistingWebsiteAnalysis(
        companyData.website,
      );

      // Pokud existuje, použijeme ji, jinak provedeme novou analýzu
      const websiteData = await websiteAnalyzer.analyzeWebsite(
        this.browserManager.getPage(),
        companyData.website,
        companyData.email,
        existingAnalysis,
      );

      // Přidání dat o webové stránce k datům o firmě
      companyData.websiteData = websiteData;
    } else if (AiGoogleMapsScraper.geminiTooManyRequestsError) {
      console.warn('Přeskakuji analýzu webové stránky kvůli chybě Gemini API: Too Many Requests');
    }

    if (!companyData.email && companyData.website) {
      companyData.email = await getEmailFromWebsite(companyData.website);
    }

    // Zpracování a uložení dat do databáze
    const savedCompany = await databaseManager.saveCompanyData(companyData);

    return savedCompany;
  }

  async scrapeCompanies(searchQuery: string) {
    await this.init();

    try {
      // 1. Navštívení Google Maps a vyhledání dotazu
      await this.browserManager.navigateTo('https://www.google.com/maps');
      await this.browserManager.confirmCookiesModal();

      // Vyhledání dotazu
      const page = this.browserManager.getPage();
      await page.waitForSelector('#searchboxinput');
      await page.type('#searchboxinput', searchQuery);
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.browserManager.delay(3000);

      // 2. Scrollování a získání všech odkazů na firmy
      const companies = await this.browserManager.scrollAndExtractLinks();
      console.log(`Nalezeno ${companies.length} firem`);

      // 3. Procházení jednotlivých firem a extrakce dat
      for (const company of companies) {
        try {
          let companyData: Record<string, any> = company;
          if (!('name' in company) || !company.name) {
            // Navštívení stránky firmy
            await this.browserManager.navigateTo(company.link);
            await this.browserManager.delay(2000); // Krátké čekání pro načtení obsahu

            // Získání HTML obsahu stránky
            const content = await this.browserManager.getElementContent('[role=main]');
            // companyData = await geminiService.extractCompanyDataFromHtml(content, company.link);
            // Extrakce základních dat o firmě pomocí Gemini
            companyData = {
              ...companyData,
              ...(await this.scrapeBusinessDetails(content, company.link)),
            };
          } else {
            companyData = company;
            // Pokud nemáme email, telefon nebo web, zkusíme je získat z webu pomocí Gemini
          }

          // Přidání času scrapování
          companyData.scrapedAt = new Date();

          // Pokud má firma webovou stránku a nemáme problém s Gemini API, získáme z ní další data
          if (companyData.website && !AiGoogleMapsScraper.geminiTooManyRequestsError) {
            // Nejprve zkontrolujeme, zda už existuje analýza pro tuto webovou stránku
            const existingAnalysis = await databaseManager.getExistingWebsiteAnalysis(
              companyData.website,
            );

            const websiteData = await websiteAnalyzer.analyzeWebsite(
              this.browserManager.getPage(),
              companyData.website,
              companyData.email,
              existingAnalysis,
            );

            // Přidání dat o webové stránce k datům o firmě
            companyData.websiteData = websiteData;
          } else if (AiGoogleMapsScraper.geminiTooManyRequestsError) {
            console.warn(
              'Přeskakuji analýzu webové stránky kvůli chybě Gemini API: Too Many Requests',
            );
          }

          if (!companyData.email && companyData.website) {
            companyData.email = await getEmailFromWebsite(companyData.website);
          }

          // Zpracování a uložení dat do databáze
          await databaseManager.saveCompanyData(companyData);
        } catch (error) {
          console.error(`Chyba při zpracování firmy s odkazem ${company.link}:`, error);
        }
      }

      return { success: true, message: `Úspěšně zpracováno ${companies.length} firem.` };
    } catch (error) {
      console.error('Chyba při scrapování firem:', error);
      return { success: false, message: `Nastala chyba: ${error}` };
    }
  }

  protected async scrapeBusinessDetails(content: string, link: string): Promise<Business> {
    try {
      // Use cheerio to parse the HTML
      const $ = cheerio.load(content);

      // Helper to get text content safely
      const getText = (selector: string): string => {
        return $(selector).text().trim() || '';
      };

      // Helper to extract address
      const getAddress = (): string => {
        // Look for address in the button that appears when you click to copy it
        let address = '';
        $('button').each((i: number, el: any) => {
          const ariaLabel = $(el).attr('aria-label');
          if (ariaLabel && ariaLabel.includes('Adresa:')) {
            address = ariaLabel.replace('Adresa:', '').trim();
            return false; // break the loop
          }
        });
        return address;
      };

      // Helper to extract phone
      const getPhone = (): string | null => {
        // Try to find phone in tel: links
        const phoneLink = $('a[href^="tel:"]').attr('href');
        if (phoneLink) {
          return phoneLink.replace('tel:', '').trim();
        }

        // Try to find phone in data-item-id
        const phoneText = $('[data-item-id^="phone"]').text().trim();
        if (phoneText) {
          return phoneText;
        }

        // Look for phone button
        let phoneNumber = null;
        $('button').each((i: number, el: any) => {
          const ariaLabel = $(el).attr('aria-label') || '';
          if (ariaLabel && /Telefon:|Volat/.test(ariaLabel)) {
            const match = ariaLabel.match(/(?:Telefon:|Volat)[:\s]*([+\d\s()-]+)/);
            if (match) {
              phoneNumber = match[1].trim();
              return false; // break the loop
            }
          }
        });

        return phoneNumber;
      };

      // Helper to extract website
      const getWebsite = (): string | null => {
        // website that doesn't have google in the url
        const website = $('[data-item-id="authority"]').attr('href');
        if (website && !website.includes('google')) {
          return website;
        }

        let websiteUrl = null;
        $('[role=region] a[href]').each((i: number, el: any) => {
          const href = $(el).attr('href')?.split('?').shift();
          if (
            href &&
            !href.includes('google') &&
            !href.startsWith('/maps') &&
            !href.startsWith('tel:')
          ) {
            websiteUrl = href;
            return false; // break the loop
          }
        });

        return websiteUrl;
      };

      // Helper to extract email
      const getEmail = (): string | null => {
        // Look for email in text content
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
        const allText = $('body').text();
        const match = allText.match(emailRegex);
        return match ? match[0] : null;
      };

      // Helper to extract rating
      const getRating = (): string | null => {
        const ratingElement = $('[aria-label*="hvězdičkami"]');
        if (ratingElement.length) {
          const ariaLabel = ratingElement.attr('aria-label') || '';
          const match = ariaLabel.match(/[\d,\.]+/);
          return match ? match[0] : null;
        }
        return null;
      };

      // Helper to extract reviews count
      const getReviewsCount = (): number => {
        const reviewsElement = $('[aria-label*="recenzí"]');
        if (reviewsElement.length) {
          const reviewsText = reviewsElement.attr('aria-label') || '';
          const match = reviewsText.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }
        return 0;
      };

      // Helper to extract categories
      const getCategories = (): string[] => {
        // Categories are usually in a button near the heading
        const categoryButton = $('button.DkEaL');
        return categoryButton.length ? [categoryButton.text().trim()] : [];
      };

      // Create business object
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: getText('h1'),
        address: getAddress() || '',
        email: getEmail(),
        phone: getPhone(),
        website: getWebsite(),
        rating: getRating() ?? undefined,
        reviewsCount: getReviewsCount(),
        categories: getCategories(),
        link: link,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error scraping details for ${link}:`, error);
      // Return minimal business object in case of error
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: '',
        address: '',
        email: null,
        phone: null,
        website: null,
        link: link,
        reviewsCount: 0,
        scrapedAt: new Date().toISOString(),
      };
    }
  }
}

export default AiGoogleMapsScraper;
