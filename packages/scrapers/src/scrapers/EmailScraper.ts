import axios from 'axios';
import * as cheerio from 'cheerio';
import * as xml2js from 'xml2js';
import { URL } from 'url';

export class EmailScraper {
  private emailRegex: RegExp = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private contactPageKeywords: string[] = [
    'contact',
    'kontakt',
    'about',
    'o-nas',
    'o-nás',
    'about-us',
    'get-in-touch',
  ];

  /**
   * Vyhledá email na zadané URL adrese
   * @param url URL adresa, na které se má hledat email
   * @returns Nalezený email nebo null, pokud nebyl nalezen
   */
  public async findEmail(url: string): Promise<string | null> {
    try {
      // Zajistíme, že URL obsahuje protokol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const baseUrl = new URL(url).origin;

      // Nejprve zkusíme najít sitemap.xml
      let contactPageUrl = await this.findContactPageUrl(baseUrl);
      if (contactPageUrl) {
        const email = await this.extractEmailFromPage(contactPageUrl);
        if (email) return email;
      }

      // Pokud email nebyl nalezen na kontaktní stránce nebo kontaktní stránka nebyla nalezena,
      // hledáme na domovské stránce
      return await this.extractEmailFromPage(baseUrl);
    } catch (error: any) {
      console.error('Chyba při hledání emailu:', error.message);
      return null;
    }
  }

  /**
   * Najde URL kontaktní stránky pomocí sitemap.xml nebo prohledání odkazů na hlavní stránce
   * @param baseUrl Základní URL adresa webu
   * @returns URL kontaktní stránky nebo null, pokud nebyla nalezena
   */
  private async findContactPageUrl(baseUrl: string): Promise<string | null> {
    try {
      // Zkusíme najít sitemap
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const response = await axios.get(sitemapUrl, { timeout: 5000 });

      if (response.status === 200) {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

        // Zpracování sitemap
        if (result.urlset && result.urlset.url) {
          const urls = result.urlset.url.map((urlEntry: any) => urlEntry.loc[0]);

          // Hledání kontaktní stránky v sitemap
          for (const pageUrl of urls) {
            for (const keyword of this.contactPageKeywords) {
              if (pageUrl.toLowerCase().includes(keyword)) {
                return pageUrl;
              }
            }
          }
        }
      }
    } catch (error) {
      // Sitemap nebyla nalezena nebo došlo k chybě, přejdeme k alternativnímu přístupu
    }

    // Zkusíme najít odkaz na kontaktní stránku na hlavní stránce
    try {
      const response = await axios.get(baseUrl, { timeout: 5000 });
      const $ = cheerio.load(response.data);

      // Najdeme všechny odkazy
      const links = $('a');

      for (let i = 0; i < links.length; i++) {
        const href = $(links[i]).attr('href');
        const text = $(links[i]).text().toLowerCase();

        if (
          href &&
          (this.contactPageKeywords.some((keyword) => href.toLowerCase().includes(keyword)) ||
            this.contactPageKeywords.some((keyword) => text.includes(keyword)))
        ) {
          // Sestavíme absolutní URL, pokud je odkaz relativní
          if (href.startsWith('/')) {
            return `${baseUrl}${href}`;
          } else if (!href.startsWith('http')) {
            return `${baseUrl}/${href}`;
          } else {
            return href;
          }
        }
      }
    } catch (error: any) {
      console.error('Chyba při hledání kontaktní stránky:', error.message);
    }

    return null;
  }

  /**
   * Extrahuje email z HTML stránky
   * @param url URL adresa stránky
   * @returns Nalezený email nebo null
   */
  private async extractEmailFromPage(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const html = response.data;

      // Hledání emailů v HTML
      const emails = html.match(this.emailRegex);

      if (emails && emails.length > 0) {
        // Vrátíme první nalezený email
        return emails[0];
      }

      // Pokud v HTML nebyl nalezen žádný email, zkusíme prohledat text na stránce
      const $ = cheerio.load(html);
      const bodyText = $('body').text();
      const emailsInText = bodyText.match(this.emailRegex);

      if (emailsInText && emailsInText.length > 0) {
        return emailsInText[0];
      }
    } catch (error: any) {
      console.error(`Chyba při extrakci emailu z ${url}:`, error.message);
    }

    return null;
  }
}
