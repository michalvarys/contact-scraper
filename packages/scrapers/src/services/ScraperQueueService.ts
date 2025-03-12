import { prisma } from '@contact-scraper/db';
import { TaskQueue } from '../tools/queue';
import {
  ScraperTaskStatus,
  ScrapedLinkStatus,
  LogLevel,
  ScraperTask,
  ScrapedLink,
  ScraperTaskLog,
  CreateScraperTaskParams,
  UpdateScraperTaskParams,
  CreateScrapedLinkParams,
  UpdateScrapedLinkParams,
  CreateScraperTaskLogParams,
  ProcessLinkResult,
  LinkProcessCallback,
  LogCallback,
  ScraperInitParams,
  ScraperProvider,
} from '../types/queue';
import { Business } from '../types';

/**
 * Služba pro správu fronty úloh scraperů
 */
export class ScraperQueueService {
  private queue: TaskQueue;
  private scraperProviders: Map<string, ScraperProvider>;

  constructor(concurrency = 1) {
    this.queue = new TaskQueue(concurrency);
    this.scraperProviders = new Map<string, ScraperProvider>();
  }

  /**
   * Registruje poskytovatele scraperu pro daný typ
   * @param type Typ scraperu
   * @param provider Poskytovatel scraperu
   */
  registerScraperProvider(type: string, provider: ScraperProvider): void {
    this.scraperProviders.set(type, provider);
  }

