export enum ScraperTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PROCESSED = 'PROCESSED',
  SKIPPED = 'SKIPPED',
}

export interface ScraperTask {
  id: string;
  scraperType: string;
  scraperConfig: Record<string, any>;
  industry?: string;
  region?: string;
  searchQuery?: string;
  status: ScraperTaskStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  scrapedLinks: ScrapedLink[];
}

export interface ScrapedLink {
  id: string;
  taskId: string;
  link: string;
  status: ScraperTaskStatus;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScraperLog {
  id: string;
  taskId: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  createdAt: Date;
}

// Základní data o firmě, která scraper získává
export interface BaseBusinessData {
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  openingHours?: string | null;
  categories?: string[];
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Data o firmě včetně metadat o scrapování
export interface BusinessData extends BaseBusinessData {
  taskId: string;
  sourceLink: string;
}

// Data o firmě včetně databázových metadat
export interface Business extends BusinessData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScraperQueueOptions {
  maxConcurrentTasks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  taskTimeout?: number;
  linkTimeout?: number;
}
