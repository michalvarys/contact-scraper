import * as cheerio from 'cheerio';
import axios from 'axios';
import { WebsiteAnalysisResult } from '../types';
import { geminiService } from './GeminiService';
import { uploadScreenshot, uploadWebsiteThumbnail } from '../tools/bucket';
import { BusinessImage } from '@contact-scraper/types';
import { Page } from 'puppeteer';

/**
 * Služba pro analýzu webových stránek
 */
export class WebsiteAnalyzer {
  // Definice velikostí viewportů
  private viewportSizes = {
    sm: { width: 375, height: 667 }, // Mobilní telefon
    md: { width: 768, height: 1024 }, // Tablet
    lg: { width: 1366, height: 768 }, // Desktop
  };

  /**
   * Pomocná metoda pro zpoždění
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Extrakce emailu z HTML
   */
  extractEmail(html: string): string | null {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = html.match(emailRegex);

    if (matches && matches.length > 0) {
      // Filtrujeme běžné falešné emaily
      const filteredEmails = matches.filter(
        (email) =>
          !email.includes('example.com') &&
          !email.includes('yourdomain') &&
          !email.includes('domain.com'),
      );

      return filteredEmails.length > 0 ? filteredEmails[0] : null;
    }

    return null;
  }

  /**
   * Kombinuje analýzy z různých velikostí viewportů do jedné
   */
  combineWebsiteAnalyses(viewportAnalyses: Record<string, any>) {
    // Pokud nemáme žádné analýzy, vrátíme prázdnou analýzu
    if (Object.keys(viewportAnalyses).length === 0) {
      return {
        seoScore: null,
        errors: ['Nepodařilo se analyzovat web'],
        designScore: null,
        modernityScore: null,
        recommendations: ['Proveďte manuální analýzu webu'],
        responsiveScore: null,
      };
    }

    // Průměrné skóre ze všech analýz
    let totalSeoScore = 0;
    let totalDesignScore = 0;
    let totalModernityScore = 0;
    let count = 0;

    // Všechny chyby a doporučení
    const allErrors: string[] = [];
    const allRecommendations: string[] = [];

    // Procházení všech analýz
    for (const [size, analysis] of Object.entries(viewportAnalyses)) {
      if (analysis.seoScore) totalSeoScore += analysis.seoScore;
      if (analysis.designScore) totalDesignScore += analysis.designScore;
      if (analysis.modernityScore) totalModernityScore += analysis.modernityScore;

      if (analysis.errors && Array.isArray(analysis.errors)) {
        allErrors.push(...analysis.errors.map((error: string) => `[${size}] ${error}`));
      }

      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        allRecommendations.push(
          ...analysis.recommendations.map((rec: string) => `[${size}] ${rec}`),
        );
      }

      count++;
    }

    // Výpočet responzivity - porovnání skóre mezi různými velikostmi
    let responsiveScore = 100; // Výchozí hodnota

    // Pokud máme analýzy pro mobilní i desktop verzi, porovnáme je
    if (viewportAnalyses.sm && viewportAnalyses.lg) {
      const smDesignScore = viewportAnalyses.sm.designScore || 0;
      const lgDesignScore = viewportAnalyses.lg.designScore || 0;

      // Pokud je velký rozdíl mezi mobilní a desktop verzí, snížíme skóre responzivity
      const difference = Math.abs(smDesignScore - lgDesignScore);
      if (difference > 30) {
        responsiveScore = 50; // Velký rozdíl - špatná responzivita
      } else if (difference > 15) {
        responsiveScore = 75; // Střední rozdíl
      }
    }

    // Odstranění duplicitních chyb a doporučení
    const uniqueErrors = Array.from(new Set(allErrors)).slice(0, 5);
    const uniqueRecommendations = Array.from(new Set(allRecommendations)).slice(0, 7);

