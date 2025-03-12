import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma, ScraperTaskStatus, ScrapedLinkStatus } from '@contact-scraper/db';

// Enum pro stavy úloh
export { ScraperTaskStatus, ScrapedLinkStatus };

export const scraperRouter = router({
  getScraperTypes: publicProcedure.query(async () => {
    return ['GoogleMapsScraper', 'FirmyCzScraper'];
  }),

  createTask: publicProcedure
    .input(
      z.object({
        scraperType: z.string(),
        scraperConfig: z.record(z.any()),
        industry: z.string().optional(),
        region: z.string().optional(),
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
          industry: input.industry,
          region: input.region,
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
      return prisma.scrapedLink.findMany({
        where: { taskId: input.taskId },
        orderBy: {
          createdAt: 'desc',
        },
      });
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
});
