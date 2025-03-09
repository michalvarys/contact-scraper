import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { repairTruncatedJsonArray } from './tools/json';
import { Business, WebsiteAnalysisResult } from './types';
import { prisma } from '@contact-scraper/db';
import { uploadScreenshot, uploadWebsiteThumbnail, deleteBusinessImages } from './tools/bucket';
import { BusinessImage } from '@contact-scraper/types';
import dotenv from 'dotenv';

// Načtení proměnných prostředí
dotenv.config();

// Inicializace Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

class AiGoogleMapsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  // Definice velikostí viewportů
  private viewportSizes = {
    sm: { width: 375, height: 667 }, // Mobilní telefon
    md: { width: 768, height: 1024 }, // Tablet
    lg: { width: 1366, height: 768 }, // Desktop
  };

  constructor() {
    // Kontrola, zda jsou nastaveny potřebné proměnné prostředí
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.warn(
        'VAROVÁNÍ: Proměnné prostředí SUPABASE_URL nebo SUPABASE_SERVICE_KEY nejsou nastaveny.',
      );
      console.warn('Nahrávání obrázků do Supabase Storage nebude fungovat správně.');
    }
  }

  /**
   * Pomocná metoda pro zpoždění
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 720, height: 1280 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    );
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Získá data o firmě z odkazu a uloží je do databáze
   * @param link Odkaz na detail firmy v Google Maps
   * @param industryName Volitelný název odvětví
   * @param regionName Volitelný název regionu
   * @returns Data o firmě
   */
  async getCompanyDataFromLink(link: string, industryName?: string, regionName?: string) {
    if (!this.browser || !this.page) {
      await this.init();
    }

    if (!this.page) throw new Error('Browser nebyl inicializován');

    // Navštívení stránky firmy
    await this.page.goto(link, { waitUntil: 'networkidle2' });
    await this.confirmCookiesModal();
    await this.delay(2000); // Krátké čekání pro načtení obsahu

    // Získání HTML obsahu stránky
    const content = await this.page.$eval('[role=main]', (el) => el.innerHTML);

    // Extrakce základních dat o firmě pomocí Gemini
    const companyData = await this.extractCompanyDataWithGemini(content, link);

    // Přidání času scrapování
    companyData.scrapedAt = new Date();

    // Zpracování a uložení dat do databáze
    const savedCompany = await this.processAndSaveCompanyData(
      companyData,
      industryName,
      regionName,
    );

    return savedCompany;
  }

  async confirmCookiesModal() {
    if (!this.page) throw new Error('Browser nebyl inicializován');

    // Přijmutí cookies pokud se zobrazí dialog
    try {
      const cookieButton = await this.page.$('button[aria-label="Přijmout vše"]');
      if (cookieButton) {
        await cookieButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.log('Dialog cookies se nezobrazil nebo tlačítko nebylo nalezeno');
    }
  }

  /**
   * Hlavní metoda pro získávání dat o firmách podle oboru a regionu
   */
  async scrapeCompanies(industry: string, region: string) {
    if (!this.browser || !this.page) {
      await this.init();
    }

    if (!this.page) throw new Error('Browser nebyl inicializován');

    try {
      // 1. Navštívení Google Maps a vyhledání dotazu
      const searchQuery = `${industry} ${region}`;
      await this.page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });

      // Přijmutí cookies pokud se zobrazí dialog
      try {
        const cookieButton = await this.page.$('button[aria-label="Přijmout vše"]');
        if (cookieButton) {
          await cookieButton.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
      } catch (error) {
        console.log('Dialog cookies se nezobrazil nebo tlačítko nebylo nalezeno');
      }

      // Vyhledání dotazu
      await this.page.waitForSelector('#searchboxinput');
      await this.page.type('#searchboxinput', searchQuery);
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.delay(2000);

      // 2. Scrollování a získání všech odkazů na firmy
      const companies = await this.scrollAndExtractLinks();
      console.log(`Nalezeno ${companies.length} firem`);

      const companyLinks = companies.map((company) => company.link);

      // 3. Procházení jednotlivých firem a extrakce dat
      for (const company of companies) {
        try {
          let companyData: Record<string, any> = company;
          if (!('name' in company) || !company.name) {
            // Navštívení stránky firmy
            await this.page.goto(company.link, { waitUntil: 'networkidle2' });
            await this.delay(2000); // Krátké čekání pro načtení obsahu

            // Získání HTML obsahu stránky
            const content = await this.page.$eval('[role=main]', (el) => el.innerHTML);

            // Extrakce základních dat o firmě pomocí Gemini
            companyData = await this.extractCompanyDataWithGemini(content, company.link);
          } else {
            companyData = company;
          }

          // Přidání času scrapování
          companyData.scrapedAt = new Date();

          // Zpracování a uložení dat do databáze
          await this.processAndSaveCompanyData(companyData, industry, region);
        } catch (error) {
          console.error(`Chyba při zpracování firmy s odkazem ${company.link}:`, error);
        }
      }

      return { success: true, message: `Úspěšně zpracováno ${companyLinks.length} firem.` };
    } catch (error) {
      console.error('Chyba při scrapování firem:', error);
      return { success: false, message: `Nastala chyba: ${error}` };
    }
  }

  /**
   * Zpracuje data o firmě a uloží je do databáze
   * @param companyData Data o firmě
   * @param industryName Volitelný název odvětví
   * @param regionName Volitelný název regionu
   * @returns Uložená data o firmě
   */
  private async processAndSaveCompanyData(
    companyData: Record<string, any>,
    industryName?: string,
    regionName?: string,
  ) {
    try {
      console.dir(companyData, { depth: Infinity });

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
          categories: {
            connectOrCreate: categories.map((categoryName: string) => ({
              where: { name: categoryName },
              create: { name: categoryName },
            })),
          },
        },
        create: {
          ...companyData,
          address: companyData.address || null,
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

      // Pokud má firma webovou stránku, získáme z ní další data
      if (companyData.website) {
        const websiteData = await this.scrapeWebsite(companyData.website, companyData.email);
        console.dir(websiteData, { depth: Infinity });

        // Vytvoření nebo aktualizace metadat
        await prisma.companyMetadata.upsert({
          where: { companyId: companyRecord.id },
          update: {
            data: JSON.stringify({
              ...websiteData.metadata,
              screenshots: websiteData.screenshots || {},
              viewportAnalyses: websiteData.viewportAnalyses || {},
            }),
            website: {
              upsert: {
                create: {
                  link: companyData.website,
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
            companyId: companyRecord.id,
            data: JSON.stringify({
              ...websiteData.metadata,
              screenshots: websiteData.screenshots || {},
              viewportAnalyses: websiteData.viewportAnalyses || {},
            }),
            website: {
              create: {
                link: companyData.website,
                thumbnail: websiteData.thumbnail,
                data: JSON.stringify(websiteData.websiteAnalysis),
              },
            },
          },
        });
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
      console.error(`Chyba při zpracování dat firmy:`, error);
      throw error;
    }
  }

  /**
   * Metoda pro scrollování a extrakci odkazů na firmy
   */
  private async scrollAndExtractLinks(): Promise<Partial<Business> & { link: string }[]> {
    if (!this.page) throw new Error('Browser nebyl inicializován');

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 5; // Maximální počet pokusů o scrollování

    // Selector pro výsledky vyhledávání
    const resultsSelector = 'a[href^="https://www.google.com/maps/place/"]';

    while (scrollAttempts < maxScrollAttempts) {
      // Scrollování dolů
      const currentHeight = await this.page.$eval('[role="feed"]', (div) => {
        return div.scrollHeight;
      });
      if (currentHeight === previousHeight) {
        // Pokud se výška nezměnila, pravděpodobně jsme na konci seznamu
        scrollAttempts++;
        await this.delay(300);
      } else {
        scrollAttempts = 0;
      }

      previousHeight = currentHeight;

      await this.page.$eval('[role="feed"]', (div) => {
        div.scrollTo(0, div.scrollHeight);
      });

      await this.delay(1000);
    }

    const links = await this.page.$$eval(resultsSelector, (elements) => {
      return elements.map((el) => el.getAttribute('href')!).filter(Boolean);
    });

    const html = await this.page.$$eval(resultsSelector, (elements) => {
      return elements.map((el) => el.parentElement?.innerHTML || el.innerHTML).filter(Boolean);
    });

    const data = await this.extractCompaniesWithGemini(html.join('\n'));

    return [...data, ...links.map((link) => ({ link }))];
  }

  /**
   * Extrakce dat o firmách z HTML Google Maps pomocí Google Gemini.
   * Vrací pole objektů s následujícími klíči:
   * - id: Unikátní identifikátor z Google Maps URL nebo náhodný řetězec
   * - name: Název firmy
   * - address: Adresa
   * - email: Emailová adresa (pokud je dostupná)
   * - phone: Telefonní číslo (pokud je dostupné)
   * - website: Webová stránka (pokud je dostupná)
   * - categories: Pole stringů s kategoriemi firmy (oblasti podnikání)
   * - reviewsCount: Počet recenzí
   * - link: Odkaz na detail firmy v Google Maps
   *
   * Pokud nějaká informace není dostupná, nastav její hodnotu na null.
   *
   * @param html HTML obsah Google Maps stránky
   * @returns Pole objektů s informacemi o firmách
   */

  async extractCompaniesWithGemini(html: string) {
    try {
      const prompt = `
      Extrahuj následující informace o firmách z této Google Maps stránky v HTML:
      - Název firmy
      - Adresa
      - Emailová adresa (pokud je dostupná)
      - Telefonní číslo (pokud je dostupné)
      - Webová stránka (pokud je dostupná)
      - Kategorie firmy (oblasti podnikání)
      - Počet recenzí

      Vrať data ve formátu JSON s těmito klíči:
      id, name, address, email, phone, website, categories (pole stringů), reviewsCount, link

      Jako ID použij unikátní identifikátor z Google Maps URL nebo vygeneruj náhodný řetězec.
      Pro link použij hodnotu z a[href^="https://www.google.com/maps/place/"]

      Pokud nějaká informace není dostupná, nastav její hodnotu na null. Vracej pouze výstup kopatibilní s JSON.parse.

      příklad
      [
        {
          "id": "unique-id",
          "name": "Business Name",
          "address": "Full address",
          "email": "email@example.com" or null if not found,
          "phone": "Phone number" or null if not found,
          "website": "Website URL" or null if not found,
          "categories": ["Category1", "Category2"],
          "rating": "4.5" or null if not found,
        }
      ]

      `;

      const result = await model.generateContent(
        prompt + '\n\nHTML content:\n' + html, //.substring(0, 100000),
      );

      const textResult = result.response.text().replace(/^```json|```$/gs, '');
      return JSON.parse(repairTruncatedJsonArray(textResult));
    } catch (error) {
      console.error('Chyba při extrakci dat pomocí Gemini:', error);
      // Vrátíme alespoň základní data
      return [];
    }
  }

  /**
   * Extrakce dat o firmě pomocí Google Gemini
   */
  private async extractCompanyDataWithGemini(html: string, link: string) {
    try {
      const prompt = `
      Extrahuj následující informace o firmě z této Google Maps stránky v HTML:
      - Název firmy
      - Adresa
      - Emailová adresa (pokud je dostupná)
      - Telefonní číslo (pokud je dostupné)
      - Webová stránka (pokud je dostupná)
      - Kategorie firmy (oblasti podnikání)
      - Počet recenzí

      Vrať data ve formátu JSON s těmito klíči:
      id, name, address, email, phone, website, categories (pole stringů), reviewsCount, link

      Jako ID použij unikátní identifikátor z Google Maps URL nebo vygeneruj náhodný řetězec.
      Pro link použij tuto hodnotu: ${link}

      Pokud nějaká informace není dostupná, nastav její hodnotu na null.

      příklad
      {
          "id": "unique-id",
          "name": "Business Name",
          "address": "Full address",
          "email": "email@example.com" or null if not found,
          "phone": "Phone number" or null if not found,
          "website": "Website URL" or null if not found,
          "categories": ["Category1", "Category2"],
          "rating": "4.5" or null if not found,
          "reviewsCount": 123 (as a number),
          "reviews": [{
            "name": "Reviewer name",
            "rating": "Rating",
            "message": "Review text"
          }]
        }

      `;

      const result = await model.generateContent(
        prompt + '\n\nHTML content:\n' + html.substring(0, 100000),
      );
      const textResult = result.response.text();

      // Parsování JSON z odpovědi
      const jsonMatch =
        textResult.match(/```json\n([\s\S]*?)\n```/) || textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      throw new Error('Nepodařilo se extrahovat JSON z odpovědi Gemini');
    } catch (error) {
      console.error('Chyba při extrakci dat pomocí Gemini:', error);
      // Vrátíme alespoň základní data
      return {
        id: `gm_${Date.now()}`,
        name: 'Neznámá firma',
        address: 'Neznámá adresa',
        email: null,
        phone: null,
        website: null,
        categories: [],
        reviewsCount: 0,
        link: link,
      };
    }
  }

  /**
   * Scrapování webové stránky firmy
   */
  private async scrapeWebsite(
    websiteUrl: string,
    existingEmail: string | null,
  ): Promise<WebsiteAnalysisResult> {
    try {
      const newPage = await this.browser?.newPage();
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
            const contactContent = await newPage.content();
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

      // Vytvoření screenshotů ve třech velikostech a jejich analýza
      const viewportAnalyses: Record<string, any> = {};
      const screenshots: Record<string, BusinessImage> = {};

      // Procházení všech velikostí viewportů
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

          // Analýza webu pro tuto velikost viewportu
          const viewportAnalysis = await this.analyzeWebsiteWithGemini(
            await newPage.content(),
            websiteUrl,
            size,
            dimensions,
          );

          viewportAnalyses[size] = viewportAnalysis;
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

      // Kombinovaná analýza webu ze všech velikostí viewportů
      const combinedAnalysis = this.combineWebsiteAnalyses(viewportAnalyses);

      // Zavření stránky
      await newPage.close();

      return {
        metadata,
        email,
        thumbnail,
        screenshots,
        viewportAnalyses,
        websiteAnalysis: combinedAnalysis,
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

  /**
   * Kombinuje analýzy z různých velikostí viewportů do jedné
   */
  private combineWebsiteAnalyses(viewportAnalyses: Record<string, any>) {
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
    let totalResponsiveScore = 0;
    let count = 0;
    let responsiveCount = 0;

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
    }

    return {
      seoScore: count > 0 ? totalSeoScore / count : null,
      designScore: count > 0 ? totalDesignScore / count : null,
      modernityScore: count > 0 ? totalModernityScore / count : null,
      responsiveScore: responsiveCount > 0 ? totalResponsiveScore / responsiveCount : null,
      errors: allErrors,
      recommendations: allRecommendations,
    };
  }
  /**
   * Extrakce emailu z HTML
   */
  private extractEmail(html: string): string | null {
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
   * Analýza webové stránky pomocí Google Gemini
   */
  private async analyzeWebsiteWithGemini(
    html: string,
    url: string,
    viewportSize: string = 'desktop',
    dimensions: { width: number; height: number } = { width: 1366, height: 768 },
  ) {
    try {
      const prompt = `
      Proveď SEO a design analýzu této webové stránky pro ${viewportSize} zařízení (${dimensions.width}x${dimensions.height}px). 
      URL: ${url}

      Vrať následující informace ve formátu JSON:
            Vrať následující informace ve formátu JSON:
      1. seoScore: Číslo od 0 do 100 hodnotící SEO kvalitu stránky
      2. errors: Pole stringů s nejzávažnějšími chybami na webu 
      3. designScore: Číslo od 0 do 100 hodnotící design stránky
      4. modernityScore: Číslo od 0 do 100 hodnotící, jak moderní stránka je
      5. recommendations: Pole stringů s doporučeními pro zlepšení 

      Hodnocení by mělo být založeno na:
      - SEO: meta tagy, struktura nadpisů, alt texty u obrázků, URL struktura
      - Design: přehlednost, responzivita, konzistence barev a fontů
      - Modernita: použité technologie, vizuální styl, UX prvky

      Analyzuj pouze dostupné informace v HTML.
      `;

      const result = await model.generateContent(
        prompt + '\n\nHTML content:\n' + html.substring(0, 100000),
      );
      const textResult = result.response.text();

      // Parsování JSON z odpovědi
      const jsonMatch =
        textResult.match(/```json\n([\s\S]*?)\n```/) || textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }

      throw new Error('Nepodařilo se extrahovat JSON z odpovědi Gemini');
    } catch (error) {
      console.error('Chyba při analýze webu pomocí Gemini:', error);
      return {
        seoScore: 0,
        errors: ['Nepodařilo se analyzovat web'],
        designScore: 0,
        modernityScore: 0,
        recommendations: ['Proveďte manuální analýzu webu'],
      };
    }
  }
}

export default AiGoogleMapsScraper;
