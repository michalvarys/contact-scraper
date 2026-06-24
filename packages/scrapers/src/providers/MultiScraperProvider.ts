import { ScraperInitParams, ScraperProvider, LogLevel, ScrapedLinkStatus } from '../types/queue';
import { FirmyCzScraper } from '../FirmyCzScraper';
import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { ZlateStrankyScraper } from '../ZlateStrankyScraper';
import { ProcessLinkResult, LinkProcessCallback, LogCallback } from '../types/queue';
import { Business } from '../types';
import { DatabaseManager } from '../services/DatabaseManager';
import scraperQueueService from '../services/ScraperQueueService';

type ScraperSource = 'firmy.cz' | 'zlatestranky.cz' | 'google-maps';

class MultiScraperWrapper {
  private databaseManager: DatabaseManager;
  private headless: boolean;

  constructor(params: ScraperInitParams) {
    this.databaseManager = new DatabaseManager();
    this.headless = params.headless !== false;
  }

  async scrape(
    taskId: string,
    searchQuery: string = '',
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    if (!searchQuery) {
      throw new Error('Není zadán vyhledávací dotaz');
    }

    await logCallback?.(`Spouštím MultiScraper pro dotaz: "${searchQuery}"`, LogLevel.INFO);
    await logCallback?.(`Prohledávám: Firmy.cz, Zlaté stránky, Google Maps`, LogLevel.INFO);

    const allLinks = new Map<string, ScraperSource>();

    const scrapers = [
      { name: 'Firmy.cz' as const, source: 'firmy.cz' as ScraperSource, create: () => new FirmyCzScraper({ headless: this.headless }) },
      { name: 'Zlaté stránky' as const, source: 'zlatestranky.cz' as ScraperSource, create: () => new ZlateStrankyScraper({ headless: this.headless }) },
      { name: 'Google Maps' as const, source: 'google-maps' as ScraperSource, create: () => new GoogleMapsScraper({ headless: this.headless }) },
    ];

    const searchResults = await Promise.allSettled(
      scrapers.map(async ({ name, source, create }) => {
        const scraper = create();
        try {
          await logCallback?.(`[${name}] Hledám odkazy...`, LogLevel.INFO);

          const links = await scraper.searchLinks(searchQuery);
          await logCallback?.(`[${name}] Nalezeno ${links.length} odkazů`, LogLevel.INFO);

          return { source, links, scraper, name };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await logCallback?.(`[${name}] Chyba při hledání: ${msg}`, LogLevel.ERROR);
          try { await scraper.close(); } catch {}
          return { source, links: [] as string[], scraper: null, name };
        }
      }),
    );

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        for (const link of result.value.links) {
          if (!allLinks.has(link)) {
            allLinks.set(link, result.value.source);
          }
        }
      }
    }

    const totalLinks = allLinks.size;
    await logCallback?.(`Celkem nalezeno ${totalLinks} unikátních odkazů ze všech scraperů`, LogLevel.INFO);

    if (totalLinks === 0) {
      await logCallback?.(`Žádné odkazy nenalezeny`, LogLevel.WARNING);
      return [];
    }

    // Close all search-phase scrapers — they'll be stale for detail pages
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.scraper) {
        try { await result.value.scraper.close(); } catch {}
      }
    }

    const linkArray = Array.from(allLinks.keys());
    await scraperQueueService.initializeLinks(taskId, linkArray);

    const links = await scraperQueueService.getLinks(taskId);

    // Create fresh scraper instances for detail scraping
    const scraperInstances = new Map<ScraperSource, { scraper: any; name: string }>();
    const sourceNames: Record<ScraperSource, string> = {
      'firmy.cz': 'Firmy.cz',
      'zlatestranky.cz': 'Zlaté stránky',
      'google-maps': 'Google Maps',
    };

    for (const { link, status } of links) {
      if (status === ScrapedLinkStatus.PROCESSED) continue;

      const source = allLinks.get(link);
      if (!source) continue;

      // Create scraper instance on demand for this source
      if (!scraperInstances.has(source)) {
        scraperInstances.set(source, {
          scraper: this.createScraperForSource(source),
          name: sourceNames[source],
        });
      }

      const instance = scraperInstances.get(source)!;

      try {
        const business = await this.scrapeLinkWithSource(link, source, instance.scraper);
        await linkCallback?.(link, { success: true, business });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logCallback?.(`[${instance.name}] Chyba: ${link} — ${msg}`, LogLevel.ERROR);
        await linkCallback?.(link, { success: false, error: msg });
      }
    }

    for (const { scraper } of scraperInstances.values()) {
      try { await scraper.close(); } catch {}
    }

    await logCallback?.(`MultiScraper dokončen: ${totalLinks} odkazů zpracováno`, LogLevel.INFO);
    return linkArray;
  }

  async continueTask(
    taskId: string,
    searchQuery?: string,
    linkCallback?: LinkProcessCallback,
    logCallback?: LogCallback,
  ): Promise<any> {
    await logCallback?.(`Pokračuji ve scrapování MultiScraper (restart)`);
    return this.scrape(taskId, searchQuery, linkCallback, logCallback);
  }

  async scrapeLink(link: string): Promise<Business> {
    const source = this.detectSource(link);
    const scraper = this.createScraperForSource(source);

    try {
      const business = await this.scrapeLinkWithSource(link, source, scraper);
      return business;
    } finally {
      try { await scraper.close(); } catch {}
    }
  }

  private detectSource(link: string): ScraperSource {
    if (link.includes('firmy.cz')) return 'firmy.cz';
    if (link.includes('zlatestranky.cz')) return 'zlatestranky.cz';
    if (link.includes('google.com/maps')) return 'google-maps';
    return 'firmy.cz';
  }

  private createScraperForSource(source: ScraperSource): any {
    switch (source) {
      case 'firmy.cz':
        return new FirmyCzScraper({ headless: this.headless });
      case 'zlatestranky.cz':
        return new ZlateStrankyScraper({ headless: this.headless });
      case 'google-maps':
        return new GoogleMapsScraper({ headless: this.headless });
    }
  }

  private async scrapeLinkWithSource(
    link: string,
    source: ScraperSource,
    scraper: any,
  ): Promise<Business> {
    switch (source) {
      case 'firmy.cz': {
        const business = await (scraper as FirmyCzScraper).scrapeLink(link) as unknown as Business;
        const saved = await this.databaseManager.saveCompanyData(business);
        return (saved as unknown as Business) ?? business;
      }
      case 'zlatestranky.cz': {
        // ZlateStrankyScraper.scrapeLink already saves to DB internally
        return await (scraper as ZlateStrankyScraper).scrapeLink(link);
      }
      case 'google-maps': {
        const business = await (scraper as GoogleMapsScraper).getBusinessData(link);
        const saved = await this.databaseManager.saveCompanyData(business);
        return (saved as unknown as Business) ?? business;
      }
    }
  }
}

export class MultiScraperProvider implements ScraperProvider {
  async createScraper(config: ScraperInitParams): Promise<any> {
    return new MultiScraperWrapper(config);
  }
}
