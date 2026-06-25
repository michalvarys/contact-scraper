import { ScraperInitParams, ScraperProvider, LogLevel, ScrapedLinkStatus } from '../types/queue';
import AiGoogleMapsScraper from '../AiGoogleMapsScraper';
import { BaseScraper } from '../BaseScraper';
import { FirmyCzScraper } from '../FirmyCzScraper';
import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { ZlateStrankyScraper } from '../ZlateStrankyScraper';
import { ProcessLinkResult, LinkProcessCallback, LogCallback } from '../types/queue';
import { Business } from '../types';
import { DatabaseManager } from '../services/DatabaseManager';
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
          const savedBusiness = (await originalSaveToDatabase(business)) as Business | void;
          const businessResult = savedBusiness ?? business;

          // Poté zavoláme náš callback
          await linkCallback?.(businessResult.link, {
            success: true,
            business: businessResult,
          });

          await logCallback?.(
            `Úspěšně zpracována firma: ${businessResult.name} (${businessResult.link})`,
          );
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

class GoogleMapsScraperWrapper {
  private scraper: GoogleMapsScraper;
  private databaseManager: DatabaseManager;

  constructor(scraper: GoogleMapsScraper, params: ScraperInitParams) {
    this.scraper = scraper;
    this.databaseManager = new DatabaseManager();
  }

  private normalizeBusiness(business: Business): Business {
    if (!business.name?.trim()) {
      throw new Error('Cannot save business without name');
    }
    if (!business.address?.trim()) {
      throw new Error('Cannot save business without address');
    }

    const reviewsCount =
      typeof business.reviewsCount === 'string'
        ? parseInt((business.reviewsCount as string).replace(/\D+/g, ''), 10) || 0
        : business.reviewsCount || 0;

    const scrapedAt =
      business.scrapedAt instanceof Date
        ? business.scrapedAt
        : business.scrapedAt
          ? new Date(business.scrapedAt)
          : new Date();

    return {
      ...business,
      reviewsCount,
      scrapedAt,
      categories: business.categories || [],
    };
  }

  private async persistBusiness(business: Business): Promise<Business> {
    const normalized = this.normalizeBusiness(business);
    const saved = await this.databaseManager.saveCompanyData(normalized);
    return (saved as unknown as Business) ?? normalized;
  }

  async scrape(
    taskId: string,
    searchQuery: string = '',
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(`Spouštím Google Maps scraper pro dotaz: ${searchQuery}`);

    try {
      if (!searchQuery) {
        throw new Error('Není zadán vyhledávací dotaz');
      }

      this.scraper.setTaskId(taskId);
      const result = await this.scraper.searchLinks(searchQuery);

      await scraperQueueService.initializeLinks(taskId, result);
      const links = await scraperQueueService.getLinks(taskId);

      for (const { link, status } of links) {
        if (status === ScrapedLinkStatus.PROCESSED) {
          continue;
        }

        try {
          const business = await this.scrapeLink(link);
          linkCallback?.(link, { success: true, business });
        } catch (error: any) {
          await logCallback?.(
            `Chyba při zpracování odkazu ${link}: ${error instanceof Error ? error.message : String(error)}`,
            LogLevel.ERROR,
          );
          linkCallback?.(link, {
            success: false,
            error: error instanceof Error ? error : String(error),
          });
        }
      }

      await logCallback?.(`Scrapování dokončeno: získáno ${result.length || 0} odkazů`);

      return result;
    } catch (error) {
      await logCallback?.(
        `Chyba při scrapování Google Maps: ${error instanceof Error ? error.message : String(error)}`,
        LogLevel.ERROR,
      );
      throw error;
    }
  }

  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(
      `Pokračuji ve scrapování Google Maps (restart) s dotazem: ${searchQuery || 'prázdný dotaz'}`,
    );
    return this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  async scrapeLink(link: string): Promise<Business> {
    const business = await this.scraper.getBusinessData(link);
    return await this.persistBusiness(business);
  }
}

class FirmyCzScraperWrapper {
  private scraper: FirmyCzScraper;
  private databaseManager: DatabaseManager;

