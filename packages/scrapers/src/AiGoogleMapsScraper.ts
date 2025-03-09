import { Business, WebsiteAnalysisResult } from './types';
import { geminiService, websiteAnalyzer, databaseManager, BrowserManager } from './services';

/**
 * Scraper pro Google Maps s využitím AI pro extrakci dat
 */
class AiGoogleMapsScraper {
  private browserManager: BrowserManager;
  constructor() {
    this.browserManager = new BrowserManager();
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

  /**
   * Získá data o firmě z odkazu a uloží je do databáze
   * @param link Odkaz na detail firmy v Google Maps
   * @param industryName Volitelný název odvětví
   * @param regionName Volitelný název regionu
   * @returns Data o firmě
   */
  async getCompanyDataFromLink(link: string, industryName?: string, regionName?: string) {
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

    // Pokud má firma webovou stránku, získáme z ní další data
    if (companyData.website) {
      const websiteData = await websiteAnalyzer.analyzeWebsite(
        this.browserManager.getPage(),
        companyData.website,
        companyData.email,
      );

      // Přidání dat o webové stránce k datům o firmě
      companyData.websiteData = websiteData;
    }

    // Zpracování a uložení dat do databáze
    const savedCompany = await databaseManager.saveCompanyData(
      companyData,
      industryName,
      regionName,
    );

    return savedCompany;
  }

  /**
   * Hlavní metoda pro získávání dat o firmách podle oboru a regionu
   */
  async scrapeCompanies(industry: string, region: string) {
    await this.init();

    try {
      // 1. Navštívení Google Maps a vyhledání dotazu
      const searchQuery = `${industry} ${region}`;
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

      const companyLinks = companies.map((company) => company.link);

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

            // Extrakce základních dat o firmě pomocí Gemini
            companyData = await geminiService.extractCompanyDataFromHtml(content, company.link);
          } else {
            companyData = company;
            // Pokud nemáme email, telefon nebo web, zkusíme je získat z webu pomocí Gemini
            if (!companyData.email && !companyData.phone && !companyData.website) {
              try {
                // Navštívení webu firmy
                await this.browserManager.navigateTo(company.link);
                await this.browserManager.delay(2000);

                // Získání HTML obsahu webu
                const websiteContent = await this.browserManager.getElementContent('body');

                // Extrakce kontaktních údajů pomocí Gemini
                const websiteContactData = await geminiService.extractCompanyDataFromHtml(
                  websiteContent,
                  companyData.website,
                );

                // Doplnění chybějících údajů
                if (!companyData.email && websiteContactData.email) {
                  companyData.email = websiteContactData.email;
                }
                if (!companyData.phone && websiteContactData.phone) {
                  companyData.phone = websiteContactData.phone;
                }
                if (!companyData.website && websiteContactData.website) {
                  companyData.website = websiteContactData.website;
                }
              } catch (error) {
                console.error('Chyba při získávání kontaktních údajů z webu:', error);
              }
            }
          }

          // Přidání času scrapování
          companyData.scrapedAt = new Date();

          // Pokud má firma webovou stránku, získáme z ní další data
          if (companyData.website) {
            const websiteData = await websiteAnalyzer.analyzeWebsite(
              this.browserManager.getPage(),
              companyData.website,
              companyData.email,
            );

            // Přidání dat o webové stránce k datům o firmě
            companyData.websiteData = websiteData;
          }

          // Zpracování a uložení dat do databáze
          await databaseManager.saveCompanyData(companyData, industry, region);
        } catch (error) {
          console.error(`Chyba při zpracování firmy s odkazem ${company.link}:`, error);
        }
      }

      return { success: true, message: `Úspěšně zpracováno ${companyLinks.length} firem.` };
    } catch (error) {
      console.error('Chyba při scrapování firem:', error);
      return { success: false, message: `Nastala chyba: ${error}` };
    }
  }
}

export default AiGoogleMapsScraper;
