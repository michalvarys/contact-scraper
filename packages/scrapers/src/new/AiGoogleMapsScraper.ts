import { BaseScraper, ScraperConfig } from './BaseScraper';
import { BaseBusinessData } from '../types';

export class AiGoogleMapsScraper extends BaseScraper {
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

    // Scrollování pro načtení více výsledků (více než základní implementace)
    for (let i = 0; i < 5; i++) {
      await this.scrollToBottom();
      await this.randomDelay(1000, 2000);
    }

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

    // Pokročilá extrakce dat s využitím AI přístupu
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

      // Pokročilá extrakce dat s využitím více selektorů a heuristik

      // Název firmy - zkusíme více selektorů
      let name = getText('h1');
      if (!name) {
        name =
          getText('[data-attrid="title"]') || getText('.section-hero-header-title') || 'Unknown';
      }

      // Adresa - zkusíme více selektorů a formátů
      let address = null;
      const addressSelectors = [
        'button[data-item-id="address"]',
        '[data-attrid="kc:/location/location:address"]',
        '.section-info-line [data-tooltip="Adresa"]',
        'button[aria-label*="Adresa"]',
      ];

      for (const selector of addressSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          address = element.textContent.trim();
          break;
        }
      }

      // Rozdělení adresy na části s pokročilou logikou
      let city = null;
      let region = null;
      let postalCode = null;
      let country = null;

      if (address) {
        // Odstranění "Adresa: " a podobných prefixů
        address = address.replace(/^(adresa|address|location):\s*/i, '');

        const parts = address.split(',').map((part) => part.trim());

        // Pokročilá logika pro extrakci částí adresy
        if (parts.length >= 1) {
          // Poslední část je obvykle země
          country = parts[parts.length - 1] || null;

          // Předposlední část obvykle obsahuje PSČ a město
          if (parts.length >= 2) {
            const cityPostalPart = parts[parts.length - 2] || '';

            // Hledání PSČ v různých formátech (CZ, US, UK, atd.)
            const postalMatches = cityPostalPart.match(
              /(\d{3}\s*\d{2}|\d{5}|\d{4}|\w\d\w\s*\d\w\d)/,
            );
            if (postalMatches) {
              postalCode = postalMatches[0].replace(/\s+/g, ' ');
              city = cityPostalPart.replace(postalCode, '').trim();
            } else {
              city = cityPostalPart;
            }

            // Region je obvykle třetí od konce
            if (parts.length >= 3) {
              region = parts[parts.length - 3] || null;
            }
          }
        }
      }

      // Telefon - zkusíme více selektorů a formátů
      let phone = null;
      const phoneSelectors = [
        'button[data-item-id="phone:tel"]',
        '[data-attrid="kc:/collection/knowledge_panels/has_phone:phone"]',
        '.section-info-line [data-tooltip="Telefon"]',
        'button[aria-label*="Telefon"]',
      ];

      for (const selector of phoneSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const phoneText = element.textContent.trim();
          // Extrakce telefonního čísla z textu
          const phoneMatch = phoneText.match(/[\+\d][\d\s\(\)\-\.]{6,}/);
          if (phoneMatch) {
            phone = phoneMatch[0].trim();
            break;
          }
        }
      }

      // Web - zkusíme více selektorů
      let website = null;
      const websiteSelectors = [
        'a[data-item-id="authority"]',
        '[data-attrid="kc:/common/topic:official website"] a',
        '.section-info-line [data-tooltip="Web"] a',
        'a[aria-label*="Web"]',
      ];

      for (const selector of websiteSelectors) {
        const element = document.querySelector(selector);
        if (element && (element as HTMLAnchorElement).href) {
          website = (element as HTMLAnchorElement).href;
          // Odstranění parametrů sledování
          website = website.split('?')[0];
          break;
        }
      }

      // Email - hledání v textu a odkazech
      let email = null;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

      // Hledání v odkazech mailto:
      const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
      if (mailtoLinks.length > 0) {
        const href = mailtoLinks[0].getAttribute('href');
        if (href) {
          const emailMatch = href.match(emailRegex);
          if (emailMatch) {
            email = emailMatch[0];
          }
        }
      }

      // Pokud jsme nenašli v odkazech, hledáme v textu
      if (!email) {
        const pageText = document.body.innerText;
        const emailMatch = pageText.match(emailRegex);
        if (emailMatch) {
          email = emailMatch[0];
        }
      }

      // Otevírací doba - zkusíme více selektorů a formátů
      let openingHours = null;
      const hoursSelectors = [
        '[aria-label="Otevírací doba"] tr',
        '[data-attrid="kc:/location/location:hours"] table tr',
        '.section-open-hours-container tr',
      ];

      for (const selector of hoursSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          openingHours = Array.from(elements)
            .map((el) => el.textContent?.trim())
            .filter(Boolean)
            .join(', ');
          break;
        }
      }

      // Kategorie - zkusíme více selektorů
      const categories: string[] = [];
      const categorySelectors = [
        'button[jsaction="pane.rating.category"]',
        '[data-attrid="kc:/local:one line category list"] span',
        '.section-rating-term span',
      ];

      for (const selector of categorySelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const newCategories = Array.from(elements)
            .map((el) => el.textContent?.trim())
            .filter((text): text is string => Boolean(text));

          categories.push(...newCategories);
          break;
        }
      }

      // Hodnocení - zkusíme více selektorů a formátů
      let rating = null;
      const ratingSelectors = [
        'div[role="img"][aria-label*="hvězdičky"]',
        'div[role="img"][aria-label*="stars"]',
        '[data-attrid="kc:/collection/knowledge_panels/local_reviewable:star_score"] span',
        '.section-star-display',
      ];

      for (const selector of ratingSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const ratingText = element.textContent?.trim() || element.getAttribute('aria-label');
          if (ratingText) {
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]);
              break;
            }
          }
        }
      }

      // Počet recenzí - zkusíme více selektorů a formátů
      let reviewCount = null;
      const reviewSelectors = [
        'button[jsaction="pane.rating.moreReviews"]',
        '[data-attrid="kc:/collection/knowledge_panels/local_reviewable:star_score"] ~ span',
        '.section-rating-term button',
      ];

      for (const selector of reviewSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const reviewText = element.textContent?.trim();
          if (reviewText) {
            const reviewMatch = reviewText.match(/(\d[\d\s,.]*)/);
            if (reviewMatch) {
              // Odstranění mezer, čárek a teček z čísla
              const cleanNumber = reviewMatch[1].replace(/[\s,.]/g, '');
              reviewCount = parseInt(cleanNumber, 10);
              break;
            }
          }
        }
      }

      // Popis - zkusíme více selektorů
      let description = null;
      const descriptionSelectors = [
        '[data-attrid="description"]',
        '.section-editorial-quote',
        'div[jsaction="pane.rating.category"] ~ div',
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          description = element.textContent?.trim() || null;
          if (description) break;
        }
      }

      // Souřadnice - extrakce z URL nebo z dat na stránce
      let latitude = null;
      let longitude = null;

      // Zkusíme extrahovat z URL
      const url = window.location.href;
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
      }

      // Pokud se nepodařilo z URL, zkusíme najít v datech na stránce
      if (!latitude || !longitude) {
        // Hledání v meta tazích
        const metaTags = Array.from(document.querySelectorAll('meta'));
        for (const tag of metaTags) {
          const content = tag.getAttribute('content');
          if (content && content.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
            const [lat, lng] = content.split(',').map(parseFloat);
            latitude = lat;
            longitude = lng;
            break;
          }
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
        openingHours,
        categories: categories || [],
        rating,
        reviewCount,
        latitude,
        longitude,
      };
    });

    console.log(`AI-enhanced scraping completed for: ${data.name}`);
    return data;
  }
}
