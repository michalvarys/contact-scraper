import { ScraperInitParams, ScraperProvider, LogLevel, ScrapedLinkStatus } from '../types/queue';
import AiGoogleMapsScraper from '../AiGoogleMapsScraper';
import { BaseScraper } from '../BaseScraper';
import { FirmyCzScraper } from '../FirmyCzScraper';
import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { ProcessLinkResult, LinkProcessCallback, LogCallback } from '../types/queue';
import { Business } from '../types';
import scraperQueueService from '../services/ScraperQueueService';

/**
 * Wrapper pro BaseScraper, který implementuje rozhraní pro práci s frontou
 */
class BaseScraperWrapper {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  /**
   * Spustí scraper s podporou callbacků pro frontu
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async scrape(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    if (logCallback) {
      await logCallback(`Spouštím scraper s dotazem: ${searchQuery || 'prázdný dotaz'}`);
    }

    // Přepíšeme metody, aby používaly naše callbacky
    const originalSaveToDatabase = this.scraper['saveToDatabase'].bind(this.scraper);
    const originalExtractCompanyLinks = this.scraper['extractCompanyLinks'].bind(this.scraper);

    try {
      // Vytvoříme vlastní implementaci saveToDatabase, která bude volat náš callback
      this.scraper['saveToDatabase'] = async (business: Business) => {
        try {
          // Nejprve zavoláme originální metodu
          await originalSaveToDatabase(business);

          // Poté zavoláme náš callback
          await linkCallback?.(business.link, {
            success: true,
            business,
          });

          await logCallback?.(`Úspěšně zpracována firma: ${business.name} (${business.link})`);
        } catch (error) {
          await logCallback?.(
            `Chyba při ukládání firmy ${business.name} (${business.link}): ${error instanceof Error ? error.message : String(error)}`,
            LogLevel.ERROR,
          );

          // Zavoláme callback s chybou
          await linkCallback?.(business.link, {
            success: false,
            error: error instanceof Error ? error : String(error),
          });
        }
      };

      // Přepíšeme metodu pro extrakci odkazů, abychom mohli logovat
      this.scraper['extractCompanyLinks'] = (html: string) => {
        const links = originalExtractCompanyLinks(html);
        logCallback?.(`Nalezeno ${links.length} odkazů na firmy`);
        return links;
      };

      // Spustíme scraper
      const result = await this.scraper.searchLinks(searchQuery || '');
      await scraperQueueService.initializeLinks(taskId, result);
      const links = await scraperQueueService.getLinks(taskId);

      // Vrátíme výchozí implementace
      this.scraper['saveToDatabase'] = originalSaveToDatabase;
      this.scraper['extractCompanyLinks'] = originalExtractCompanyLinks;

      return links;
    } catch (error) {
      // Vrátíme výchozí implementace v případě chyby
      this.scraper['saveToDatabase'] = originalSaveToDatabase;
      this.scraper['extractCompanyLinks'] = originalExtractCompanyLinks;

      await logCallback?.(
        `Chyba při scrapování: ${error instanceof Error ? error.message : String(error)}`,
        LogLevel.ERROR,
      );

      throw error;
    }
  }

  /**
   * Pokračuje ve scrapování
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    // Zavoláme standardní scrape, jelikož původní scrapery nepodporují pokračování
    await logCallback?.(
      `Pokračuji ve scrapování (restart) s dotazem: ${searchQuery || 'prázdný dotaz'}`,
    );

    return await this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  /**
   * Zpracuje jeden konkrétní odkaz
   * @param link Odkaz ke zpracování
   */
  async scrapeLink(link: string): Promise<Business> {
    return await this.scraper.scrapeLink(link);
  }
}

class FirmyCzScraperWrapper {
  private scraper: FirmyCzScraper;

  constructor(scraper: FirmyCzScraper, params: ScraperInitParams) {
    this.scraper = scraper;
  }

  /**
   * Spustí scraper s podporou callbacků pro frontu
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async scrape(
    taskId: string,
    searchQuery: string = '',
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(`Spouštím AI Google Maps scraper pro průmysl: ${searchQuery}`);

    try {
      if (!searchQuery) {
        throw new Error('Není zadán vyhledávací dotaz');
      }

      const result = await this.scraper.searchLinks(searchQuery);

      await scraperQueueService.initializeLinks(taskId, result);
      const links = await scraperQueueService.getLinks(taskId);

      for (const { link, status } of links) {
        try {
          if (status === ScrapedLinkStatus.PROCESSED) {
            continue;
          }

          const business = await this.scrapeLink(link);
          linkCallback?.(link, { success: true, business });
        } catch (error: any) {
          linkCallback?.(link, { success: false, error: error.message });
        }
      }

      await logCallback?.(`Scrapování dokončeno: získáno ${result.length || 0} odkazů`);

      return result;
    } catch (error) {
      if (logCallback) {
        await logCallback(
          `Chyba při scrapování: ${error instanceof Error ? error.message : String(error)}`,
          LogLevel.ERROR,
        );
      }

      throw error;
    }
  }

  /**
   * Pokračuje ve scrapování
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    // Zavoláme standardní scrape, jelikož původní scrapery nepodporují pokračování
    if (logCallback) {
      await logCallback(`Pokračuji ve scrapování AI Google Maps (restart)`);
    }
    return await this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  /**
   * Zpracuje jeden konkrétní odkaz
   * @param link Odkaz ke zpracování
   */
  async scrapeLink(link: string): Promise<Business> {
    return (await this.scraper.scrapeLink(link)) as unknown as Business;
  }
}