  /**
   * Vytvoří novou úlohu scraperu
   * @param params Parametry pro vytvoření úlohy
   * @returns Vytvořená úloha
   */
  async createTask(params: CreateScraperTaskParams): Promise<ScraperTask> {
    const configJson =
      typeof params.scraperConfig === 'string'
        ? params.scraperConfig
        : JSON.stringify(params.scraperConfig);

    const task = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTask.create({
        data: {
          scraperType: params.scraperType,
          scraperConfig: configJson,
          searchQuery: params.searchQuery,
          industry: params.industry,
          region: params.region,
        },
        include: {
          scrapedLinks: true,
          logs: true,
        },
      });
    });

    // Přidáme informaci o vytvoření úlohy do logů
    await this.log({
      message: `Vytvořena nová úloha typu ${params.scraperType}`,
      taskId: task.id,
      level: LogLevel.INFO,
    });

    return task as unknown as ScraperTask;
  }

  /**
   * Aktualizuje stav úlohy scraperu
   * @param taskId ID úlohy
   * @param params Parametry pro aktualizaci
   * @returns Aktualizovaná úloha
   */
  async updateTask(taskId: string, params: UpdateScraperTaskParams): Promise<ScraperTask> {
    const task = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTask.update({
        where: { id: taskId },
        data: {
          status: params.status,
          startedAt: params.startedAt,
          completedAt: params.completedAt,
          errorMessage: params.errorMessage,
          updatedAt: new Date(),
        },
        include: {
          scrapedLinks: true,
          logs: true,
        },
      });
    });

    // Logování změny stavu
    if (params.status) {
      await this.log({
        message: `Změna stavu úlohy na ${params.status}`,
        taskId,
        level: LogLevel.INFO,
      });
    }

    // Logování chyby
    if (params.errorMessage) {
      await this.log({
        message: `Chyba úlohy: ${params.errorMessage}`,
        taskId,
        level: LogLevel.ERROR,
      });
    }

    return task as unknown as ScraperTask;
  }

  /**
   * Získá úlohu podle ID
   * @param taskId ID úlohy
   * @returns Úloha s příslušným ID
   */
  async getTask(taskId: string): Promise<ScraperTask | null> {
    const task = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTask.findUnique({
        where: { id: taskId },
        include: {
          scrapedLinks: true,
          logs: true,
        },
      });
    });

    return task as unknown as ScraperTask;
  }

  /**
   * Získá seznam úloh podle stavu
   * @param status Stav úloh
   * @returns Seznam úloh v daném stavu
   */
  async getTasks(status?: ScraperTaskStatus): Promise<ScraperTask[]> {
    const where = status ? { status } : {};

    const tasks = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTask.findMany({
        where,
        include: {
          scrapedLinks: true,
          logs: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    return tasks as unknown as ScraperTask[];
  }

  /**
   * Vytvoří nový odkaz ke zpracování
   * @param params Parametry pro vytvoření odkazu
   * @returns Vytvořený odkaz
   */
  async createLink(params: CreateScrapedLinkParams): Promise<ScrapedLink> {
    // Kontrola, zda již odkaz pro tento task neexistuje
    const existingLink = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.findFirst({
        where: {
          link: params.link,
          taskId: params.taskId,
        },
      });
    });

    if (existingLink) {
      return existingLink as unknown as ScrapedLink;
    }

    const link = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.create({
        data: {
          link: params.link,
          status: params.status || ScrapedLinkStatus.PENDING,
          taskId: params.taskId,
        },
      });
    });

    return link as unknown as ScrapedLink;
  }

  /**
   * Aktualizuje stav odkazu
   * @param linkId ID odkazu
   * @param params Parametry pro aktualizaci
   * @returns Aktualizovaný odkaz
   */
  async updateLink(linkId: string, params: UpdateScrapedLinkParams): Promise<ScrapedLink> {
    const link = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.update({
        where: { id: linkId },
        data: {
          status: params.status,
          processedAt: params.processedAt,
          errorMessage: params.errorMessage,
          companyId: params.companyId,
          updatedAt: new Date(),
        },
      });
    });

    // Pokud je odkaz označen jako zpracovaný, aktualizujeme čas zpracování
    if (params.status === ScrapedLinkStatus.PROCESSED && !params.processedAt) {
      return (await prisma.$transaction(async (prisma) => {
        return await prisma.scrapedLink.update({
          where: { id: linkId },
          data: {
            processedAt: new Date(),
          },
        });
      })) as unknown as ScrapedLink;
    }

    return link as unknown as ScrapedLink;
  }

  /**
   * Získá odkaz podle ID
   * @param linkId ID odkazu
   * @returns Odkaz s příslušným ID
   */
  async getLink(linkId: string): Promise<ScrapedLink | null> {
    const link = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.findUnique({
        where: { id: linkId },
      });
    });

    return link as unknown as ScrapedLink;
  }

  /**
   * Získá odkazy pro danou úlohu podle stavu
   * @param taskId ID úlohy
   * @param status Stav odkazů
   * @returns Seznam odkazů v daném stavu
   */
  async getLinks(taskId: string, status?: ScrapedLinkStatus): Promise<ScrapedLink[]> {
    const where = {
      taskId,
      ...(status ? { status } : {}),
    };

    const links = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.findMany({
        where,
        orderBy: {
          createdAt: 'asc',
        },
      });
    });

    return links as unknown as ScrapedLink[];
  }

  /**
   * Vytvoří nový log pro úlohu
   * @param params Parametry pro vytvoření logu
   * @returns Vytvořený log
   */
  async log(params: CreateScraperTaskLogParams): Promise<ScraperTaskLog> {
    const log = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTaskLog.create({
        data: {
          message: params.message,
          level: params.level || LogLevel.INFO,
          taskId: params.taskId,
        },
      });
    });

    return log as unknown as ScraperTaskLog;
  }

  /**
   * Získá logy pro danou úlohu
   * @param taskId ID úlohy
   * @param level Úroveň logů
   * @returns Seznam logů
   */
  async getLogs(taskId: string, level?: LogLevel): Promise<ScraperTaskLog[]> {
    const where = {
      taskId,
      ...(level ? { level } : {}),
    };

    const logs = await prisma.$transaction(async (prisma) => {
      return await prisma.scraperTaskLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    return logs as unknown as ScraperTaskLog[];
  }

  /**
   * Spustí zpracování úlohy scraperu
   * @param taskId ID úlohy
   * @returns Výsledek zpracování úlohy
   */
  async runTask(taskId: string): Promise<ScraperTask> {
    // Získání úlohy
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Úloha ${taskId} nebyla nalezena`);
    }

    // Kontrola, zda není úloha již spuštěna
    if (task.status === ScraperTaskStatus.RUNNING) {
      throw new Error(`Úloha ${taskId} již běží`);
    }

    // Aktualizace stavu úlohy
    await this.updateTask(taskId, {
      status: ScraperTaskStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      // Získání poskytovatele scraperu
      const provider = this.scraperProviders.get(task.scraperType);
      if (!provider) {
        throw new Error(`Poskytovatel scraperu typu ${task.scraperType} není registrován`);
      }

      // Parsování konfigurace scraperu
      const config: ScraperInitParams =
        typeof task.scraperConfig === 'string'
          ? JSON.parse(task.scraperConfig)
          : task.scraperConfig;

      // Přidání průmyslu a regionu do konfigurace, pokud existují
      if (task.industry) {
        config.industry = task.industry;
      }
      if (task.region) {
        config.region = task.region;
      }

      // Vytvoření scraperu
      const scraper = await provider.createScraper(config);

      // Definice callback funkcí pro scraper
      const logCallback: LogCallback = async (message, level = LogLevel.INFO) => {
        await this.log({
          message,
          level,
          taskId,
        });
      };

      const linkCallback: LinkProcessCallback = async (link, result) => {
        // Hledání existujícího odkazu
        const existingLink = await prisma.$transaction(async (prisma) => {
          return await prisma.scrapedLink.findFirst({
            where: {
              link,
              taskId,
            },
          });
        });

        if (existingLink) {
          // Aktualizace stavu existujícího odkazu
          if (result.success) {
            await this.updateLink(existingLink.id, {
              status: ScrapedLinkStatus.PROCESSED,
              processedAt: new Date(),
              companyId: result.business?.id,
            });
          } else {
            await this.updateLink(existingLink.id, {
              status: ScrapedLinkStatus.FAILED,
              errorMessage:
                result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        } else {
          // Vytvoření nového odkazu
          const linkRecord = await this.createLink({
            link,
            taskId,
            status: result.success ? ScrapedLinkStatus.PROCESSED : ScrapedLinkStatus.FAILED,
          });

          // Aktualizace stavu odkazu
          if (result.success) {
            await this.updateLink(linkRecord.id, {
              processedAt: new Date(),
              companyId: result.business?.id,
            });
          } else {
            await this.updateLink(linkRecord.id, {
              errorMessage:
                result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        }
      };

      // Spuštění scraperu
      let result;
      if (task.searchQuery) {
        // Pokud je definován vyhledávací dotaz, použijeme jej
        result = await scraper.scrape(task.searchQuery, linkCallback, logCallback);
      } else {
        // Jinak spustíme scraper bez vyhledávacího dotazu
        result = await scraper.scrape(undefined, linkCallback, logCallback);
      }

      // Aktualizace stavu úlohy
      await this.updateTask(taskId, {
        status: ScraperTaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // Logování úspěšného dokončení
      await this.log({
        message: `Úloha úspěšně dokončena: ${JSON.stringify(result)}`,
        taskId,
        level: LogLevel.INFO,
      });

      return (await this.getTask(taskId)) as ScraperTask;
    } catch (error) {
      // Aktualizace stavu úlohy v případě chyby
      await this.updateTask(taskId, {
        status: ScraperTaskStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      });

      // Logování chyby
      await this.log({
        message: `Chyba při zpracování úlohy: ${error instanceof Error ? error.message : String(error)}`,
        taskId,
        level: LogLevel.ERROR,
      });

      throw error;
    }
  }

  /**
   * Zpracuje konkrétní odkaz v rámci úlohy
   * @param taskId ID úlohy
   * @param link Odkaz ke zpracování
   * @returns Výsledek zpracování odkazu
   */
  async processLink(taskId: string, link: string): Promise<ProcessLinkResult> {
    // Získání úlohy
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Úloha ${taskId} nebyla nalezena`);
    }

    // Kontrola existence odkazu
    const existingLink = await prisma.$transaction(async (prisma) => {
      return await prisma.scrapedLink.findFirst({
        where: {
          link,
          taskId,
        },
      });
    });

    let linkId: string;
    if (existingLink) {
      linkId = existingLink.id;
      // Aktualizace stavu na zpracovávání
      await this.updateLink(linkId, {
        status: ScrapedLinkStatus.PENDING,
      });
    } else {
      // Vytvoření nového odkazu
      const newLink = await this.createLink({
        link,
        taskId,
      });
      linkId = newLink.id;
    }

    try {
      // Získání poskytovatele scraperu
      const provider = this.scraperProviders.get(task.scraperType);
      if (!provider) {
        throw new Error(`Poskytovatel scraperu typu ${task.scraperType} není registrován`);
      }

      // Parsování konfigurace scraperu
      const config: ScraperInitParams =
        typeof task.scraperConfig === 'string'
          ? JSON.parse(task.scraperConfig)
          : task.scraperConfig;

      // Přidání průmyslu a regionu do konfigurace, pokud existují
      if (task.industry) {
        config.industry = task.industry;
      }
      if (task.region) {
        config.region = task.region;
      }

      // Vytvoření scraperu
      const scraper = await provider.createScraper(config);

      // Zpracování odkazu
      const business = (await scraper.scrapeLink(link)) as Business;

      // Aktualizace stavu odkazu
      await this.updateLink(linkId, {
        status: ScrapedLinkStatus.PROCESSED,
        processedAt: new Date(),
        companyId: business.id,
      });

      // Logování úspěšného zpracování
      await this.log({
        message: `Odkaz ${link} úspěšně zpracován`,
        taskId,
        level: LogLevel.INFO,
      });

      return {
        success: true,
        business,
      };
    } catch (error) {
      // Aktualizace stavu odkazu v případě chyby
      await this.updateLink(linkId, {
        status: ScrapedLinkStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Logování chyby
      await this.log({
        message: `Chyba při zpracování odkazu ${link}: ${error instanceof Error ? error.message : String(error)}`,
        taskId,
        level: LogLevel.ERROR,
      });

      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Znovu spustí zpracování selhavších odkazů v rámci úlohy
   * @param taskId ID úlohy
   * @returns Počet zpracovaných odkazů
   */
  async retryFailedLinks(taskId: string): Promise<number> {
    // Získání úlohy
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Úloha ${taskId} nebyla nalezena`);
    }

    // Získání selhavších odkazů
    const failedLinks = await this.getLinks(taskId, ScrapedLinkStatus.FAILED);
    if (failedLinks.length === 0) {
      return 0;
    }

    // Logování začátku opakování
    await this.log({
      message: `Opakování zpracování ${failedLinks.length} selhavších odkazů`,
      taskId,
      level: LogLevel.INFO,
    });

    // Zpracování každého odkazu
    let successCount = 0;
    for (const link of failedLinks) {
      try {
        const result = await this.processLink(taskId, link.link);
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        // Logování chyby
        await this.log({
          message: `Chyba při opakování zpracování odkazu ${link.link}: ${error instanceof Error ? error.message : String(error)}`,
          taskId,
          level: LogLevel.ERROR,
        });
      }
    }

    // Logování výsledku
    await this.log({
      message: `Opakování zpracování dokončeno: ${successCount} z ${failedLinks.length} úspěšně zpracováno`,
      taskId,
      level: LogLevel.INFO,
    });

    return successCount;
  }

  /**
   * Pokračuje v přerušené úloze
   * @param taskId ID úlohy
   * @returns Aktualizovaná úloha
   */
  async resumeTask(taskId: string): Promise<ScraperTask> {
    // Získání úlohy
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Úloha ${taskId} nebyla nalezena`);
    }

    // Kontrola, zda je úloha ve stavu FAILED nebo PAUSED
    if (task.status !== ScraperTaskStatus.FAILED && task.status !== ScraperTaskStatus.PAUSED) {
      throw new Error(`Úlohu ${taskId} nelze pokračovat, protože není ve stavu FAILED nebo PAUSED`);
    }

    // Aktualizace stavu úlohy
    await this.updateTask(taskId, {
      status: ScraperTaskStatus.RUNNING,
    });

    // Logování pokračování
    await this.log({
      message: `Pokračování v úloze`,
      taskId,
      level: LogLevel.INFO,
    });

    // Získání nezpracovaných odkazů
    const pendingLinks = await this.getLinks(taskId, ScrapedLinkStatus.PENDING);

    // Restart zpracování selhavších odkazů
    await this.retryFailedLinks(taskId);

    try {
      // Získání poskytovatele scraperu
      const provider = this.scraperProviders.get(task.scraperType);
      if (!provider) {
        throw new Error(`Poskytovatel scraperu typu ${task.scraperType} není registrován`);
      }

      // Parsování konfigurace scraperu
      const config: ScraperInitParams =
        typeof task.scraperConfig === 'string'
          ? JSON.parse(task.scraperConfig)
          : task.scraperConfig;

      // Přidání průmyslu a regionu do konfigurace, pokud existují
      if (task.industry) {
        config.industry = task.industry;
      }
      if (task.region) {
        config.region = task.region;
      }

      // Vytvoření scraperu
      const scraper = await provider.createScraper(config);

      // Definice callback funkcí pro scraper
      const logCallback: LogCallback = async (message, level = LogLevel.INFO) => {
        await this.log({
          message,
          level,
          taskId,
        });
      };

      const linkCallback: LinkProcessCallback = async (link, result) => {
        // Hledání existujícího odkazu
        const existingLink = await prisma.$transaction(async (prisma) => {
          return await prisma.scrapedLink.findFirst({
            where: {
              link,
              taskId,
            },
          });
        });

        if (existingLink) {
          // Aktualizace stavu existujícího odkazu
          if (result.success) {
            await this.updateLink(existingLink.id, {
              status: ScrapedLinkStatus.PROCESSED,
              processedAt: new Date(),
              companyId: result.business?.id,
            });
          } else {
            await this.updateLink(existingLink.id, {
              status: ScrapedLinkStatus.FAILED,
              errorMessage:
                result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        } else {
          // Vytvoření nového odkazu
          const linkRecord = await this.createLink({
            link,
            taskId,
            status: result.success ? ScrapedLinkStatus.PROCESSED : ScrapedLinkStatus.FAILED,
          });

          // Aktualizace stavu odkazu
          if (result.success) {
            await this.updateLink(linkRecord.id, {
              processedAt: new Date(),
              companyId: result.business?.id,
            });
          } else {
            await this.updateLink(linkRecord.id, {
              errorMessage:
                result.error instanceof Error ? result.error.message : String(result.error),
            });
          }
        }
      };

      // Pokračování ve zpracování nezpracovaných odkazů
      if (pendingLinks.length > 0) {
        for (const link of pendingLinks) {
          try {
            await this.processLink(taskId, link.link);
          } catch (error) {
            // Logování chyby
            await this.log({
              message: `Chyba při zpracování odkazu ${link.link}: ${error instanceof Error ? error.message : String(error)}`,
              taskId,
              level: LogLevel.ERROR,
            });
          }
        }
      }

      // Spuštění scraperu pro případné dokončení
      if (task.searchQuery) {
        // Pokud je definován vyhledávací dotaz, použijeme jej
        await scraper.continueTask(task.searchQuery, linkCallback, logCallback);
      } else {
        // Jinak spustíme scraper bez vyhledávacího dotazu
        await scraper.continueTask(undefined, linkCallback, logCallback);
      }

      // Aktualizace stavu úlohy
      await this.updateTask(taskId, {
        status: ScraperTaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // Logování úspěšného dokončení
      await this.log({
        message: `Úloha úspěšně dokončena po pokračování`,
        taskId,
        level: LogLevel.INFO,
      });

      return (await this.getTask(taskId)) as ScraperTask;
    } catch (error) {
      // Aktualizace stavu úlohy v případě chyby
      await this.updateTask(taskId, {
        status: ScraperTaskStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Logování chyby
      await this.log({
        message: `Chyba při pokračování v úloze: ${error instanceof Error ? error.message : String(error)}`,
        taskId,
        level: LogLevel.ERROR,
      });

      throw error;
    }
  }

  /**
   * Pozastavení běžící úlohy
   * @param taskId ID úlohy
   * @returns Aktualizovaná úloha
   */
  async pauseTask(taskId: string): Promise<ScraperTask> {
    // Získání úlohy
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Úloha ${taskId} nebyla nalezena`);
    }

    // Kontrola, zda je úloha ve stavu RUNNING
    if (task.status !== ScraperTaskStatus.RUNNING) {
      throw new Error(`Úlohu ${taskId} nelze pozastavit, protože není ve stavu RUNNING`);
    }

    // Aktualizace stavu úlohy
    await this.updateTask(taskId, {
      status: ScraperTaskStatus.PAUSED,
    });

    // Logování pozastavení
    await this.log({
      message: `Úloha pozastavena`,
      taskId,
      level: LogLevel.INFO,
    });

    return (await this.getTask(taskId)) as ScraperTask;
  }
}

// Export instance služby
export const scraperQueueService = new ScraperQueueService();

// Export pro TypeScript
export default scraperQueueService;
