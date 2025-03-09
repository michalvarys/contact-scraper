// databaseManager.ts - Třída pro práci s databází
import { prisma } from '@contact-scraper/db';
import { Business } from '../types';

export class DatabaseManager {
  private industryId: number | null = null;
  private regionId: number | null = null;

  constructor(
    private industry: string = '',
    private region: string = '',
  ) {}

  // Initialize database connections
  async init() {
    if (this.industry && this.region) {
      // Find or create industry
      let industry = await prisma.industry.findUnique({
        where: { name: this.industry },
      });

      if (!industry) {
        console.log(`Industry ${this.industry} not found in database, creating...`);
        industry = await prisma.industry.create({ data: { name: this.industry } });
      }

      // Find or create region
      let region = await prisma.region.findUnique({
        where: { name: this.region },
      });

      if (!region) {
        console.log(`Region ${this.region} not found in database, creating...`);
        region = await prisma.region.create({ data: { name: this.region } });
      }

      this.industryId = industry?.id;
      this.regionId = region?.id;
    }
  }

  // Load existing businesses from database
  async loadBusinesses(): Promise<Record<string, Business>> {
    const businesses: Record<string, Business> = {};

    try {
      if (!this.industry || !this.region) return businesses;

      // Find industry and region records
      const industryRecord = await prisma.industry.findUnique({
        where: { name: this.industry },
      });

      const regionRecord = await prisma.region.findUnique({
        where: { name: this.region },
      });

      if (industryRecord && regionRecord) {
        const companies = await prisma.company.findMany({
          where: {
            industryId: industryRecord.id,
            regionId: regionRecord.id,
          },
          include: {
            categories: true,
          },
        });

        // Convert to scraper format
        companies.forEach((company) => {
          businesses[company.link] = {
            id: company.id,
            name: company.name,
            address: company.address,
            email: company.email,
            phone: company.phone,
            website: company.website,
            industry: this.industry,
            region: this.region,
            reviewsCount: company.reviewsCount,
            categories: company.categories.map((cat) => cat.name),
            link: company.link,
            scrapedAt: company.scrapedAt.toISOString(),
          };
        });

        console.log(`Loaded ${companies.length} companies from database.`);
      }
    } catch (err) {
      console.error('Error loading data from database:', err);
    }

    return businesses;
  }

  // Save business to database
  async saveBusiness(business: Business) {
    try {
      if (this.industry && this.region && (!this.industryId || !this.regionId)) {
        throw new Error('Industry or region not loaded or found in database');
      }

      // Prepare category connections
      const categoryConnections = [];
      if (business.categories && business.categories.length > 0) {
        for (const categoryName of business.categories) {
          // Find or create category
          const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          categoryConnections.push({ id: category.id });
        }
      }

      // Prepare data object
      const data: any = {
        id: business.id,
        name: business.name,
        address: business.address,
        email: business.email,
        phone: business.phone,
        website: business.website,
        link: business.link,
        reviewsCount: business.reviewsCount,
        scrapedAt: new Date(business.scrapedAt),
        categories: {
          connect: categoryConnections,
        },
      };

      // Add industry/region connections if applicable
      if (this.industryId) {
        data.industry = {
          connect: { id: this.industryId },
        };
      }

      if (this.regionId) {
        data.region = {
          connect: { id: this.regionId },
        };
      }

      // Create company in database
      await prisma.company.create({
        data: data,
      });

      console.log(`Business ${business.name} successfully saved to database.`);
    } catch (error) {
      console.error(`Error saving business ${business.name} to database:`, error);
    }
  }

  // Update an existing company
  async updateBusiness(business: Business) {
    try {
      // Prepare category connections
      const categoryConnections = [];
      if (business.categories && business.categories.length > 0) {
        for (const categoryName of business.categories) {
          // Find or create category
          const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          categoryConnections.push({ id: category.id });
        }
      }

      // Update company in database
      await prisma.company.update({
        where: { link: business.link },
        data: {
          name: business.name,
          address: business.address,
          email: business.email,
          phone: business.phone,
          website: business.website,
          reviewsCount: business.reviewsCount,
          scrapedAt: new Date(business.scrapedAt),
          categories: {
            connect: categoryConnections,
          },
        },
      });

      console.log(`Business ${business.name} successfully updated in database.`);
    } catch (error) {
      console.error(`Error updating business ${business.id}:`, error);
    }
  }

  // Helper method to check if company exists in database
  async companyExists(link: string): Promise<boolean> {
    const existingCompany = await prisma.company.findFirst({
      where: { link },
    });
    return !!existingCompany;
  }
}
