import {
  Company,
  ScraperTaskStatus,
  ScraperTaskLog,
  ScrapedLink,
  ScraperTask,
  ScrapedLinkStatus,
} from '@contact-scraper/db';

export interface ScraperLog {
  id: string;
  taskId: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  createdAt: Date;
}

// Základní data o firmě, která scraper získává
export interface BaseBusinessData extends Omit<Company, 'industryId' | 'regionId' | 'metadataId'> {
  region?: string | null;
  industry?: string | null;
  categories?: string[];
  websiteData?: any;
  rating?: string | null;
}

// Data o firmě včetně metadat o scrapování
export interface BusinessData extends BaseBusinessData {
  taskId?: string;
  sourceLink?: string;
}

// Data o firmě včetně databázových metadat
export interface Business {
  id: string;
  name: string;
  address: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  link: string;
  reviewsCount: number;
  scrapedAt: Date | string;
  categories?: string[];
  industry?: string | null;
  region?: string | null;
  taskId?: string;
  sourceLink?: string;
  websiteData?: any;
  rating?: string | null;
}

export interface ScraperQueueOptions {
  maxConcurrentTasks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  taskTimeout?: number;
  linkTimeout?: number;
}

export type ScraperOptions = Record<string, any>;

export interface WebsiteAnalysisResult {
  metadata: Record<string, string>;
  email: string | null;
  thumbnail: string | null;
  // Nové vlastnosti pro screenshoty a analýzy
  screenshots?: Record<string, any>;
  viewportAnalyses?: Record<string, any>;
  websiteAnalysis: {
    seoScore: number | null;
    errors: string[];
    designScore: number | null;
    modernityScore: number | null;
    responsiveScore?: number | null;
    recommendations?: string[];
    viewportDetails?: Array<{
      size: string;
      seoScore: number | null;
      designScore: number | null;
      modernityScore: number | null;
      errors: string[];
      recommendations: string[];
      responsiveIssues?: string[];
    }>;
  };
}
