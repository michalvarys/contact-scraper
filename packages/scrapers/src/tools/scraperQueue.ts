import { scraperQueueService } from '../services/ScraperQueueService';
import scraperProviders from '../providers/ScraperProviders';
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

// Registrace všech poskytovatelů scraperů
Object.entries(scraperProviders).forEach(([type, provider]) => {
  scraperQueueService.registerScraperProvider(type, provider);
});

/**
 * Vytvoří novou úlohu pro scraper
 *
 * @example
 * ```typescript
 * // Vytvoření úlohy pro Google Maps Scraper
 * const task = await createScraperTask({
 *   scraperType: 'GoogleMapsScraper',
 *   scraperConfig: {
 *     industry: 'restaurace',
 *     region: 'Praha',
 *     headless: false
 *   },
 * });
 *
 * // Spuštění úlohy
 * const result = await runScraperTask(task.id);
 * ```
 */
export const createScraperTask = async (params: CreateScraperTaskParams): Promise<ScraperTask> => {
  return await scraperQueueService.createTask(params);
};

/**
 * Spustí zpracování úlohy scraperu
 */
export const runScraperTask = async (taskId: string): Promise<ScraperTask> => {
  return await scraperQueueService.runTask(taskId);
};

/**
 * Pokračuje v přerušené úloze
 */
export const resumeScraperTask = async (taskId: string): Promise<ScraperTask> => {
  return await scraperQueueService.resumeTask(taskId);
};

/**
 * Pozastaví běžící úlohu
 */
export const pauseScraperTask = async (taskId: string): Promise<ScraperTask> => {
  return await scraperQueueService.pauseTask(taskId);
};

/**
 * Získá úlohu podle ID
 */
export const getScraperTask = async (taskId: string): Promise<ScraperTask | null> => {
  return await scraperQueueService.getTask(taskId);
};

/**
 * Získá seznam úloh podle stavu
 */
export const getScraperTasks = async (status?: ScraperTaskStatus): Promise<ScraperTask[]> => {
  return await scraperQueueService.getTasks(status);
};

/**
 * Aktualizuje stav úlohy scraperu
 */
export const updateScraperTask = async (
  taskId: string,
  params: UpdateScraperTaskParams,
): Promise<ScraperTask> => {
  return await scraperQueueService.updateTask(taskId, params);
};

/**
 * Zpracuje konkrétní odkaz v rámci úlohy
 */
export const processLink = async (taskId: string, link: string): Promise<ProcessLinkResult> => {
  return await scraperQueueService.processLink(taskId, link);
};

/**
 * Znovu spustí zpracování selhavších odkazů v rámci úlohy
 */
export const retryFailedLinks = async (taskId: string): Promise<number> => {
  return await scraperQueueService.retryFailedLinks(taskId);
};

/**
 * Vytvoří nový odkaz ke zpracování
 */
export const createScrapedLink = async (params: CreateScrapedLinkParams): Promise<ScrapedLink> => {
  return await scraperQueueService.createLink(params);
};

/**
 * Aktualizuje stav odkazu
 */
export const updateScrapedLink = async (
  linkId: string,
  params: UpdateScrapedLinkParams,
): Promise<ScrapedLink> => {
  return await scraperQueueService.updateLink(linkId, params);
};

/**
 * Získá odkazy pro danou úlohu podle stavu
 */
export const getTaskLinks = async (
  taskId: string,
  status?: ScrapedLinkStatus,
): Promise<ScrapedLink[]> => {
  return await scraperQueueService.getLinks(taskId, status);
};

/**
 * Vytvoří nový log pro úlohu
 */
export const logScraperTask = async (
  params: CreateScraperTaskLogParams,
): Promise<ScraperTaskLog> => {
  return await scraperQueueService.log(params);
};

/**
 * Získá logy pro danou úlohu
 */
export const getTaskLogs = async (taskId: string, level?: LogLevel): Promise<ScraperTaskLog[]> => {
  return await scraperQueueService.getLogs(taskId, level);
};

// Re-export typů
export {
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
};

// Export instance služby pro případné pokročilé použití
export { scraperQueueService, scraperProviders };

// Default export pro zjednodušené použití
export default {
  createScraperTask,
  runScraperTask,
  resumeScraperTask,
  pauseScraperTask,
  getScraperTask,
  getScraperTasks,
  updateScraperTask,
  processLink,
  retryFailedLinks,
  createScrapedLink,
  updateScrapedLink,
  getTaskLinks,
  logScraperTask,
  getTaskLogs,
  scraperQueueService,
  scraperProviders,
};
