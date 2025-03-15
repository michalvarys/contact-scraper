import { LogLevel, PrismaClient, ScrapedLinkStatus, ScraperTaskStatus } from '@contact-scraper/db';
import { FirmyCzScraper } from '../FirmyCzScraper';
import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { AiGoogleMapsScraper } from '../AiGoogleMapsScraper';
import { BaseScraper } from '../BaseScraper';
import { Business } from '../types';

// Rozšířené rozhraní pro scraper používaný v queue
interface QueueScraper extends BaseScraper {
  search(query: string): Promise<string[]>;
  scrape(link: string): Promise<Business>;
}

// Typy pro scraper providery
type ScraperConstructor = new (config: any) => QueueScraper;

// Typ pro konfiguraci scraperu
export interface ScraperConfig {
  baseUrl?: string;
  headless?: boolean;
  [key: string]: any;
}

// Rozhraní pro vytvoření úlohy scraperu
export interface CreateScraperTaskInput {
  scraperType: string;
  scraperConfig: ScraperConfig;
  searchQuery?: string;
}

// Napojení na databázi
const prisma = new PrismaClient();

// Nastavení poskytovatelů scraperů
export const scraperProviders: { [key: string]: ScraperConstructor } = {
  FirmyCzScraper: FirmyCzScraper as unknown as ScraperConstructor,
  GoogleMapsScraper: GoogleMapsScraper as unknown as ScraperConstructor,
  AiGoogleMapsScraper: AiGoogleMapsScraper as unknown as ScraperConstructor,
};

// Vytvoření nové úlohy scraperu
export async function createScraperTask(input: CreateScraperTaskInput) {
  const config =
    typeof input.scraperConfig === 'string'
      ? input.scraperConfig
      : JSON.stringify(input.scraperConfig);

  return await prisma.scraperTask.create({
    data: {
      scraperType: input.scraperType,
      scraperConfig: config,
      status: ScraperTaskStatus.PENDING,
      searchQuery: input.searchQuery,
    },
  });
}

