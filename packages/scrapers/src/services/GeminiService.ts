import { GoogleGenerativeAI } from '@google/generative-ai';
import { repairTruncatedJsonArray } from '../tools/json';
import dotenv from 'dotenv';

// Načtení proměnných prostředí
dotenv.config();

/**
 * Služba pro práci s Google Gemini AI
 */
export class GeminiService {
  private model;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('VAROVÁNÍ: Proměnná prostředí GEMINI_API_KEY není nastavena.');
      console.warn('Extrakce dat pomocí Gemini AI nebude fungovat správně.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
  async extractCompaniesFromHtml(html: string) {
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
      Pro link použij hodnotu z a[href^="https://www.google.com/maps/place/"] a odeber z linku search query kde je utm_*

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

      const result = await this.model.generateContent(prompt + '\n\nHTML content:\n' + html);

      const textResult = result.response.text().replace(/^```json|```$/gs, '');
      return JSON.parse(repairTruncatedJsonArray(textResult));
    } catch (error) {
      console.error('Chyba při extrakci dat pomocí Gemini:', error);
      // Vrátíme alespoň základní data
      return [];
    }
  }

  /**
   * Extrakce dat o firmě z HTML Google Maps pomocí Google Gemini
   * @param html HTML obsah stránky
   * @param link Odkaz na detail firmy
   * @returns Data o firmě
   */
  async extractCompanyDataFromHtml(html: string, link: string) {
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
      Pro link použij tuto hodnotu: ${link} a odeber z linku search query kde je utm_*

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

      const result = await this.model.generateContent(
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
   * Analýza webové stránky pomocí Google Gemini s přiloženými screenshoty
   * @param htmlContents HTML obsahy stránky pro různé velikosti viewportů
   * @param screenshotUrls URL adresy screenshotů pro různé velikosti viewportů
   * @param url URL stránky
   * @returns Komplexní analýza webové stránky
   */
  async analyzeWebsiteWithScreenshots(
    htmlContents: Record<string, string>,
    screenshotUrls: Record<string, string>,
    url: string,
  ) {
    try {
      const viewportSizes = {
        sm: { width: 375, height: 667 }, // Mobilní telefon
        md: { width: 768, height: 1024 }, // Tablet
        lg: { width: 1366, height: 768 }, // Desktop
      };

      // TODO
      // Vytvoření popisu screenshotů
      const screenshotDescriptions = Object.entries(screenshotUrls)
        .map(([size, url]) => {
          const dimensions = viewportSizes[size as keyof typeof viewportSizes];
          return `- Screenshot pro ${size} zařízení (${dimensions.width}x${dimensions.height}px): ${url}`;
        })
        .join('\n');

      const prompt = `
      Proveď komplexní SEO a design analýzu této webové stránky pro různé velikosti zařízení.
      URL: ${url}

      Mám k dispozici screenshoty stránky pro různé velikosti zařízení:
      ${screenshotDescriptions}

      Prohlédni si všechny screenshoty a analyzuj, jak se stránka chová na různých zařízeních.

      Vrať následující informace ve formátu JSON:
      1. seoScore: Číslo od 0 do 100 hodnotící celkovou SEO kvalitu stránky
      2. designScore: Číslo od 0 do 100 hodnotící celkový design stránky
      3. modernityScore: Číslo od 0 do 100 hodnotící, jak moderní stránka je
      4. responsiveScore: Číslo od 0 do 100 hodnotící responzivitu stránky (jak dobře se přizpůsobuje různým zařízením)
      5. errors: Pole stringů s nejzávažnějšími chybami na webu
      6. recommendations: Pole stringů s doporučeními pro zlepšení
      7. viewportAnalyses: Objekt s analýzami pro jednotlivé velikosti viewportů (sm, md, lg), kde každá analýza obsahuje:
         - seoScore: Číslo od 0 do 100
         - designScore: Číslo od 0 do 100
         - modernityScore: Číslo od 0 do 100
         - errors: Pole stringů s chybami specifickými pro tuto velikost
         - recommendations: Pole stringů s doporučeními specifickými pro tuto velikost

      Hodnocení by mělo být založeno na:
      - SEO: meta tagy, struktura nadpisů, alt texty u obrázků, URL struktura
      - Design: přehlednost, konzistence barev a fontů, čitelnost
      - Modernita: použité technologie, vizuální styl, UX prvky
      - Responzivita: jak dobře se stránka přizpůsobuje různým velikostem obrazovky, čitelnost textu, použitelnost navigace

      Porovnej, jak se stránka zobrazuje na různých zařízeních a zhodnoť, zda je dobře optimalizovaná pro všechny velikosti.
      `;

      // Přidání HTML obsahů pro jednotlivé velikosti
      let htmlContentText = '\n\nHTML obsahy pro jednotlivé velikosti:\n';
      for (const [size, html] of Object.entries(htmlContents)) {
        htmlContentText += `\n--- HTML pro ${size} ---\n${html.substring(0, 30000)}\n`;
      }

      const result = await this.model.generateContent(prompt + htmlContentText);
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
        designScore: 0,
        modernityScore: 0,
        responsiveScore: 0,
        errors: ['Nepodařilo se analyzovat web'],
        recommendations: ['Proveďte manuální analýzu webu'],
        viewportAnalyses: {
          sm: {
            seoScore: 0,
            designScore: 0,
            modernityScore: 0,
            errors: ['Nepodařilo se analyzovat web'],
            recommendations: ['Proveďte manuální analýzu webu'],
          },
          md: {
            seoScore: 0,
            designScore: 0,
            modernityScore: 0,
            errors: ['Nepodařilo se analyzovat web'],
            recommendations: ['Proveďte manuální analýzu webu'],
          },
          lg: {
            seoScore: 0,
            designScore: 0,
            modernityScore: 0,
            errors: ['Nepodařilo se analyzovat web'],
            recommendations: ['Proveďte manuální analýzu webu'],
          },
        },
      };
    }
  }

  /**
   * Analýza webové stránky pomocí Google Gemini (zastaralá metoda, použijte analyzeWebsiteWithScreenshots)
   * @param html HTML obsah stránky
   * @param url URL stránky
   * @param viewportSize Velikost viewportu (sm, md, lg)
   * @param dimensions Rozměry viewportu
   * @returns Analýza webové stránky
   * @deprecated Použijte analyzeWebsiteWithScreenshots
   */
  async analyzeWebsite(
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

      const result = await this.model.generateContent(
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

// Export instance služby pro snadné použití
export const geminiService = new GeminiService();
