import { type Company } from '@contact-scraper/db';
import { ScraperQueueService } from '../services/ScraperQueueService';

type ScrapedCompanyData = Omit<
  Company,
  'id' | 'scrapedAt' | 'metadataId' | 'industryId' | 'regionId' | 'reviewsCount'
>;

export class Scraper {
  constructor(
    public baseUrl: string,
    public name: string,
  ) {}

  getLinks(query: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  scrape(link: string): Promise<ScrapedCompanyData> {
    throw new Error('Method not implemented.');
  }
}

async function main() {
  const queue = new ScraperQueueService(3, 5000);
  const task = await queue.createTask({
    scraperConfig: {
      headless: true,
    },
    scraperType: 'FirmyCzScraper',
    searchQuery: 'Autoservis Plzeň',
  });

  //...

  const firmyCzScraper = new Scraper('https://www.firmy.cz', 'firmy_cz');
  const links = await firmyCzScraper.getLinks(
    task.searchQuery || `${task.industry} ${task.region}`,
  );
  for (const link of links) {
    const taskLink = await queue.createLink({
      link,
      taskId: task.id,
      status: 'PENDING',
    });
    await queue.processLink(task.id, link);
    try {
      const data = await firmyCzScraper.scrape(link);
      // save to database
    } catch (err) {
      // Log error
    }
  }
  const data = await Promise.all(links.map((link) => firmyCzScraper.scrape(link)));

  const googleMapsScraper = new Scraper('https://www.google.com/maps', 'google_maps');
}
