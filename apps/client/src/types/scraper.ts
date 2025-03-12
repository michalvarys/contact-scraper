/**
 * Stavy úloh scraperu
 */
export enum ScraperTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Stavy odkazů ve fronté
 */
export enum ScrapedLinkStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Úrovně logů
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Konfigurace scraperu
 */
export interface ScraperConfig {
  baseUrl?: string;
  industry?: string;
  region?: string;
  headless?: boolean;
  [key: string]: any;
}

/**
 * Rozhraní pro vytvoření úlohy scraperu
 */
export interface CreateScraperTaskInput {
  scraperType: string;
  scraperConfig: ScraperConfig;
  searchQuery?: string;
  industry?: string;
  region?: string;
}

/**
 * Odkaz ve frontě
 */
export interface ScrapedLink {
  id: string;
  taskId: string;
  link: string;
  status: ScrapedLinkStatus;
  createdAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  metadata: any | null;
}

/**
 * Úloha scraperu
 */
export interface ScraperTask {
  id: string;
  scraperType: string;
  scraperConfig: string;
  status: ScraperTaskStatus;
  industry: string | null;
  region: string | null;
  searchQuery: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  scrapedLinks: ScrapedLink[];
}

/**
 * Log úlohy
 */
export interface ScraperTaskLog {
  id: string;
  taskId: string;
  level: LogLevel;
  message: string;
  createdAt: string;
}
