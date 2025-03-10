import { GoogleGenerativeAI } from '@google/generative-ai';
import { repairTruncatedJsonArray } from '../tools/json';
import dotenv from 'dotenv';
import AiGoogleMapsScraper from '../AiGoogleMapsScraper';
import fs from 'fs';
import path from 'path';

// Načtení proměnných prostředí
dotenv.config();

// Cesta k souboru pro ukládání stavu modelů
const MODEL_STATE_FILE = path.join(__dirname, '..', '..', 'gemini-models-state.json');

// Definice typu pro stav modelu
interface ModelState {
  name: string;
  exhausted: boolean;
  exhaustedAt: number | null; // Timestamp, kdy byl model vyčerpán
}

/**
 * Pomocná funkce pro detekci chyby "Too Many Requests" (status 429)
 * @param error Chyba, která má být zkontrolována
 * @param modelName Název modelu, který vrátil chybu
 * @param modelManager Manager modelů pro označení modelu jako vyčerpaného
 * @returns true, pokud jde o chybu 429, jinak false
 */
function isTooManyRequestsError(
  error: unknown,
  modelName: string,
  modelManager: ModelManager,
): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    error.response.status === 429
  ) {
    console.error(`Gemini API model ${modelName} vrátil chybu 429 (Too Many Requests)`);
    // Označíme model jako vyčerpaný
    modelManager.markModelAsExhausted(modelName);

    // Pokud jsou všechny modely vyčerpané, nastavíme globální flag
    if (modelManager.areAllModelsExhausted()) {
      AiGoogleMapsScraper.geminiTooManyRequestsError = true;
    }

    return true;
  }
  return false;
}

/**
 * Třída pro správu modelů Gemini
 */
class ModelManager {
  private models: ModelState[] = [];
  private currentModelIndex = 0;
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('VAROVÁNÍ: Proměnná prostředí GEMINI_API_KEY není nastavena.');
      console.warn('Extrakce dat pomocí Gemini AI nebude fungovat správně.');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);

    // Definice dostupných modelů
    const availableModels = [
      'gemini-2.0-flash-lite',
      'gemini-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];

    // Inicializace modelů
    this.initializeModels(availableModels);
  }

  /**
   * Inicializace modelů a načtení jejich stavu ze souboru
   */
  private initializeModels(modelNames: string[]) {
    // Pokud existuje soubor se stavem modelů, načteme ho
    if (fs.existsSync(MODEL_STATE_FILE)) {
      try {
        const savedState = JSON.parse(fs.readFileSync(MODEL_STATE_FILE, 'utf-8'));
        this.models = savedState;

        // Kontrola, zda některé modely již nejsou vyčerpané déle než 24 hodin
        const now = Date.now();
        this.models.forEach((model) => {
          if (
            model.exhausted &&
            model.exhaustedAt &&
            now - model.exhaustedAt > 24 * 60 * 60 * 1000
          ) {
            // Model byl vyčerpán před více než 24 hodinami, obnovíme ho
            console.log(
              `Obnovuji model ${model.name}, který byl vyčerpán před více než 24 hodinami`,
            );
            model.exhausted = false;
            model.exhaustedAt = null;
          }
        });

        // Uložíme aktualizovaný stav
        this.saveModelState();

        // Přidáme nové modely, které ještě nejsou ve stavu
        modelNames.forEach((name) => {
          if (!this.models.some((model) => model.name === name)) {
            this.models.push({
              name,
              exhausted: false,
              exhaustedAt: null,
            });
          }
        });
      } catch (error) {
        console.error('Chyba při načítání stavu modelů:', error);
        // Pokud se nepodaří načíst stav, inicializujeme modely znovu
        this.initializeNewModels(modelNames);
      }
    } else {
      // Pokud soubor neexistuje, inicializujeme modely jako nové
      this.initializeNewModels(modelNames);
    }

    // Nastavíme aktuální model na první nevyčerpaný
    this.setCurrentModelToFirstNonExhausted();
  }

  /**
   * Inicializace nových modelů
   */
  private initializeNewModels(modelNames: string[]) {
    this.models = modelNames.map((name) => ({
      name,
      exhausted: false,
      exhaustedAt: null,
    }));
    this.saveModelState();
  }

  /**
   * Uložení stavu modelů do souboru
   */
  private saveModelState() {
    try {
      fs.writeFileSync(MODEL_STATE_FILE, JSON.stringify(this.models, null, 2));
    } catch (error) {
      console.error('Chyba při ukládání stavu modelů:', error);
    }
  }

  /**
   * Nastavení aktuálního modelu na první nevyčerpaný
   */
  private setCurrentModelToFirstNonExhausted() {
    const nonExhaustedIndex = this.models.findIndex((model) => !model.exhausted);
    if (nonExhaustedIndex !== -1) {
      this.currentModelIndex = nonExhaustedIndex;
    } else {
      // Všechny modely jsou vyčerpané
      console.warn('Všechny modely Gemini jsou vyčerpané!');
      this.currentModelIndex = 0; // Použijeme první model, i když je vyčerpaný
    }
  }

  /**
   * Získání aktuálního modelu
   */
  getCurrentModel() {
    return this.genAI.getGenerativeModel({ model: this.models[this.currentModelIndex].name });
  }

  /**
   * Získání názvu aktuálního modelu
   */
  getCurrentModelName() {
    return this.models[this.currentModelIndex].name;
  }

  /**
   * Označení modelu jako vyčerpaného
   */
  markModelAsExhausted(modelName: string) {
    const modelIndex = this.models.findIndex((model) => model.name === modelName);
    if (modelIndex !== -1) {
      this.models[modelIndex].exhausted = true;
      this.models[modelIndex].exhaustedAt = Date.now();
      console.log(`Model ${modelName} označen jako vyčerpaný`);

      // Uložíme aktualizovaný stav
      this.saveModelState();

      // Přepneme na další nevyčerpaný model, pokud existuje
      this.setCurrentModelToFirstNonExhausted();
    }
  }

  /**
   * Kontrola, zda jsou všechny modely vyčerpané
   */
  areAllModelsExhausted() {
    return this.models.every((model) => model.exhausted);
  }
}

