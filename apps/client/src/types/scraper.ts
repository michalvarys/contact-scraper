import { ScraperTaskStatus, ScrapedLinkStatus } from '@contact-scraper/db';

// Enum pro stavy úloh
export { ScraperTaskStatus, ScrapedLinkStatus };
// export enum ScraperTaskStatus {
//   PENDING = 'PENDING',
//   RUNNING = 'RUNNING',
//   PAUSED = 'PAUSED',
//   COMPLETED = 'COMPLETED',s
//   FAILED = 'FAILED',
//   PROCESSED = 'PROCESSED',
//   SKIPPED = 'SKIPPED',
// }

export interface ScrapedLink {
  id: string;
  taskId: string;
  link: string;
  status: ScrapedLinkStatus;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyId?: string | null;
  errorMessage?: string | null;
}

export interface ScraperLog {
  id: string;
  taskId: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  createdAt: string;
}

export interface ScraperTask {
  id: string;
  scraperType: string;
  scraperConfig: string | Record<string, any>;
  searchQuery?: string | null;
  status: ScraperTaskStatus;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  scrapedLinks: ScrapedLink[];
}