/**
 * Wrapper pro AiGoogleMapsScraper, který implementuje rozhraní pro práci s frontou
 */
class AiGoogleMapsScraperWrapper {
  private scraper: AiGoogleMapsScraper;

  constructor(scraper: AiGoogleMapsScraper, params: ScraperInitParams) {
    this.scraper = scraper;
  }

  /**
   * Spustí scraper s podporou callbacků pro frontu
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async scrape(
    taskId: string,
    searchQuery = '',
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(`Spouštím AI Google Maps scraper pro průmysl: ${searchQuery}`);

    try {
      if (!searchQuery) {
        throw new Error('Není zadán vyhledávací dotaz');
      }

      const result = await this.scraper.searchLinks(searchQuery);

      await scraperQueueService.initializeLinks(taskId, result);
      const links = await scraperQueueService.getLinks(taskId);

      for (const { link, status } of links) {
        try {
          if (status === ScrapedLinkStatus.PROCESSED) {
            continue;
          }

          const business = await this.scrapeLink(link);
          linkCallback?.(link, { success: true, business });
        } catch (error: any) {
          linkCallback?.(link, { success: false, error: error.message });
        }
      }

      await logCallback?.(`Scrapování dokončeno: získáno ${result.length || 0} odkazů`);

      return result;
    } catch (error) {
      if (logCallback) {
        await logCallback(
          `Chyba při scrapování: ${error instanceof Error ? error.message : String(error)}`,
          LogLevel.ERROR,
        );
      }

      throw error;
    }
  }

  /**
   * Pokračuje ve scrapování
   * @param searchQuery Vyhledávací dotaz
   * @param linkCallback Callback pro zpracování odkazu
   * @param logCallback Callback pro logování
   */
  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    // Zavoláme standardní scrape, jelikož původní scrapery nepodporují pokračování
    if (logCallback) {
      await logCallback(`Pokračuji ve scrapování AI Google Maps (restart)`);
    }
    return await this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  /**
   * Zpracuje jeden konkrétní odkaz
   * @param link Odkaz ke zpracování
   */
  async scrapeLink(link: string): Promise<Business> {
    return (await this.scraper.getCompanyDataFromLink(link)) as unknown as Business;
  }
}

/**
 * Poskytovatel pro BaseScraper
 */
export class BaseScraperProvider implements ScraperProvider {
  /**
   * Vytvoří nový scraper na základě konfigurace
   * @param config Konfigurace scraperu
   */
  async createScraper(config: ScraperInitParams): Promise<any> {
    // BaseScraper je abstraktní, ale můžeme ho rozšířit o naše wrappery
    throw new Error('BaseScraper je abstraktní třída a nelze ji přímo instancovat');
  }
}

/**
 * Poskytovatel pro FirmyCzScraper
 */
export class FirmyCzScraperProvider implements ScraperProvider {
  /**
   * Vytvoří nový scraper na základě konfigurace
   * @param config Konfigurace scraperu
   */
  async createScraper(config: ScraperInitParams): Promise<any> {
    const scraper = new FirmyCzScraper({
      baseUrl: config.baseUrl || 'https://www.firmy.cz/',
      headless: config.headless !== false,
    });

    return new FirmyCzScraperWrapper(scraper, config);
  }
}

/**
 * Poskytovatel pro GoogleMapsScraper
 */
export class GoogleMapsScraperProvider implements ScraperProvider {
  /**
   * Vytvoří nový scraper na základě konfigurace
   * @param config Konfigurace scraperu
   */
  async createScraper(config: ScraperInitParams): Promise<any> {
    const scraper = new GoogleMapsScraper({
      baseUrl: config.baseUrl || 'https://www.google.com/maps',
      headless: config.headless !== false,
    });

    return new BaseScraperWrapper(scraper);
  }
}

/**
 * Poskytovatel pro AiGoogleMapsScraper
 */
export class AiGoogleMapsScraperProvider implements ScraperProvider {
  /**
   * Vytvoří nový scraper na základě konfigurace
   * @param config Konfigurace scraperu
   */
  async createScraper(config: ScraperInitParams): Promise<any> {
    const scraper = new AiGoogleMapsScraper(config);
    await scraper.init();

    return new AiGoogleMapsScraperWrapper(scraper, config);
  }
}

// Export poskytovatelů scraperů
export const scraperProviders = {
  FirmyCzScraper: new FirmyCzScraperProvider(),
  GoogleMapsScraper: new GoogleMapsScraperProvider(),
  AiGoogleMapsScraper: new AiGoogleMapsScraperProvider(),
};

export default scraperProviders;
