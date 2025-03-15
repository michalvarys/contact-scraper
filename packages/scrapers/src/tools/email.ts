import { EmailScraper } from '../scrapers/EmailScraper';

export function getEmailFromWebsite(website: string) {
  if (!website) {
    return null;
  }

  const scraper = new EmailScraper();
  return scraper.findEmail(website);
}
