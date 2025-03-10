import { prisma } from '@contact-scraper/db';
import { WebsiteAnalysisResult } from '../types';

/**
 * Služba pro práci s databází
 */
export class DatabaseManager {
  /**
   * Zpracuje data o firmě a uloží je do databáze
   * @param companyData Data o firmě
   * @param industryName Volitelný název odvětví
   * @param regionName Volitelný název regionu
   * @returns Uložená data o firmě
   */
  async saveCompanyData(
    { websiteData, ...companyData }: Record<string, any>,
    industryName?: string,
    regionName?: string,
  ) {
    try {
      // console.dir(companyData, { depth: Infinity });

      // Získání nebo vytvoření Industry (pokud je zadáno)
      let industryRecord = null;
      if (industryName) {
        industryRecord = await prisma.industry.upsert({
          where: { name: industryName },
          update: {},
          create: { name: industryName },
        });
        companyData.industryId = industryRecord.id;
      }

      // Získání nebo vytvoření Region (pokud je zadáno)
      let regionRecord = null;
      if (regionName) {
        regionRecord = await prisma.region.upsert({
          where: { name: regionName },
          update: {},
          create: { name: regionName },
        });
        companyData.regionId = regionRecord.id;
      }

      // Uložení kategorií
      const categories = companyData.categories || [];
      delete companyData.categories;

      // Uložení základních dat firmy do databáze
      const companyRecord = await prisma.company.upsert({
        where: { link: companyData.link },
        update: {
          ...companyData,
          address: companyData.address || undefined,
          reviewsCount: companyData.reviewCount ? Number(companyData.reviewCount) : undefined,
          categories: {
            connectOrCreate: categories.map((categoryName: string) => ({
              where: { name: categoryName },
              create: { name: categoryName },
            })),
          },
        },
        create: {
          ...companyData,
          address: companyData.address || '',
          reviewsCount: companyData.reviewCount ? Number(companyData.reviewCount) : undefined,
          id: companyData.id || null,
          link: companyData.link,
          name: companyData.name,
          scrapedAt: new Date(),
          categories: {
            connectOrCreate: categories.map((categoryName: string) => ({
              where: { name: categoryName },
              create: { name: categoryName },
            })),
          },
        },
      });

      // Pokud má firma webovou stránku a máme data o ní, uložíme je
      if (websiteData && companyData.website) {
        await this.saveWebsiteData(companyRecord.id, websiteData, companyData.website);
      }

      console.log(`Firma "${companyData.name}" byla úspěšně uložena.`);

      // Načtení kompletních dat o firmě včetně relací
      const savedCompany = await prisma.company.findUnique({
        where: { id: companyRecord.id },
        include: {
          categories: true,
          industry: true,
          region: true,
          metadata: {
            include: {
              website: true,
            },
          },
        },
      });

      return savedCompany;
    } catch (error) {
      console.error(`Chyba při ukládání dat firmy:`, error);
      throw error;
    }
  }

  /**
   * Uloží data o webové stránce firmy
   * @param companyId ID firmy
   * @param websiteData Data o webové stránce
   * @param websiteUrl URL webové stránky
   */
  async saveWebsiteData(companyId: string, websiteData: WebsiteAnalysisResult, websiteUrl: string) {
    try {
      // Vytvoření nebo aktualizace metadat
      await prisma.companyMetadata.upsert({
        where: { companyId },
        update: {
          data: JSON.stringify({
            ...websiteData.metadata,
            screenshots: websiteData.screenshots || {},
            viewportAnalyses: websiteData.viewportAnalyses || {},
          }),
          website: {
            upsert: {
              create: {
                link: websiteUrl,
                thumbnail: websiteData.thumbnail,
                data: JSON.stringify(websiteData.websiteAnalysis),
              },
              update: {
                thumbnail: websiteData.thumbnail,
                data: JSON.stringify(websiteData.websiteAnalysis),
              },
            },
          },
        },
        create: {
          companyId,
          data: JSON.stringify({
            ...websiteData.metadata,
            screenshots: websiteData.screenshots || {},
            viewportAnalyses: websiteData.viewportAnalyses || {},
          }),
          website: {
            create: {
              link: websiteUrl,
              thumbnail: websiteData.thumbnail,
              data: JSON.stringify(websiteData.websiteAnalysis),
            },
          },
        },
      });

      console.log(`Data o webové stránce firmy (ID: ${companyId}) byla úspěšně uložena.`);
    } catch (error) {
      console.error(`Chyba při ukládání dat o webové stránce:`, error);
      throw error;
    }
  }
}

// Export instance služby pro snadné použití
export const databaseManager = new DatabaseManager();