// Získání všech úloh
export async function getScraperTasks(status?: ScraperTaskStatus) {
  const filter = status ? { where: { status } } : {};
  //@ts-ignore
  return await prisma.scraperTask.findMany({
    ...filter,
    include: {
      scrapedLinks: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Získání konkrétní úlohy
export async function getScraperTask(id: string) {
  return await prisma.scraperTask.findUnique({
    where: { id },
    include: {
      scrapedLinks: true,
    },
  });
}

// Aktualizace úlohy
export async function updateScraperTask(id: string, data: any) {
  return await prisma.scraperTask.update({
    where: { id },
    data,
  });
}

// Spuštění úlohy
export async function runScraperTask(id: string) {
  // Nalezení úlohy
  const task = await prisma.scraperTask.findUnique({
    where: { id },
  });

  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }

  // Kontrola, že úloha může být spuštěna
  if (task.status === ScraperTaskStatus.RUNNING) {
    throw new Error('Task is already running');
  }

  // Aktualizace stavu úlohy
  await prisma.scraperTask.update({
    where: { id },
    data: {
      status: ScraperTaskStatus.RUNNING,
      startedAt: new Date(),
      errorMessage: null,
    },
  });

  // Vytvoření instance scraperu
  const ScraperClass = scraperProviders[task.scraperType];
  if (!ScraperClass) {
    await prisma.scraperTask.update({
      where: { id },
      data: {
        status: ScraperTaskStatus.FAILED,
        errorMessage: `Unknown scraper type: ${task.scraperType}`,
      },
    });
    throw new Error(`Unknown scraper type: ${task.scraperType}`);
  }

  // Spuštění scraperu v asynchronním režimu
  setTimeout(async () => {
    try {
      const config =
        typeof task.scraperConfig === 'string'
          ? JSON.parse(task.scraperConfig)
          : task.scraperConfig;

      const scraper = new ScraperClass(config);

      // Log spuštění
      await prisma.scraperTaskLog.create({
        data: {
          taskId: task.id,
          level: LogLevel.INFO,
          message: `Starting scraper ${task.scraperType}`,
        },
      });

      // Vyhledání odkazů
      let searchQuery = task.searchQuery;

      if (!searchQuery) {
        await prisma.scraperTask.update({
          where: { id: task.id },
          data: {
            status: ScraperTaskStatus.FAILED,
            errorMessage: 'No search query provided',
          },
        });
        return;
      }

      // Zahájení vyhledávání
      try {
        await prisma.scraperTaskLog.create({
          data: {
            taskId: task.id,
            level: LogLevel.INFO,
            message: `Searching for: ${searchQuery}`,
          },
        });

        const links = await scraper.search(searchQuery);

        // Uložení nalezených odkazů
        for (const link of links) {
          try {
            await prisma.scrapedLink.create({
              data: {
                taskId: task.id,
                link,
                status: ScrapedLinkStatus.PENDING,
              },
            });
          } catch (error: any) {
            // Pokud odkaz již existuje, přeskočit
            console.error(`Failed to save link ${link}:`, error);
          }
        }

        await prisma.scraperTaskLog.create({
          data: {
            taskId: task.id,
            level: LogLevel.INFO,
            message: `Found ${links.length} links`,
          },
        });
      } catch (error: any) {
        await prisma.scraperTaskLog.create({
          data: {
            taskId: task.id,
            level: LogLevel.ERROR,
            message: `Error during search: ${error.message}`,
          },
        });

        await prisma.scraperTask.update({
          where: { id: task.id },
          data: {
            status: ScraperTaskStatus.FAILED,
            errorMessage: `Error during search: ${error.message}`,
          },
        });
        return;
      }

      // Získání všech odkazů ke zpracování
      const linksToProccess = await prisma.scrapedLink.findMany({
        where: {
          taskId: task.id,
          status: ScrapedLinkStatus.PENDING,
        },
      });

      // Zpracování jednotlivých odkazů
      for (const link of linksToProccess) {
        // Kontrola, zda úloha nebyla zastavena
        const currentTask = await prisma.scraperTask.findUnique({
          where: { id: task.id },
        });

        if (currentTask?.status !== ScraperTaskStatus.RUNNING) {
          return;
        }

        try {
          await prisma.scraperTaskLog.create({
            data: {
              taskId: task.id,
              level: LogLevel.INFO,
              message: `Processing link: ${link.link}`,
            },
          });

          // Zpracování odkazu
          const result = await scraper.scrape(link.link);

          if (result) {
            // Uložení výsledku
            await prisma.scrapedLink.update({
              where: { id: link.id },
              data: {
                status: ScrapedLinkStatus.PROCESSED,
                processedAt: new Date(),
                // @ts-ignore
                metadata: JSON.stringify(result),
              },
            });

            // Uložení detailů o firmě
            if (result.name) {
              try {
                await prisma.company.create({
                  data: {
                    ...result,
                    scrapedAt: new Date(),
                    address: result.address || '',
                    categories: result.categories?.length
                      ? {
                          connectOrCreate: result.categories.map((name) => ({
                            create: {
                              name,
                            },
                            where: {
                              name,
                            },
                          })),
                        }
                      : undefined,
                    link: link.link,
                  },
                });
              } catch (error: any) {
                await prisma.scraperTaskLog.create({
                  data: {
                    taskId: task.id,
                    level: LogLevel.WARNING,
                    message: `Failed to save business data: ${error.message}`,
                  },
                });
              }
            }
          } else {
            await prisma.scrapedLink.update({
              where: { id: link.id },
              data: {
                status: ScrapedLinkStatus.SKIPPED,
                processedAt: new Date(),
              },
            });
          }
        } catch (error: any) {
          await prisma.scraperTaskLog.create({
            data: {
              taskId: task.id,
              level: LogLevel.ERROR,
              message: `Error processing link ${link.link}: ${error.message}`,
            },
          });

          await prisma.scrapedLink.update({
            where: { id: link.id },
            data: {
              status: ScrapedLinkStatus.FAILED,
              processedAt: new Date(),
              errorMessage: error.message,
            },
          });
        }
      }

      // Dokončení úlohy
      await prisma.scraperTask.update({
        where: { id: task.id },
        data: {
          status: ScraperTaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await prisma.scraperTaskLog.create({
        data: {
          taskId: task.id,
          level: LogLevel.INFO,
          message: 'Task completed successfully',
        },
      });
    } catch (error: any) {
      await prisma.scraperTaskLog.create({
        data: {
          taskId: task.id,
          level: LogLevel.ERROR,
          message: `Task failed: ${error.message}`,
        },
      });

      await prisma.scraperTask.update({
        where: { id: task.id },
        data: {
          status: ScraperTaskStatus.FAILED,
          errorMessage: error.message,
        },
      });
    }
  }, 0);

  return await prisma.scraperTask.findUnique({
    where: { id },
    include: {
      scrapedLinks: true,
    },
  });
}

// Pozastavení úlohy
export async function pauseScraperTask(id: string) {
  return await prisma.scraperTask.update({
    where: { id },
    data: {
      status: ScraperTaskStatus.PAUSED,
    },
  });
}

// Pokračování v úloze
export async function resumeScraperTask(id: string) {
  return await runScraperTask(id);
}

// Zpracování konkrétního odkazu
export async function processLink(taskId: string, linkUrl: string) {
  // Nalezení odkazu
  const link = await prisma.scrapedLink.findFirst({
    where: {
      taskId,
      link: linkUrl,
    },
  });

  if (!link) {
    throw new Error(`Link ${linkUrl} not found for task ${taskId}`);
  }

  // Nalezení úlohy
  const task = await prisma.scraperTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error(`Task with id ${taskId} not found`);
  }

  // Vytvoření instance scraperu
  const ScraperClass = scraperProviders[task.scraperType];
  if (!ScraperClass) {
    throw new Error(`Unknown scraper type: ${task.scraperType}`);
  }

  try {
    // Log zpracování
    await prisma.scraperTaskLog.create({
      data: {
        taskId,
        level: LogLevel.INFO,
        message: `Processing link: ${linkUrl}`,
      },
    });

    const config =
      typeof task.scraperConfig === 'string' ? JSON.parse(task.scraperConfig) : task.scraperConfig;

    const scraper = new ScraperClass(config);

    // Zpracování odkazu
    const result = await scraper.scrape(linkUrl);

    if (result) {
      // Uložení výsledku
      await prisma.scrapedLink.update({
        where: { id: link.id },
        data: {
          status: ScrapedLinkStatus.PROCESSED,
          processedAt: new Date(),
          //@ts-ignore
          metadata: JSON.stringify(result),
        },
      });

      // Uložení detailů o firmě
      if (result.name) {
        try {
          await prisma.company.upsert({
            where: {
              link: linkUrl,
            },
            //@ts-ignore
            update: result.id ? result : undefined,

            //@ts-ignore
            create: !result.id
              ? {
                  ...result,
                  name: result.name || '',
                  link: linkUrl,
                }
              : undefined,
          });
        } catch (error: any) {
          await prisma.scraperTaskLog.create({
            data: {
              taskId,
              level: LogLevel.WARNING,
              message: `Failed to save business data: ${error.message}`,
            },
          });
        }
      }

      return { success: true, business: result };
    } else {
      await prisma.scrapedLink.update({
        where: { id: link.id },
        data: {
          status: ScrapedLinkStatus.SKIPPED,
          processedAt: new Date(),
        },
      });

      return { success: true };
    }
  } catch (error: any) {
    await prisma.scraperTaskLog.create({
      data: {
        taskId,
        level: LogLevel.ERROR,
        message: `Error processing link ${linkUrl}: ${error.message}`,
      },
    });

    await prisma.scrapedLink.update({
      where: { id: link.id },
      data: {
        status: ScrapedLinkStatus.FAILED,
        processedAt: new Date(),
        errorMessage: error.message,
      },
    });

    return { success: false, error: error };
  }
}

// Opakování selhavších odkazů
export async function retryFailedLinks(taskId: string) {
  // Nalezení selhavších odkazů
  const failedLinks = await prisma.scrapedLink.findMany({
    where: {
      taskId,
      status: ScrapedLinkStatus.FAILED,
    },
  });

  // Aktualizace stavu odkazů
  await prisma.scrapedLink.updateMany({
    where: {
      taskId,
      status: ScrapedLinkStatus.FAILED,
    },
    data: {
      status: ScrapedLinkStatus.PENDING,
      processedAt: null,
      errorMessage: null,
    },
  });

  // Resetování stavu úlohy, pokud je ve failed stavu
  const task = await prisma.scraperTask.findUnique({
    where: { id: taskId },
  });

  if (task?.status === ScraperTaskStatus.FAILED) {
    await prisma.scraperTask.update({
      where: { id: taskId },
      data: {
        status: ScraperTaskStatus.PENDING,
        errorMessage: null,
      },
    });
  }

  return failedLinks.length;
}

// Získání odkazů úlohy
export async function getTaskLinks(taskId: string, status?: ScrapedLinkStatus) {
  const filter = status ? { where: { taskId, status } } : { where: { taskId } };

  //@ts-ignore
  return await prisma.scrapedLink.findMany({
    ...filter,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Získání logů úlohy
export async function getTaskLogs(taskId: string, level?: LogLevel) {
  const filter = level ? { where: { taskId, level } } : { where: { taskId } };

  //@ts-ignore
  return await prisma.scraperTaskLog.findMany({
    ...filter,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export default {
  createScraperTask,
  getScraperTasks,
  getScraperTask,
  updateScraperTask,
  runScraperTask,
  pauseScraperTask,
  resumeScraperTask,
  processLink,
  retryFailedLinks,
  getTaskLinks,
  getTaskLogs,
};
