import { BaseScraper, ScraperConfig } from './BaseScraper';
import { BaseBusinessData } from '../types';

export class GoogleMapsScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  public async searchLinks(query: string): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');

    // Navigace na Google Maps
    await this.page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });

    // Vyhledání dotazu
    await this.page.waitForSelector('#searchboxinput');
    await this.page.type('#searchboxinput', query);
    await this.page.keyboard.press('Enter');

    // Počkání na výsledky
    await this.page.waitForSelector('[role="feed"]', { timeout: 10000 });
    await this.randomDelay(2000, 3000);

    // Scrollování pro načtení více výsledků
    await this.scrollToBottom();
    await this.randomDelay(1000, 2000);

    // Získání odkazů na detaily firem
    const links = await this.page.evaluate(() => {
      const results = Array.from(
        document.querySelectorAll('[role="feed"] a[href^="https://www.google.com/maps/place/"]'),
      );
      return results.map((a) => (a as HTMLAnchorElement).href);
    });

    console.log(`Found ${links.length} links on Google Maps for query: ${query}`);
    return [...new Set(links)]; // Odstranění duplicit
  }

  public async scrapeLink(link: string): Promise<BaseBusinessData> {
    if (!this.page) throw new Error('Page not initialized');

    // Navigace na stránku detailu
    await this.page.goto(link, { waitUntil: 'networkidle2' });
    await this.randomDelay(1000, 2000);

    // Extrakce dat
    const data = await this.page.evaluate(() => {
      // Pomocné funkce
      const getText = (selector: string): string | null => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || null : null;
      };

      const getMultipleTexts = (selector: string): string[] => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements)
          .map((el) => el.textContent?.trim() || '')
          .filter(Boolean);
      };

      // Extrakce dat
      const name = getText('h1') || 'Unknown';

      // Adresa
      const addressElement = document.querySelector('button[data-item-id="address"]');
      const address = addressElement ? addressElement.textContent?.trim() || null : null;

      // Rozdělení adresy na části
      let city = null;
      let region = null;
      let postalCode = null;
      let country = null;

      if (address) {
        const parts = address.split(',').map((part) => part.trim());
        if (parts.length >= 3) {
          city = parts[parts.length - 3] || null;

          // Pokus o extrakci PSČ a regionu
          const regionPostalPart = parts[parts.length - 2] || '';
          const postalMatch = regionPostalPart.match(/\d{5}/);
          if (postalMatch) {
            postalCode = postalMatch[0];
            region = regionPostalPart.replace(postalCode, '').trim();
          } else {
            region = regionPostalPart;
          }

          country = parts[parts.length - 1] || null;
        }
      }

      // Telefon
      const phoneElement = document.querySelector('button[data-item-id="phone:tel"]');
      const phone = phoneElement ? phoneElement.textContent?.trim() || null : null;

      // Web
      const websiteElement = document.querySelector('a[data-item-id="authority"]');
      const website = websiteElement ? (websiteElement as HTMLAnchorElement).href || null : null;

      // Otevírací doba
      const hoursElements = document.querySelectorAll('[aria-label="Otevírací doba"] tr');
      const openingHours = Array.from(hoursElements)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(', ');

      // Kategorie
      const categoryElements = document.querySelectorAll('button[jsaction="pane.rating.category"]');
      const categories: string[] = Array.from(categoryElements)
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text)); // Type guard pro odstranění undefined

      // Hodnocení
      const ratingText = getText('div[role="img"][aria-label*="hvězdičky"]');
      let rating = null;
      if (ratingText) {
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      }

      // Počet recenzí
      const reviewText = getText('button[jsaction="pane.rating.moreReviews"]');
      let reviewCount = null;
      if (reviewText) {
        const reviewMatch = reviewText.match(/(\d+)/);
        reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : null;
      }

      // Popis
      const description = getText('[data-attrid="description"]') || null;

      // Souřadnice
      const url = window.location.href;
      let latitude = null;
      let longitude = null;
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
      }

      return {
        name,
        description,
        address,
        city,
        region,
        postalCode,
        country,
        phone,
        website,
        openingHours: openingHours || null,
        categories: categories || [],
        rating,
        reviewCount,
        latitude,
        longitude,
      };
    });

    console.log(`Scraped data for: ${data.name}`);
    // @ts-ignore
    return data;
  }
}
