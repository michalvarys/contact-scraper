import { BaseScraper, ScraperConfig } from './BaseScraper';
import { BaseBusinessData } from '../types';

export class FirmyCzScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  public async searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');

    // Navigace na Firmy.cz
    await this.page.goto('https://www.firmy.cz', { waitUntil: 'networkidle2' });

    // Akceptování cookies, pokud se zobrazí
    try {
      const cookieButton = await this.page.$('button#didomi-notice-agree-button');
      if (cookieButton) {
        await cookieButton.click();
        await this.randomDelay(500, 1000);
      }
    } catch (error) {
      console.log('Cookie dialog not found or could not be accepted');
    }

    // Vyhledání dotazu
    await this.page.waitForSelector('input[name="what"]');
    await this.page.type('input[name="what"]', query);
    await this.page.keyboard.press('Enter');

    // Počkání na výsledky
    await this.page.waitForSelector('.search-result-item', { timeout: 10000 });
    await this.randomDelay(1000, 2000);

    // Scrollování pro načtení více výsledků
    await this.scrollToBottom();
    await this.randomDelay(1000, 2000);

    // Získání odkazů na detaily firem
    const links = await this.page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.search-result-item h3 a'));
      return results.map((a) => (a as HTMLAnchorElement).href);
    });

    const uniqueLinks = [...new Set(links)];
    console.log(`Found ${uniqueLinks.length} links on Firmy.cz for query: ${query}`);
    if (onBatch && uniqueLinks.length > 0) {
      await onBatch(uniqueLinks);
    }
    return uniqueLinks; // Odstranění duplicit
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
      const addressElement = document.querySelector('.address');
      const address = addressElement ? addressElement.textContent?.trim() || null : null;

      // Rozdělení adresy na části
      let city = null;
      let region = null;
      let postalCode = null;
      let country = 'Česká republika';

      if (address) {
        const parts = address.split(',').map((part) => part.trim());
        if (parts.length >= 2) {
          // Poslední část obvykle obsahuje PSČ a město
          const lastPart = parts[parts.length - 1];
          const postalMatch = lastPart.match(/\d{3}\s*\d{2}/);
          if (postalMatch) {
            postalCode = postalMatch[0].replace(/\s+/g, ' ');
            city = lastPart.replace(postalCode, '').trim();
          } else {
            city = lastPart;
          }

          // Pokud je více částí, předpokládáme, že předposlední může být region
          if (parts.length > 2) {
            region = parts[parts.length - 2];
          }
        }
      }

      // Telefon
      const phoneElement = document.querySelector('.contact-phone');
      let phone = null;
      if (phoneElement) {
        const phoneText = phoneElement.textContent?.trim();
        if (phoneText) {
          // Extrakce telefonního čísla z textu
          const phoneMatch = phoneText.match(/\+?\d[\d\s]+/);
          phone = phoneMatch ? phoneMatch[0].trim() : null;
        }
      }

      // Email
      const emailElement = document.querySelector('.contact-email');
      let email = null;
      if (emailElement) {
        const emailLink = emailElement.querySelector('a');
        if (emailLink) {
          const href = emailLink.getAttribute('href');
          if (href && href.startsWith('mailto:')) {
            email = href.substring(7);
          }
        }
      }

      // Web
      const websiteElement = document.querySelector('.contact-website a');
      const website = websiteElement ? (websiteElement as HTMLAnchorElement).href || null : null;

      // Otevírací doba
      const hoursElements = document.querySelectorAll('.opening-hours-day');
      const openingHours = Array.from(hoursElements)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(', ');

      // Kategorie
      const categoryElements = document.querySelectorAll('.category-list a');
      const categories: string[] = Array.from(categoryElements)
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));

      // Popis
      const descriptionElement = document.querySelector('.company-info-text');
      const description = descriptionElement
        ? descriptionElement.textContent?.trim() || null
        : null;

      // Souřadnice
      let latitude = null;
      let longitude = null;
      const mapElement = document.querySelector('.map-container');
      if (mapElement) {
        const latAttr = mapElement.getAttribute('data-lat');
        const lngAttr = mapElement.getAttribute('data-lng');
        if (latAttr && lngAttr) {
          latitude = parseFloat(latAttr);
          longitude = parseFloat(lngAttr);
        }
      }

      // Hodnocení
      const ratingElement = document.querySelector('.rating-value');
      let rating = null;
      if (ratingElement) {
        const ratingText = ratingElement.textContent?.trim();
        if (ratingText) {
          const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
          rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
        }
      }

      // Počet recenzí
      const reviewElement = document.querySelector('.rating-count');
      let reviewCount = null;
      if (reviewElement) {
        const reviewText = reviewElement.textContent?.trim();
        if (reviewText) {
          const reviewMatch = reviewText.match(/(\d+)/);
          reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : null;
        }
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
        email,
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
