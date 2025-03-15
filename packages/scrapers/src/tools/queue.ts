import { ScraperTaskStatus } from '@contact-scraper/db';
import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { FirmyCzScraper } from '../FirmyCzScraper';
import { prisma } from './mockDb';
import AiGoogleMapsScraper from '../AiGoogleMapsScraper';
import { ScraperConfig } from './scraperQueue';
import { Business } from '../types';

export class ScraperQueue {
  private static instance: ScraperQueue;
  private isProcessing: boolean = false;
  private currentTask: string | null = null;

  private constructor() {}

  public static getInstance(): ScraperQueue {
    if (!ScraperQueue.instance) {
      ScraperQueue.instance = new ScraperQueue();
    }
    return ScraperQueue.instance;
  }

  private async createScraper(type: string, config: ScraperConfig) {
    switch (type) {
      case 'GoogleMapsScraper':
        return new GoogleMapsScraper(config);
      case 'FirmyCzScraper':
        return new FirmyCzScraper(config);
      case 'AiGoogleMapScraper':
        return new AiGoogleMapsScraper(config);
      default:
        throw new Error(`Unknown scraper type: ${type}`);
    }
  }

  private async log(taskId: string, level: 'INFO' | 'WARNING' | 'ERROR', message: string) {
    await prisma.scraperLog.create({
      data: {
        taskId,
        level,
        message,
      },
    });
  }

