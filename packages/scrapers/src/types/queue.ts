import {
  ScraperTask as PrismaScraperTask,
  ScrapedLink as PrismaScrapedLink,
  ScraperTaskLog as PrismaScraperTaskLog,
  ScraperTaskStatus,
  ScrapedLinkStatus,
  LogLevel,
  Prisma,
} from '@contact-scraper/db';
import { Business } from '../types';

// Exportujeme typy z Prisma
export { ScraperTaskStatus, ScrapedLinkStatus, LogLevel };

// Rozšíření typů z Prisma
export type ScraperTask = PrismaScraperTask & {
  scrapedLinks: ScrapedLink[];
  logs: ScraperTaskLog[];
};

export type ScrapedLink = PrismaScrapedLink;

export type ScraperTaskLog = PrismaScraperTaskLog;

/**
 * Parametry pro vytvoření úlohy
 */
export interface CreateScraperTaskParams {
  scraperType: string;
  scraperConfig: string | Record<string, any>;
  searchQuery?: string;
  industry?: string;
  region?: string;
}

/**
 * Parametry pro aktualizaci úlohy
 */
export interface UpdateScraperTaskParams {
  status?: ScraperTaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Parametry pro vytvoření odkazu
 */
export interface CreateScrapedLinkParams {
  link: string;
  taskId: string;
  status?: ScrapedLinkStatus;
}

/**
 * Parametry pro aktualizaci odkazu
 */
export interface UpdateScrapedLinkParams {
  status?: ScrapedLinkStatus;
  processedAt?: Date;
  errorMessage?: string;
  companyId?: string;
}

/**
 * Parametry pro vytvoření logu
 */
export interface CreateScraperTaskLogParams {
  message: string;
  taskId: string;
  level?: LogLevel;
}

/**
 * Výsledek zpracování odkazu
 */
export interface ProcessLinkResult {
  success: boolean;
  business?: Business;
  error?: Error | string;
}

/**
 * Callback pro zpracování odkazu
 */
export type LinkProcessCallback = (link: string, result: ProcessLinkResult) => Promise<void>;

/**
 * Callback pro logování
 */
export type LogCallback = (message: string, level?: LogLevel) => Promise<void>;

/**
 * Parametry pro inicializaci scraperu
 */
export interface ScraperInitParams {
  [key: string]: any;
  industry?: string;
  region?: string;
}

/**
 * Poskytovatel scraperu
 */
export interface ScraperProvider {
  createScraper: (config: ScraperInitParams) => Promise<any>;
}