  constructor(scraper: FirmyCzScraper, params: ScraperInitParams) {
    this.scraper = scraper;
    this.databaseManager = new DatabaseManager();
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
          const errMsg = error instanceof Error ? error.message : String(error);
          await logCallback?.(
            `Chyba při zpracování odkazu ${link}: ${errMsg}`,
            LogLevel.ERROR,
          );
          linkCallback?.(link, { success: false, error: errMsg });
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

  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    if (logCallback) {
      await logCallback(`Pokračuji ve scrapování AI Google Maps (restart)`);
    }
    return await this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  async scrapeLink(link: string): Promise<Business> {
    const business = await this.scraper.scrapeLink(link) as unknown as Business;
    const saved = await this.databaseManager.saveCompanyData(business);
    return (saved as unknown as Business) ?? business;
  }
}

class AiGoogleMapsScraperWrapper {
  private scraper: AiGoogleMapsScraper;

  constructor(scraper: AiGoogleMapsScraper, params: ScraperInitParams) {
    this.scraper = scraper;
  }

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
          const errMsg = error instanceof Error ? error.message : String(error);
          await logCallback?.(
            `Chyba při zpracování odkazu ${link}: ${errMsg}`,
            LogLevel.ERROR,
          );
          linkCallback?.(link, { success: false, error: errMsg });
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

export class ZlateStrankyScraperWrapper {
  private scraper: ZlateStrankyScraper;

  constructor(scraper: ZlateStrankyScraper, params: ScraperInitParams) {
    this.scraper = scraper;
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
      await logCallback(`Pokračuji ve scrapování ZlateStranky (restart)`);
    }
    return await this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  async scrape(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(`Spouštím ZlateStranky scraper pro dotaz: ${searchQuery}`);

    try {
      if (!searchQuery) {
        throw new Error('Není zadán vyhledávací dotaz');
      }

      const totalLinks = new Set<string>();
      await this.scraper.searchLinks(searchQuery, async (batch) => {
        const newLinks = batch.filter((link) => !totalLinks.has(link));
        if (newLinks.length === 0) {
          return;
        }

        newLinks.forEach((link) => totalLinks.add(link));
        await scraperQueueService.initializeLinks(taskId, newLinks);
        await logCallback?.(
          `Přidán batch ${newLinks.length} odkazů do fronty (celkem ${totalLinks.size})`,
        );
      });

      const links = await scraperQueueService.getLinks(taskId);

      for (const { link, status } of links) {
        try {
          if (status === ScrapedLinkStatus.PROCESSED) {
            continue;
          }

          const business = await this.scrapeLink(link);
          linkCallback?.(link, { success: true, business });
        } catch (error: any) {
          const errMsg = error instanceof Error ? error.message : String(error);
          await logCallback?.(
            `Chyba při zpracování odkazu ${link}: ${errMsg}`,
            LogLevel.ERROR,
          );
          linkCallback?.(link, { success: false, error: errMsg });
        }
      }

      await logCallback?.(`Scrapování dokončeno: získáno ${totalLinks.size || 0} odkazů`);

      return Array.from(totalLinks);
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
   * Zpracuje jeden konkrétní odkaz
   * @param link Odkaz ke zpracování
   */
  async scrapeLink(link: string): Promise<Business> {
    return await this.scraper.scrapeLink(link);
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
      maxPages: config.maxPages,
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

    return new GoogleMapsScraperWrapper(scraper, config);
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

/**
 * Poskytovatel pro ZlateStrankyScraper
 */
export class ZlateStrankyScraperProvider implements ScraperProvider {
  /**
   * Vytvoří nový scraper na základě konfigurace
   * @param config Konfigurace scraperu
   */
  async createScraper(config: ScraperInitParams): Promise<any> {
    const scraper = new ZlateStrankyScraper({
      baseUrl: config.baseUrl || 'https://www.zlatestranky.cz/',
      headless: config.headless !== false,
    });

    return new ZlateStrankyScraperWrapper(scraper, config);
  }
}

import { MultiScraperProvider } from './MultiScraperProvider';

// Export poskytovatelů scraperů
export const scraperProviders = {
  FirmyCzScraper: new FirmyCzScraperProvider(),
  GoogleMapsScraper: new GoogleMapsScraperProvider(),
  AiGoogleMapsScraper: new AiGoogleMapsScraperProvider(),
  ZlateStrankyScraper: new ZlateStrankyScraperProvider(),
  MultiScraper: new MultiScraperProvider(),
};

export default scraperProviders;