/**
 * Služba pro práci s Google Gemini AI
 */
export class GeminiService {
  private modelManager: ModelManager;

  constructor() {
    this.modelManager = new ModelManager();
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

      const currentModel = this.modelManager.getCurrentModel();
      const currentModelName = this.modelManager.getCurrentModelName();
      console.log(`Používám model ${currentModelName} pro extrakci dat o firmách`);

      const result = await currentModel.generateContent(prompt + '\n\nHTML content:\n' + html);

      const textResult = result.response.text().replace(/^```json|```$/gs, '');
      return JSON.parse(repairTruncatedJsonArray(textResult));
    } catch (error) {
      console.error('Chyba při extrakci dat pomocí Gemini:', error);

      // Kontrola, zda se jedná o chybu 429 (Too Many Requests)
      isTooManyRequestsError(error, this.modelManager.getCurrentModelName(), this.modelManager);

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

      const currentModel = this.modelManager.getCurrentModel();
      const currentModelName = this.modelManager.getCurrentModelName();
      console.log(`Používám model ${currentModelName} pro extrakci dat o firmě`);

      const result = await currentModel.generateContent(
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

      // Kontrola, zda se jedná o chybu 429 (Too Many Requests)
      isTooManyRequestsError(error, this.modelManager.getCurrentModelName(), this.modelManager);

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

      const currentModel = this.modelManager.getCurrentModel();
      const currentModelName = this.modelManager.getCurrentModelName();
      console.log(`Používám model ${currentModelName} pro analýzu webové stránky`);

      const result = await currentModel.generateContent(prompt + htmlContentText);
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

      // Kontrola, zda se jedná o chybu 429 (Too Many Requests)
      isTooManyRequestsError(error, this.modelManager.getCurrentModelName(), this.modelManager);

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

      const currentModel = this.modelManager.getCurrentModel();
      const currentModelName = this.modelManager.getCurrentModelName();
      console.log(`Používám model ${currentModelName} pro analýzu webové stránky`);

      const result = await currentModel.generateContent(
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

      // Kontrola, zda se jedná o chybu 429 (Too Many Requests)
      isTooManyRequestsError(error, this.modelManager.getCurrentModelName(), this.modelManager);

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
