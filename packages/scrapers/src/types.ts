// types.ts - Definice typů
export interface Business {
  id: string;
  name: string;
  address: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry?: string;
  region?: string;
  rating?: string;
  reviewsCount: number;
  reviews?: Review[];
  categories?: string[];
  openingHours?: string[];
  link: string;
  contacts?: Contact[];
  scrapedAt: string;
}

export interface Review {
  rating: number;
  text?: string;
}

export interface Contact {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export interface ScraperOptions {
  headless?: boolean;
  industry?: string;
  region?: string;
}

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