    return {
      seoScore: count > 0 ? Math.round(totalSeoScore / count) : null,
      designScore: count > 0 ? Math.round(totalDesignScore / count) : null,
      modernityScore: count > 0 ? Math.round(totalModernityScore / count) : null,
      responsiveScore,
      errors: uniqueErrors,
      recommendations: uniqueRecommendations,
      viewportDetails: Object.keys(viewportAnalyses).map((size) => ({
        size,
        ...viewportAnalyses[size],
      })),
    };
  }

  /**
   * Scrapování webové stránky firmy
   * @param page Puppeteer stránka
   * @param websiteUrl URL webové stránky
   * @param existingEmail Existující email (pokud je k dispozici)
   * @returns Analýza webové stránky
   */
  async analyzeWebsite(
    page: Page,
    websiteUrl: string,
    existingEmail: string | null,
  ): Promise<WebsiteAnalysisResult> {
    try {
      const newPage = await page.browser().newPage();
      if (!newPage) throw new Error('Nelze vytvořit novou stránku');

      // Nastavení timeoutu pro načítání stránky
      await newPage.setDefaultNavigationTimeout(30000);

      // Navigace na stránku
      await newPage.goto(websiteUrl, { waitUntil: 'networkidle2' }).catch(() => {
        console.log(
          `Timeout při načítání stránky ${websiteUrl}, pokračujeme s částečně načteným obsahem`,
        );
      });

      // Získání HTML obsahu pro analýzu
      const content = await newPage.content();
      const $ = cheerio.load(content);

      // Metadata z webu
      const metadata: Record<string, string> = {};
      $('meta').each((_, el) => {
        const name = $(el).attr('name') || $(el).attr('property');
        const content = $(el).attr('content');
        if (name && content) {
          metadata[name] = content;
        }
      });

      // Hledání emailu, pokud ještě nemáme
      let email = existingEmail;
      if (!email) {
        // Nejprve zkusíme sitemap.xml
        let contactPageUrl = '';
        try {
          const sitemapResponse = await axios.get(`${new URL(websiteUrl).origin}/sitemap.xml`, {
            timeout: 5000,
          });
          const sitemapContent = sitemapResponse.data;
          const sitemapCheerio = cheerio.load(sitemapContent, { xmlMode: true });

          // Hledání stránky s kontakty v sitemap
          sitemapCheerio('url loc').each((_, el) => {
            const url = sitemapCheerio(el).text();
            if (
              url.toLowerCase().includes('contact') ||
              url.toLowerCase().includes('kontakt') ||
              url.toLowerCase().includes('about') ||
              url.toLowerCase().includes('o-nas')
            ) {
              contactPageUrl = url;
              return false; // break
            }
          });
        } catch (error) {
          console.log(`Sitemap.xml nebyl nalezen pro ${websiteUrl}`);
        }

        // Pokud jsme našli kontaktní stránku, zkusíme ji prozkoumat
        if (contactPageUrl) {
          try {
            await newPage.goto(contactPageUrl, { waitUntil: 'networkidle2' }).catch(() => {});
            const contactContent = await newPage.$eval('body', (body) => body.innerHTML.trim());
            email = this.extractEmail(contactContent);
          } catch (error) {
            console.log(`Chyba při přístupu na kontaktní stránku ${contactPageUrl}`);
          }
        }

        // Pokud stále nemáme email, zkusíme ho extrahovat z aktuální stránky
        if (!email) {
          email = this.extractEmail(content);
        }
      }

      // Generování ID pro firmu (použijeme doménu webu)
      const businessId = new URL(websiteUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');

      // Vytvoření screenshotů ve třech velikostech
      const screenshots: Record<string, BusinessImage> = {};
      const htmlContents: Record<string, string> = {};

      // Procházení všech velikostí viewportů a vytvoření screenshotů
      for (const [size, dimensions] of Object.entries(this.viewportSizes)) {
        console.log(
          `Vytváření screenshotu pro velikost ${size} (${dimensions.width}x${dimensions.height})`,
        );

        // Nastavení velikosti viewportu
        await newPage.setViewport(dimensions);

        // Krátké čekání pro překreslení stránky
        await this.delay(1000);

        // Vytvoření screenshotu
        const screenshot = await newPage.screenshot({ fullPage: false });

        // Nahrání screenshotu do Supabase Storage
        try {
          const uploadedImage = await uploadScreenshot(screenshot, businessId, {
            imageType: 'website-screenshot',
            suffix: size,
          });

          screenshots[size] = uploadedImage;
          console.log(`Screenshot pro velikost ${size} úspěšně nahrán: ${uploadedImage.url}`);

          // Uložení HTML obsahu pro tuto velikost viewportu
          htmlContents[size] = await newPage.content();
        } catch (error) {
          console.error(`Chyba při nahrávání screenshotu pro velikost ${size}:`, error);
        }
      }

      // Nahrání náhledu webové stránky (použijeme desktop verzi jako hlavní náhled)
      let thumbnail = null;
      if (screenshots.lg) {
        try {
          const uploadedThumbnail = await uploadWebsiteThumbnail(screenshots.lg.url, businessId);
          thumbnail = uploadedThumbnail.url;
        } catch (error) {
          console.error('Chyba při nahrávání náhledu webu:', error);
        }
      }

      // Vytvoření mapy URL adres screenshotů
      const screenshotUrls: Record<string, string> = {};
      for (const [size, image] of Object.entries(screenshots)) {
        screenshotUrls[size] = image.url;
      }

      // Analýza webu pomocí Gemini s přiloženými screenshoty
      const websiteAnalysis = await geminiService.analyzeWebsiteWithScreenshots(
        htmlContents,
        screenshotUrls,
        websiteUrl,
      );

      // Zavření stránky
      await newPage.close();

      // Definice typu pro analýzu viewportu
      type ViewportAnalysis = {
        seoScore: number;
        designScore: number;
        modernityScore: number;
        errors: string[];
        recommendations: string[];
      };

      // Vytvoření viewportDetails s typovou kontrolou
      const viewportDetails = Object.entries(websiteAnalysis.viewportAnalyses || {}).map(
        ([size, analysis]) => ({
          size,
          seoScore: (analysis as ViewportAnalysis).seoScore,
          designScore: (analysis as ViewportAnalysis).designScore,
          modernityScore: (analysis as ViewportAnalysis).modernityScore,
          errors: (analysis as ViewportAnalysis).errors || [],
          recommendations: (analysis as ViewportAnalysis).recommendations || [],
        }),
      );

      return {
        metadata,
        email,
        thumbnail,
        screenshots,
        viewportAnalyses: websiteAnalysis.viewportAnalyses || {},
        websiteAnalysis: {
          seoScore: websiteAnalysis.seoScore,
          designScore: websiteAnalysis.designScore,
          modernityScore: websiteAnalysis.modernityScore,
          responsiveScore: websiteAnalysis.responsiveScore,
          errors: websiteAnalysis.errors || [],
          recommendations: websiteAnalysis.recommendations || [],
          viewportDetails,
        },
      };
    } catch (error) {
      console.error(`Chyba při scrapování webu ${websiteUrl}:`, error);
      return {
        metadata: {},
        email: existingEmail,
        thumbnail: null,
        websiteAnalysis: {
          seoScore: null,
          errors: ['Nepodařilo se analyzovat web'],
          designScore: null,
          modernityScore: null,
          recommendations: ['Proveďte manuální analýzu webu'],
        },
      };
    }
  }
}

// Export instance služby pro snadné použití
export const websiteAnalyzer = new WebsiteAnalyzer();
