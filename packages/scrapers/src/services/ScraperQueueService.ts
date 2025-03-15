import { prisma } from '@contact-scraper/db';
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
  private scraperProviders: Map<string, ScraperProvider>;
  private maxConcurrentTasks: number;
  private runningTasks: Set<string>;
  private isProcessing: boolean;
  private queueInterval: NodeJS.Timeout | null;
  private queueIntervalMs: number;

  constructor(concurrency = 1, queueIntervalMs = 5000) {
    this.maxConcurrentTasks = concurrency;
    this.scraperProviders = new Map<string, ScraperProvider>();
    this.runningTasks = new Set<string>();
    this.isProcessing = false;
    this.queueInterval = null;
    this.queueIntervalMs = queueIntervalMs;
  }

  /**
   * Nastaví maximální počet souběžných úloh
   * @param concurrency Maximální počet souběžných úloh
   */
  setMaxConcurrentTasks(concurrency: number): void {
    if (concurrency < 1) {
      throw new Error('Maximální počet souběžných úloh musí být alespoň 1');
    }
    this.maxConcurrentTasks = concurrency;
    console.log(`Maximální počet souběžných úloh nastaven na ${concurrency}`);
  }

  /**
   * Vrátí aktuální maximální počet souběžných úloh
   * @returns Maximální počet souběžných úloh
   */
  getMaxConcurrentTasks(): number {
    return this.maxConcurrentTasks;
  }

  /**
   * Vrátí aktuální počet běžících úloh
   * @returns Počet běžících úloh
   */
  getRunningTasksCount(): number {
    return this.runningTasks.size;
  }

  /**
   * Spustí frontu úloh
   */
  async startQueue(): Promise<void> {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
    }

    // Označení přerušených úloh
    await this.markInterruptedTasks();

    // Automatické pokračování v přerušených úlohách
    await this.resumeInterruptedTasks();

    this.queueInterval = setInterval(() => {
      this.processQueue();
    }, this.queueIntervalMs);

    console.log(`Fronta úloh spuštěna s intervalem ${this.queueIntervalMs}ms`);
  }

  /**
   * Označí úlohy ve stavu RUNNING jako INTERRUPTED
   * Tato metoda by měla být volána při startu serveru
   */
  private async markInterruptedTasks(): Promise<void> {
    try {
      // Získání úloh ve stavu RUNNING
      const runningTasks = await prisma.$transaction(async (prisma) => {
        return await prisma.scraperTask.findMany({
          where: {
            status: ScraperTaskStatus.RUNNING,
          },
        });
      });

      if (runningTasks.length === 0) {
        console.log('Žádné přerušené úlohy nebyly nalezeny');
        return;
      }

      console.log(`Nalezeno ${runningTasks.length} přerušených úloh`);

      // Označení úloh jako INTERRUPTED
      for (const task of runningTasks) {
        await prisma.$transaction(async (prisma) => {
          await prisma.scraperTask.update({
            where: { id: task.id },
            data: {
              status: 'INTERRUPTED',
              updatedAt: new Date(),
            },
          });

          // Přidání logu o přerušení
          await prisma.scraperTaskLog.create({
            data: {
              message: 'Úloha byla přerušena nečekaným ukončením serveru',
              level: LogLevel.WARNING,
              taskId: task.id,
            },
          });
        });

        console.log(`Úloha ${task.id} byla označena jako INTERRUPTED`);
      }
    } catch (error) {
      console.error('Chyba při označování přerušených úloh:', error);
    }
  }

  /**
   * Automaticky pokračuje v přerušených úlohách
   */
  private async resumeInterruptedTasks(): Promise<void> {
    try {
      // Získání úloh ve stavu INTERRUPTED
      const interruptedTasks = await prisma.$transaction(async (prisma) => {
        return await prisma.scraperTask.findMany({
          where: {
            status: 'INTERRUPTED',
          },
        });
      });

      if (interruptedTasks.length === 0) {
        console.log('Žádné přerušené úlohy ke zpracování');
        return;
      }

      console.log(`Pokračování v ${interruptedTasks.length} přerušených úlohách`);

      // Pokračování v úlohách
      for (const task of interruptedTasks) {
        // Spuštění úlohy asynchronně
        this.resumeTask(task.id).catch((error) => {
          console.error(`Chyba při pokračování v úloze ${task.id}:`, error);
        });
      }
    } catch (error) {
      console.error('Chyba při pokračování v přerušených úlohách:', error);
    }
  }

  /**
   * Zastaví frontu úloh
   */
  stopQueue(): void {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
      console.log('Fronta úloh zastavena');
    }
  }

  /**
   * Zpracuje frontu úloh
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    try {
      // Získání úloh ve stavu PENDING
      const pendingTasks = await prisma.scraperTask.findMany({
        where: {
          status: ScraperTaskStatus.PENDING,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: this.maxConcurrentTasks - this.runningTasks.size,
      });

      // Spuštění úloh
      for (const task of pendingTasks) {
        if (this.runningTasks.size < this.maxConcurrentTasks) {
          this.runningTasks.add(task.id);
          // Spuštění úlohy asynchronně
          this.runTask(task.id).catch((error) => {
            console.error(`Chyba při zpracování úlohy ${task.id}:`, error);
            this.runningTasks.delete(task.id);
          });
        }
      }
    } catch (error) {
      console.error('Chyba při zpracování fronty úloh:', error);
    } finally {
      this.isProcessing = false;
    }
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
        result = await scraper.scrape(taskId, task.searchQuery, linkCallback, logCallback);
      } else {
        // Jinak spustíme scraper bez vyhledávacího dotazu
        result = await scraper.scrape(taskId, undefined, linkCallback, logCallback);
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
    } finally {
      // Odstranění úlohy ze seznamu běžících úloh
      this.runningTasks.delete(taskId);
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
   * Pozastaví běžící úlohu
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

    // Odstranění úlohy ze seznamu běžících úloh
    this.runningTasks.delete(taskId);

    // Logování pozastavení
    await this.log({
      message: `Úloha pozastavena`,
      taskId,
      level: LogLevel.INFO,
    });

    return (await this.getTask(taskId)) as ScraperTask;
  }

  async initializeLinks(taskId: string, links: string[] = []) {
    const task = await this.getTask(taskId);
    if (!task) {
      return;
    }

    const existingLink = await prisma.$transaction(async (prisma) => {
      await prisma.scrapedLink.deleteMany({
        where: {
          taskId,
          link: {
            in: links,
          },
          status: {
            not: ScrapedLinkStatus.PROCESSED,
          },
        },
      });

      const existing = await prisma.scrapedLink.findMany({
        where: {
          taskId,
          link: {
            in: links,
          },
        },
      });

      const toCreate = links.filter((link) => !existing.find((el) => el.link === link));
      if (toCreate.length > 0) {
        await prisma.scrapedLink.createMany({
          data: toCreate.map((link) => ({
            link,
            taskId,
            status: ScrapedLinkStatus.PENDING,
          })),
        });
      }

      return await prisma.scrapedLink.findMany({
        where: {
          taskId,
          link: {
            in: links,
          },
        },
      });
    });

    return existingLink;
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

    // Kontrola, zda je úloha ve stavu FAILED, PAUSED nebo INTERRUPTED
    if (
      task.status !== ScraperTaskStatus.FAILED &&
      task.status !== ScraperTaskStatus.PAUSED &&
      task.status !== 'INTERRUPTED'
    ) {
      throw new Error(
        `Úlohu ${taskId} nelze pokračovat, protože není ve stavu FAILED, PAUSED nebo INTERRUPTED`,
      );
    }

    // Aktualizace stavu úlohy
    await this.updateTask(taskId, {
      status: ScraperTaskStatus.RUNNING,
    });

    // Přidání úlohy do seznamu běžících úloh
    this.runningTasks.add(taskId);

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
          if (!result.success) {
            await this.updateLink(existingLink.id, {
              status: ScrapedLinkStatus.FAILED,
              errorMessage:
                result.error instanceof Error ? result.error.message : String(result.error),
            });
            return;
          }

          await this.updateLink(existingLink.id, {
            status: ScrapedLinkStatus.PROCESSED,
            processedAt: new Date(),
            companyId: result.business?.id,
          });
          return;
        }

        // Vytvoření nového odkazu
        const linkRecord = await this.createLink({
          link,
          taskId,
          status: result.success ? ScrapedLinkStatus.PROCESSED : ScrapedLinkStatus.FAILED,
        });

        // Aktualizace stavu odkazu
        if (!result.success) {
          await this.updateLink(linkRecord.id, {
            errorMessage:
              result.error instanceof Error ? result.error.message : String(result.error),
          });
          return;
        }

        await this.updateLink(linkRecord.id, {
          processedAt: new Date(),
          companyId: result.business?.id,
        });
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
      await scraper.continueTask?.(
        taskId,
        task.searchQuery || undefined,
        linkCallback,
        logCallback,
      );

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

      return task as ScraperTask;
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
}

// Export instance služby
export const scraperQueueService = new ScraperQueueService();

// Export pro TypeScript
export default scraperQueueService;
