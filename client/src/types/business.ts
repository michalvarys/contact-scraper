// src/types/business.ts
export interface Business {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  industry?: string;
  region?: string;
  rating?: string;
  reviewsCount: number;
  categories?: string[];
  link: string;
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
