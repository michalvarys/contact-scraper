import { prisma } from '@contact-scraper/db';
import { WebsiteAnalysisResult } from '../types';

/**
 * Služba pro práci s databází
 */
export class DatabaseManager {
  /**
   * Získá existující analýzu webové stránky pro danou URL
   * @param websiteUrl URL webové stránky
   * @returns Existující analýza webové stránky nebo null
   */
  async getExistingWebsiteAnalysis(websiteUrl: string): Promise<WebsiteAnalysisResult | null> {
    try {
      // Normalizace URL
      if (websiteUrl && !/^https?:\/\//.test(websiteUrl)) {
        websiteUrl = 'https://' + websiteUrl;
      }

      // Hledání firmy s danou webovou stránkou
      const company = await prisma.company.findFirst({
        where: { website: websiteUrl },
        include: {
          metadata: {
            include: {
              website: true,
            },
          },
        },
      });

      // Pokud firma neexistuje nebo nemá metadata nebo webovou stránku, vrátíme null
      if (!company || !company.metadata || !company.metadata.website) {
        return null;
      }

      // Parsování dat z JSON
      const metadata = company.metadata.data ? JSON.parse(company.metadata.data) : {};
      const websiteAnalysis = company.metadata.website.data
        ? JSON.parse(company.metadata.website.data)
        : {};
      const screenshots = metadata.screenshots || {};
      const viewportAnalyses = metadata.viewportAnalyses || {};

      // Vytvoření objektu s analýzou webové stránky
      return {
        metadata,
        email: company.email,
        thumbnail: company.metadata.website.thumbnail,
        screenshots,
        viewportAnalyses,
        websiteAnalysis,
      };
    } catch (error) {
      console.error(`Chyba při získávání existující analýzy webové stránky:`, error);
      return null;
    }
  }
  /**
   * Zpracuje data o firmě a uloží je do databáze
   * @param companyData Data o firmě
   * @returns Uložená data o firmě
   */
  async saveCompanyData({
    websiteData,
    rating,
    reviews,
    description,
    ...companyData
  }: Record<string, any>) {
    try {
      const categories: string[] = Array.isArray(companyData.categories)
        ? companyData.categories.map((c: any) => typeof c === 'string' ? c : c?.name).filter(Boolean)
        : [];

      let website = companyData.website || null;
      if (website && !/^https?:\/\//.test(website)) {
        website = 'https://' + website;
      }

      const reviewsCount = companyData.reviewsCount != null
        ? Number(companyData.reviewsCount)
        : companyData.reviewCount != null
          ? Number(companyData.reviewCount)
          : 0;

      const safeData = {
        name: companyData.name || '',
        address: companyData.address || '',
        email: companyData.email || null,
        phone: companyData.phone || null,
        website,
        link: companyData.link,
        reviewsCount,
        scrapedAt: companyData.scrapedAt || new Date(),
      };

      const companyRecord = await prisma.company.upsert({
        where: { link: safeData.link },
        update: {
          name: safeData.name || undefined,
          address: safeData.address || undefined,
          email: safeData.email,
          phone: safeData.phone,
          website: safeData.website,
          reviewsCount: safeData.reviewsCount,
          scrapedAt: safeData.scrapedAt,
          categories: {
            connectOrCreate: categories.map((categoryName: string) => ({
              where: { name: categoryName },
              create: { name: categoryName },
            })),
          },
        },
        create: {
          name: safeData.name,
          address: safeData.address,
          email: safeData.email,
          phone: safeData.phone,
          website: safeData.website,
          link: safeData.link,
          reviewsCount: safeData.reviewsCount,
          scrapedAt: safeData.scrapedAt,
          categories: {
            connectOrCreate: categories.map((categoryName: string) => ({
              where: { name: categoryName },
              create: { name: categoryName },
            })),
          },
        },
      });

      // Pokud má firma webovou stránku a máme data o ní, uložíme je
      if (websiteData && safeData.website) {
        await this.saveWebsiteData(
          companyRecord.id,
          {
            ...websiteData,
            metadata: {
              description,
              ...websiteData.metadata,
            },
          },
          safeData.website,
        );
      }

      console.log(`Firma "${safeData.name}" byla úspěšně uložena.`);

      // Načtení kompletních dat o firmě včetně relací
      const savedCompany = await prisma.company.findUnique({
        where: { id: companyRecord.id },
        include: {
          categories: true,
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
