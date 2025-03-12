import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
// Importujeme nástroje z balíčku scrapers
import scraperQueue, {
  ScraperTaskStatus,
  ScrapedLinkStatus,
  LogLevel,
  createScraperTask,
  runScraperTask,
  resumeScraperTask,
  pauseScraperTask,
  getScraperTask,
  getScraperTasks,
  updateScraperTask,
  processLink,
  retryFailedLinks,
  getTaskLinks,
  getTaskLogs,
  scraperProviders,
} from '../../../scrapers/src/tools/scraperQueue';

// Schéma pro validaci konfigurace scraperu
const scraperConfigSchema = z
  .object({
    baseUrl: z.string().optional(),
    industry: z.string().optional(),
    region: z.string().optional(),
    headless: z.boolean().optional(),
  })
  .passthrough();

// Schéma pro validaci vytvoření nové úlohy
const createTaskSchema = z.object({
  scraperType: z.string(),
  scraperConfig: scraperConfigSchema,
  searchQuery: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
});

// Schéma pro validaci aktualizace úlohy
const updateTaskSchema = z.object({
  status: z
    .enum([
      ScraperTaskStatus.PENDING,
      ScraperTaskStatus.RUNNING,
      ScraperTaskStatus.COMPLETED,
      ScraperTaskStatus.FAILED,
      ScraperTaskStatus.PAUSED,
    ])
    .optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
});

// Exportujeme router pro scraper queue
export const scraperRouter = router({
  // Získání dostupných typů scraperů
  getScraperTypes: publicProcedure.query(() => {
    return Object.keys(scraperProviders);
  }),

  // Vytvoření nové úlohy
  createTask: publicProcedure.input(createTaskSchema).mutation(async ({ input }) => {
    return await createScraperTask(input);
  }),

  // Získání všech úloh
  getTasks: publicProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              ScraperTaskStatus.PENDING,
              ScraperTaskStatus.RUNNING,
              ScraperTaskStatus.COMPLETED,
              ScraperTaskStatus.FAILED,
              ScraperTaskStatus.PAUSED,
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await getScraperTasks(input?.status);
    }),

  // Získání úlohy podle ID
  getTask: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return await getScraperTask(input.id);
  }),

  // Aktualizace úlohy
  updateTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateTaskSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return await updateScraperTask(input.id, input.data);
    }),

  // Spuštění úlohy
  runTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return await runScraperTask(input.id);
  }),

  // Pozastavení úlohy
  pauseTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return await pauseScraperTask(input.id);
  }),

  // Pokračování v úloze
  resumeTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return await resumeScraperTask(input.id);
  }),

  // Získání odkazů pro úlohu
  getTaskLinks: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z
          .enum([
            ScrapedLinkStatus.PENDING,
            ScrapedLinkStatus.PROCESSED,
            ScrapedLinkStatus.FAILED,
            ScrapedLinkStatus.SKIPPED,
          ])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      return await getTaskLinks(input.taskId, input.status);
    }),

  // Získání logů pro úlohu
  getTaskLogs: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        level: z.enum([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR]).optional(),
      }),
    )
    .query(async ({ input }) => {
      return await getTaskLogs(input.taskId, input.level);
    }),

  // Opakování selhavších odkazů
  retryFailedLinks: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      return await retryFailedLinks(input.taskId);
    }),

  // Zpracování konkrétního odkazu
  processLink: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        link: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await processLink(input.taskId, input.link);
    }),
});
