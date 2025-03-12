import { Business } from '../types';

/**
 * Enum definující stavy úlohy scraperu
 */
export enum ScraperTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}

/**
 * Enum definující stavy zpracování odkazu
 */
export enum ScrapedLinkStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Enum definující úrovně logu
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Rozhraní definující základní parametry scraperu
 */
export interface ScraperInitParams {
  baseUrl?: string;
  industry?: string;
  region?: string;
  headless?: boolean;
  [key: string]: any; // Další volitelné parametry specifické pro jednotlivé scrapery
}

/**
 * Rozhraní reprezentující úlohu scraperu
 */
export interface ScraperTask {
  id: string;
  status: ScraperTaskStatus;
  scraperType: string;
  scraperConfig: string | ScraperInitParams;
  searchQuery?: string;
  industry?: string;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  scrapedLinks: ScrapedLink[];
  logs: ScraperTaskLog[];
}

/**
 * Rozhraní pro vytvoření nové úlohy scraperu
 */
export interface CreateScraperTaskParams {
  scraperType: string;
  scraperConfig: ScraperInitParams;
  searchQuery?: string;
  industry?: string;
  region?: string;
}

/**
 * Rozhraní pro aktualizaci stavu úlohy scraperu
 */
export interface UpdateScraperTaskParams {
  status?: ScraperTaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Rozhraní definující odkaz ke zpracování
 */
export interface ScrapedLink {
  id: string;
  link: string;
  status: ScrapedLinkStatus;
  processedAt?: Date;
  errorMessage?: string;
  companyId?: string;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rozhraní pro vytvoření nového odkazu
 */
export interface CreateScrapedLinkParams {
  link: string;
  taskId: string;
  status?: ScrapedLinkStatus;
}

/**
 * Rozhraní pro aktualizaci stavu odkazu
 */
export interface UpdateScrapedLinkParams {
  status?: ScrapedLinkStatus;
  processedAt?: Date;
  errorMessage?: string;
  companyId?: string;
}

/**
 * Rozhraní definující log úlohy scraperu
 */
export interface ScraperTaskLog {
  id: string;
  message: string;
  level: LogLevel;
  taskId: string;
  createdAt: Date;
}

/**
 * Rozhraní pro vytvoření nového logu
 */
export interface CreateScraperTaskLogParams {
  message: string;
  level?: LogLevel;
  taskId: string;
}

/**
 * Rozhraní definující výsledek zpracování odkazu
 */
export interface ProcessLinkResult {
  success: boolean;
  business?: Business;
  error?: Error | string;
}

/**
 * Rozhraní pro callback po dokončení zpracování odkazu
 */
export interface LinkProcessCallback {
  (link: string, result: ProcessLinkResult): Promise<void>;
}

/**
 * Rozhraní pro callback logování
 */
export interface LogCallback {
  (message: string, level?: LogLevel): Promise<void>;
}

/**
 * Rozhraní pro poskytovatele scraperu
 */
export interface ScraperProvider {
  createScraper(config: ScraperInitParams): Promise<any>;
}
