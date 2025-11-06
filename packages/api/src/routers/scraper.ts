import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma, ScraperTaskStatus, ScrapedLinkStatus } from '@contact-scraper/db';
import queueService from '@contact-scraper/scrapers/src/services/ScraperQueueService';
import { getEmailFromWebsite } from '@contact-scraper/scrapers/src/tools/email';

// Enum pro stavy úloh
export { ScraperTaskStatus, ScrapedLinkStatus };

export const scraperRouter = router({
  getScraperTypes: publicProcedure.query(async () => {
    return ['GoogleMapsScraper', 'FirmyCzScraper', 'AiGoogleMapsScraper', 'ZlateStrankyScraper'];
  }),

  getEmailFromWebsite: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(async ({ input }) => {
      return getEmailFromWebsite(input.url);
    }),

  createTask: publicProcedure
    .input(
      z.object({
        scraperType: z.string(),
        scraperConfig: z.record(z.any()),
        searchQuery: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.scraperTask.create({
        data: {
          scraperType: input.scraperType,
          scraperConfig:
            typeof input.scraperConfig === 'string'
              ? input.scraperConfig
              : JSON.stringify(input.scraperConfig),
          searchQuery: input.searchQuery,
          status: ScraperTaskStatus.PENDING,
        },
      });
    }),

  getTasks: publicProcedure
    .input(
      z.object({
        status: z.nativeEnum(ScraperTaskStatus).optional(),
      }),
    )
    .query(async ({ input }) => {
      return prisma.scraperTask.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          scrapedLinks: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

  getTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const task = await prisma.scraperTask.findUnique({
        where: { id: input.id },
        include: {
          scrapedLinks: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return task;
    }),

  getTaskLinks: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      // Nejprve získáme všechny odkazy
      const links = await prisma.scrapedLink.findMany({
        where: { taskId: input.taskId },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Pro každý odkaz, který má companyId, získáme informace o firmě
      const linksWithCompanyInfo = await Promise.all(
        links.map(async (link) => {
          if (link.companyId) {
            const company = await prisma.company.findUnique({
              where: { id: link.companyId },
              select: {
                id: true,
                name: true,
              },
            });
            return { ...link, company };
          }
          return { ...link, company: null };
        }),
      );

      return linksWithCompanyInfo;
    }),

  getTaskLogs: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return prisma.scraperTaskLog.findMany({
        where: { taskId: input.taskId },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

  runTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.scraperTask.update({
        where: { id: input.id },
        data: { status: ScraperTaskStatus.RUNNING },
      });
    }),

  pauseTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.scraperTask.update({
        where: { id: input.id },
        data: { status: ScraperTaskStatus.PAUSED },
      });
    }),

  resumeTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await queueService.resumeTask(input.id);
      return prisma.scraperTask.update({
        where: { id: input.id },
        data: { status: ScraperTaskStatus.RUNNING },
      });
    }),

  retryFailedLinks: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.scrapedLink.updateMany({
        where: {
          taskId: input.taskId,
          status: ScraperTaskStatus.FAILED,
        },
        data: {
          status: ScraperTaskStatus.PENDING,
          processedAt: null,
        },
      });

      return prisma.scraperTask.update({
        where: { id: input.taskId },
        data: { status: ScraperTaskStatus.RUNNING },
      });
    }),

  processLink: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        link: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      queueService.processLink(input.taskId, input.link);
      return prisma.scrapedLink.updateMany({
        where: {
          taskId: input.taskId,
          link: input.link,
        },
        data: {
          status: ScrapedLinkStatus.RUNNING,
        },
      });
    }),

  updateTaskConfig: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        config: z.record(z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.scraperTask.update({
        where: { id: input.taskId },
        data: {
          scraperConfig:
            typeof input.config === 'string' ? input.config : JSON.stringify(input.config),
        },
      });
    }),

  duplicateTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const task = await prisma.scraperTask.findFirst({
        where: {
          id: input.taskId,
        },
      });
      if (!task) return null;

      return prisma.scraperTask.create({
        data: {
          scraperType: task.scraperType,
          scraperConfig: task.scraperConfig,
          status: ScraperTaskStatus.PAUSED,
          searchQuery: task.searchQuery,
        },
      });
    }),

  deleteTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Nejprve smažeme všechny odkazy a logy spojené s úlohou
      await prisma.scrapedLink.deleteMany({
        where: { taskId: input.taskId },
      });

      await prisma.scraperTaskLog.deleteMany({
        where: { taskId: input.taskId },
      });

      // Nakonec smažeme samotnou úlohu
      return prisma.scraperTask.delete({
        where: { id: input.taskId },
      });
    }),

  getLinkData: publicProcedure
    .input(
      z.object({
        linkId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      // Najdeme odkaz
      const link = await prisma.scrapedLink.findUnique({
        where: { id: input.linkId },
      });

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found',
        });
      }

      // Pokud má odkaz přiřazenou společnost, získáme její data
      if (link.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: link.companyId },
          include: {
            metadata: true,
            categories: true,
          },
        });

        return { link, company };
      }

      // Pokud nemá přiřazenou společnost, vrátíme jen odkaz
      return { link, company: null };
    }),

  addLink: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        link: z.string().url(),
      }),
    )
    .mutation(async ({ input }) => {
      // Kontrola, zda úloha existuje
      const task = await prisma.scraperTask.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Kontrola, zda odkaz již neexistuje
      const existingLink = await prisma.scrapedLink.findFirst({
        where: {
          taskId: input.taskId,
          link: input.link,
        },
      });

      if (existingLink) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Link already exists for this task',
        });
      }

      // Přidání nového odkazu
      return prisma.scrapedLink.create({
        data: {
          taskId: input.taskId,
          link: input.link,
          status: ScrapedLinkStatus.PENDING,
        },
      });
    }),

  rescrapLink: publicProcedure
    .input(
      z.object({
        linkId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Najdeme odkaz
      const link = await prisma.scrapedLink.findUnique({
        where: { id: input.linkId },
      });

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found',
        });
      }

      // Resetujeme stav odkazu na PENDING a vymažeme companyId, pokud existuje
      await prisma.scrapedLink.update({
        where: { id: input.linkId },
        data: {
          status: ScrapedLinkStatus.PENDING,
          companyId: null,
          processedAt: null,
          errorMessage: null,
        },
      });

      // Spustíme zpracování odkazu
      queueService.processLink(link.taskId, link.link);

      return prisma.scrapedLink.update({
        where: { id: input.linkId },
        data: {
          status: ScrapedLinkStatus.RUNNING,
        },
      });
    }),
});
