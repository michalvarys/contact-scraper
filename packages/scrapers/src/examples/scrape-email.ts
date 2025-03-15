import { EmailScraper } from '../scrapers/EmailScraper';

// Vytvoření instance
export async function main() {
  const scraper = new EmailScraper();
  // const email = await scraper.findEmail('https://www.credostav.cz/'); //klima@credostav.cz
  const email = await scraper.findEmail('https://www.michalvarys.eu/');

  console.log(email);
}

main();
