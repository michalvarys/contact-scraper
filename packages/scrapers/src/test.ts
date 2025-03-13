import { AiGoogleMapsScraper } from './AiGoogleMapsScraper';
import { FirmyCzScraper } from './FirmyCzScraper';
import scraperProviders from './providers/ScraperProviders';
import { ScraperQueueService } from './services/ScraperQueueService';
import { ScraperQueue } from './tools/queue';
import { ScraperConfig } from './tools/scraperQueue';
import { ScraperTaskStatus } from './types/queue';

async function main() {
  const config: ScraperConfig = {
    headless: false,
  };

  const scraper = new AiGoogleMapsScraper(config);
  const scraper2 = new FirmyCzScraper(config);
  const queueService = new ScraperQueueService(3);
  queueService.registerScraperProvider('AiGoogleMapsScraper', scraperProviders.AiGoogleMapsScraper);
  queueService.registerScraperProvider('FirmyCzScraper', scraperProviders.FirmyCzScraper);
  queueService.registerScraperProvider('GoogleMapsScraper', scraperProviders.GoogleMapsScraper);
  queueService.startQueue();

  const scraperQueue = ScraperQueue.getInstance();
  const tasks = await queueService.getTasks(ScraperTaskStatus.RUNNING);
  for (const task of tasks) {
    // await queueService.pauseTask(task.id);
    // await queueService.runTask(task.id);
    // const { scraperType, scraperConfig } = task;
    // const config: ScraperConfig = JSON.parse(scraperConfig as string);
    // const Scraper = scraperProviders[scraperType];
    // const { scraper } =
    //   await scraperProviders[scraperType as keyof typeof scraperProviders].createScraper(config);
    // const scraper = new Scraper(config);
    // await scraper.init();
    console.dir(task, { depth: Infinity });
    // const result = await scraper.searchLinks(`${config.industry || ''} ${config.region || ''}`);

    // console.log({ task, result });
  }

  // const task = await queue.createTask({
  //   scraperConfig: config,
  //   scraperType: 'AiGoogleMapsScraper',
  //   industry: 'Služby',
  //   region: 'Karlovy vary',
  // });

  // try {
  //   await scraper2.init();
  //   await scraper.init();

  //   const links = await scraper.searchLinks('restaurants Prague');
  //   console.log('Found links:', links);

  //   for (const link of links) {
  //     const data = await scraper.scrapeLink(link);
  //     console.log('Scraped data:', data);
  //   }
  // } catch (error) {
  //   console.error('Error:', error);
  // } finally {
  //   await scraper.close();
  // }
}

main().catch(console.error);
