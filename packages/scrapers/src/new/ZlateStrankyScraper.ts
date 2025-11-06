import { BaseScraper, ScraperConfig } from './BaseScraper';
import { BaseBusinessData } from '../types';

export class ZlateStrankyScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  public async searchLinks(
    query: string,
    onBatch?: (links: string[]) => Promise<void> | void,
  ): Promise<string[]> {
    await this.ensurePage();
    if (!this.page) throw new Error('Page not initialized');

    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.zlatestranky.cz/firmy/hledani/${encodedQuery}`;

    await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await this.randomDelay(1000, 2000);

    // Akceptování cookies, pokud se zobrazí (stačí jednou)
    try {
      const cookieButton = await this.page.$(
        'button.accept-cookies, button[id*="cookie"], button[class*="cookie"]',
      );
      if (cookieButton) {
        await cookieButton.click();
        await this.randomDelay(500, 1000);
      }
    } catch (error) {
      console.log('Cookie dialog not found or could not be accepted');
    }

    // Počkání na výsledky - zlate stranky může mít různé selektory
    try {
      await this.page.waitForSelector('a[href*="/profil/"]', { timeout: 10000 });
    } catch (error) {
      console.log('No results found on page');
      return [];
    }

    await this.randomDelay(1000, 2000);

    const normalizeUrl = (rawUrl: string): string => {
      try {
        const parsed = new URL(rawUrl);
        parsed.hash = '';
        return parsed.toString();
      } catch {
        return rawUrl;
      }
    };

    const collectedLinks = new Set<string>();
    const visitedPages = new Set<string>();

    while (true) {
      if (!this.page) break;

      const currentUrl = normalizeUrl(this.page.url());
      if (visitedPages.has(currentUrl)) {
        console.log(`Already processed page ${currentUrl}, stopping pagination loop.`);
        break;
      }
      visitedPages.add(currentUrl);

      try {
        await this.page.waitForSelector('a[href*="/profil/"]', { timeout: 10000 });
      } catch (error) {
        console.log(`No results found on page ${currentUrl}`);
        break;
      }

      await this.randomDelay(1000, 2000);
      await this.scrollToBottom();
      await this.randomDelay(1000, 2000);

      const links: string[] = await this.page.evaluate(() => {
        const profileLinks = Array.from(document.querySelectorAll('a[href*="/profil/"]'));
        const uniqueLinks = new Set<string>();

        profileLinks.forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const match = href.match(/(https?:\/\/[^\/]+\/profil\/[^\/\?#]+)/);
          if (match) {
            uniqueLinks.add(match[1]);
          }
        });

        return Array.from(uniqueLinks);
      });

      const newLinks: string[] = [];
      links.forEach((link) => {
        if (!collectedLinks.has(link)) {
          collectedLinks.add(link);
          newLinks.push(link);
        }
      });

      if (newLinks.length > 0 && onBatch) {
        await onBatch(newLinks);
      }

      const nextPageUrl: string | null = await this.page.evaluate(() => {
        const pagination = document.querySelector('.pagination');
        if (!pagination) {
          return null;
        }

        const activeLi = pagination.querySelector('li.active');
        const arrowCandidates = Array.from(pagination.querySelectorAll('li:not(.disabled) a'));

        const nextArrow = arrowCandidates.find((anchorElement) => {
          const text = anchorElement.textContent?.trim() || '';
          return text === '»' || text === '›';
        }) as HTMLLinkElement | undefined;

        if (nextArrow?.href) {
          return nextArrow.href;
        }

        let cursor = activeLi?.nextElementSibling as HTMLElement | null;
        while (cursor) {
          if (cursor.classList.contains('disabled')) {
            cursor = cursor.nextElementSibling as HTMLElement | null;
            continue;
          }

          const anchor = cursor.querySelector('a[href]') as HTMLAnchorElement | null;
          if (anchor) {
            const text = anchor.textContent?.trim() || '';
            if (text && text !== '...' && text !== '«' && text !== '<') {
              return anchor.href;
            }
          }

          cursor = cursor.nextElementSibling as HTMLElement | null;
        }

        return null;
      });

      if (!nextPageUrl) {
        break;
      }

      const normalizedNext = normalizeUrl(nextPageUrl);
      if (visitedPages.has(normalizedNext)) {
        break;
      }

      await this.page.goto(nextPageUrl, { waitUntil: 'networkidle2' });
      await this.randomDelay(1000, 2000);
    }

    console.log(`Found ${collectedLinks.size} links on Zlate Stranky for query: ${query}`);
    return Array.from(collectedLinks);
  }

  public async scrapeLink(link: string): Promise<BaseBusinessData> {
    await this.ensurePage();
    if (!this.page) throw new Error('Page not initialized');

    // Navigace na stránku profilu
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

      // Extrakce názvu firmy
      const name = getText('h1') || 'Unknown';

      // Extrakce adresy z itemProp
      const addressElement = document.querySelector('[itemprop="address"]');
      let fullAddress = null;
      let city = null;
      let region = null;
      let postalCode = null;
      const country = 'Česká republika';

      if (addressElement) {
        const streetAddress = addressElement
          .querySelector('[itemprop="streetAddress"]')
          ?.getAttribute('content');
        const addressLocality = addressElement
          .querySelector('[itemprop="addressLocality"]')
          ?.getAttribute('content');
        const addressPostalCode = addressElement
          .querySelector('[itemprop="postalCode"]')
          ?.getAttribute('content');
        const descriptionElement = addressElement.querySelector('[itemprop="description"]');

        // Pokud máme metadata
        if (streetAddress && addressLocality && addressPostalCode) {
          fullAddress = `${streetAddress}, ${addressPostalCode} ${addressLocality}`;
          city = addressLocality;
          postalCode = addressPostalCode;
        } else if (descriptionElement) {
          // Získáme popis adresy
          fullAddress = descriptionElement.textContent?.trim() || null;

          // Pokusíme se extrahovat PSČ a město
          if (fullAddress) {
            const postalMatch = fullAddress.match(/(\d{3}\s*\d{2})\s+([^,\n<]+)/);
            if (postalMatch) {
              postalCode = postalMatch[1].replace(/\s+/g, ' ');
              city = postalMatch[2].trim();
            }

            // Extrakce okresu/regionu
            const regionMatch = fullAddress.match(/okres\s+([^,\n<]+)/i);
            if (regionMatch) {
              region = regionMatch[1].trim();
            }
          }
        }
      }

      // Extrakce telefonních čísel
      const phoneElements = document.querySelectorAll('[itemprop="telephone"]');
      let phone = null;
      if (phoneElements.length > 0) {
        // Vezmeme první telefon
        phone = phoneElements[0].textContent?.trim() || null;
      }

      // Extrakce emailu
      const emailElements = document.querySelectorAll('a[href^="mailto:"]');
      let email = null;
      if (emailElements.length > 0) {
        const href = emailElements[0].getAttribute('href');
        if (href && href.startsWith('mailto:')) {
          email = href.substring(7);
        }
      }

      // Extrakce webu
      const websiteElements = document.querySelectorAll('[itemprop="url"]');
      let website = null;
      for (let i = 0; i < websiteElements.length; i++) {
        const el = websiteElements[i];
        if (el.tagName === 'A') {
          const href = (el as HTMLAnchorElement).href;
          // Ignorujeme interní odkazy zlatestranky
          if (href && !href.includes('zlatestranky.cz')) {
            website = href;
            break;
          }
        }
      }

      // Extrakce kategorie
      const categoryElements = document.querySelectorAll('.tag, a[href*="/firmy/rubrika/"]');
      const categories: string[] = Array.from(categoryElements)
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));

      // Extrakce souřadnic z mapy (pokud jsou dostupné)
      let latitude = null;
      let longitude = null;
      const mapElement = document.querySelector('[data-centerpoi]');
      if (mapElement) {
        try {
          const centerPoi = mapElement.getAttribute('data-centerpoi');
          if (centerPoi) {
            const poiData = JSON.parse(centerPoi);
            if (poiData.lat && poiData.lng) {
              latitude = parseFloat(poiData.lat);
              longitude = parseFloat(poiData.lng);
            }
          }
        } catch (e) {
          console.error('Error parsing map coordinates:', e);
        }
      }

      // Extrakce popisu (pokud existuje)
      const descriptionElement = document.querySelector('.company-description, .description');
      const description = descriptionElement
        ? descriptionElement.textContent?.trim() || null
        : null;

      return {
        name,
        description,
        address: fullAddress,
        city,
        region,
        postalCode,
        country,
        phone,
        email,
        website,
        openingHours: null, // Zlate stranky nemají standardizované otevírací hodiny
        categories: categories || [],
        rating: null, // Pokud není k dispozici
        reviewCount: null, // Pokud není k dispozici
        latitude,
        longitude,
      };
    });

    console.log(`Scraped data for: ${data.name}`);
    // @ts-ignore
    return data;
  }
}