  private async updateTaskStatus(taskId: string, status: ScraperTaskStatus, errorMessage?: string) {
    await prisma.scraperTask.update({
      where: { id: taskId },
      data: {
        status,
        errorMessage,
        ...(status === ScraperTaskStatus.RUNNING ? { startedAt: new Date() } : {}),
        ...(status === ScraperTaskStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
  }

  private async processTask(taskId: string) {
    try {
      const task = await prisma.scraperTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      await this.updateTaskStatus(taskId, ScraperTaskStatus.RUNNING);
      await this.log(taskId, 'INFO', 'Starting task processing');

      //@ts-ignore
      const scraper = await this.createScraper(task.scraperType, task.scraperConfig);
      scraper.setTaskId(taskId);

      // Inicializace scraperu
      await scraper.init();
      await this.log(taskId, 'INFO', 'Scraper initialized');

      // Vyhledání a uložení odkazů
      const searchQuery = task.searchQuery || '';
      const links = await scraper.searchLinks(searchQuery);
      await this.log(taskId, 'INFO', `Found ${links.length} links`);

      // Uložení odkazů do databáze
      await prisma.scrapedLink.createMany({
        //@ts-ignore
        data: links.map((link) => ({
          taskId,
          link,
          status: ScraperTaskStatus.PENDING,
          processedAt: null,
        })),
        skipDuplicates: true,
      });

      // Zpracování jednotlivých odkazů
      const scrapedLinks = await prisma.scrapedLink.findMany({
        where: { taskId },
      });

      for (const link of scrapedLinks) {
        // Kontrola, zda úloha nebyla pozastavena nebo zrušena
        const updatedTask = await prisma.scraperTask.findUnique({
          where: { id: taskId },
        });

        if (updatedTask?.status === ScraperTaskStatus.PAUSED) {
          await this.log(taskId, 'INFO', 'Task paused');
          return;
        }

        try {
          // Aktualizace stavu odkazu na RUNNING
          await prisma.scrapedLink.update({
            where: { id: link.id },
            data: { status: ScraperTaskStatus.RUNNING },
          });

          // Získání dat z odkazu
          const baseData = await scraper.scrapeLink(link.link);
          const data = scraper.enrichBusinessData(baseData as Business, link.link);

          // Uložení získaných dat
          await prisma.business.create({
            data: {
              ...data,
              taskId,
              sourceLink: link.link,
              name: data.name || 'Unknown',
            },
          });

          // Aktualizace stavu odkazu na PROCESSED
          await prisma.scrapedLink.update({
            where: { id: link.id },
            data: {
              status: ScraperTaskStatus.PROCESSED,
              processedAt: new Date(),
            },
          });

          await this.log(taskId, 'INFO', `Successfully processed link: ${link.link}`);
        } catch (error) {
          await prisma.scrapedLink.update({
            where: { id: link.id },
            data: {
              status: ScraperTaskStatus.FAILED,
              processedAt: new Date(),
            },
          });

          await this.log(
            taskId,
            'ERROR',
            `Failed to process link ${link.link}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Uzavření scraperu
      await scraper.close();
      await this.log(taskId, 'INFO', 'Scraper closed');

      // Kontrola, zda všechny odkazy byly úspěšně zpracovány
      const failedLinks = await prisma.scrapedLink.count({
        where: {
          taskId,
          status: ScraperTaskStatus.FAILED,
        },
      });

      if (failedLinks > 0) {
        await this.updateTaskStatus(
          taskId,
          ScraperTaskStatus.FAILED,
          `Failed to process ${failedLinks} links`,
        );
      } else {
        await this.updateTaskStatus(taskId, ScraperTaskStatus.COMPLETED);
      }
    } catch (error) {
      await this.updateTaskStatus(
        taskId,
        ScraperTaskStatus.FAILED,
        error instanceof Error ? error.message : String(error),
      );
      await this.log(
        taskId,
        'ERROR',
        `Task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.currentTask = null;
      this.isProcessing = false;
    }
  }

  public async processNextTask() {
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      // Najít další úlohu ke zpracování
      const nextTask = await prisma.scraperTask.findFirst({
        where: {
          status: {
            in: [ScraperTaskStatus.PENDING, ScraperTaskStatus.RUNNING],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!nextTask) {
        this.isProcessing = false;
        return;
      }

      this.currentTask = nextTask.id;
      await this.processTask(nextTask.id);
    } catch (error) {
      console.error('Failed to process next task:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  public async pauseTask(taskId: string) {
    if (this.currentTask === taskId) {
      await this.updateTaskStatus(taskId, ScraperTaskStatus.PAUSED);
      this.currentTask = null;
      this.isProcessing = false;
    }
  }

  public async resumeTask(taskId: string) {
    const task = await prisma.scraperTask.findUnique({
      where: { id: taskId },
    });

    if (
      task &&
      (task.status === ScraperTaskStatus.PAUSED || task.status === ScraperTaskStatus.FAILED)
    ) {
      await this.updateTaskStatus(taskId, ScraperTaskStatus.PENDING);
      if (!this.isProcessing) {
        await this.processNextTask();
      }
    }
  }

  public async retryFailedLinks(taskId: string) {
    await prisma.scrapedLink.updateMany({
      where: {
        taskId,
        status: ScraperTaskStatus.FAILED,
      },
      data: {
        status: ScraperTaskStatus.PENDING,
        processedAt: null,
      },
    });

    await this.updateTaskStatus(taskId, ScraperTaskStatus.PENDING);
    if (!this.isProcessing) {
      await this.processNextTask();
    }
  }

  public async processLink(taskId: string, link: string) {
    const task = await prisma.scraperTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    //@ts-ignore
    const scraper = await this.createScraper(task.scraperType, task.scraperConfig);
    scraper.setTaskId(taskId);
    await scraper.init();

    try {
      const baseData = await scraper.scrapeLink(link);
      const data = scraper.enrichBusinessData(baseData as Business, link);

      await prisma.business.create({
        data: {
          ...data,
          taskId,
          sourceLink: link,
          name: data.name || 'Unknown',
        },
      });

      await prisma.scrapedLink.update({
        where: {
          taskId_link: {
            taskId,
            link,
          },
        },
        data: {
          status: ScraperTaskStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      await this.log(taskId, 'INFO', `Successfully processed link: ${link}`);
    } catch (error) {
      await prisma.scrapedLink.update({
        where: {
          taskId_link: {
            taskId,
            link,
          },
        },
        data: {
          status: ScraperTaskStatus.FAILED,
          processedAt: new Date(),
        },
      });

      await this.log(
        taskId,
        'ERROR',
        `Failed to process link ${link}: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw error;
    } finally {
      await scraper.close();
    }
  }
}
