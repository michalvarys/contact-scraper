import dotenv from 'dotenv';
dotenv.config();

import { prisma, ScraperTask } from '@contact-scraper/db';
import AiGoogleMapsScraper from './AiGoogleMapsScraper';
import { TaskQueue } from './tools/queue';
import {
  createScraperTask,
  runScraperTask,
  getScraperTasks,
  ScraperTaskStatus,
} from './tools/scraperQueue';

async function main() {
  // const scraper = new AiGoogleMapsScraper();
  // await scraper.scrapeCompanies('Zednické práce', 'Karlovy vary');
  // await scraper.getCompanyDataFromLink(
  //   'https://www.google.com/maps/place/Hair+Design+MOSKEVSK%C3%81/@50.228338,12.8440061,15z/data=!4m10!1m2!2m1!1sdesign+karlovy+vary!3m6!1s0x47a0996fd49426c9:0x3250b231ab798ff7!8m2!3d50.2277979!4d12.8610234!15sChNkZXNpZ24ga2FybG92eSB2YXJ5WhUiE2Rlc2lnbiBrYXJsb3Z5IHZhcnmSAQpoYWlyX3NhbG9umgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU5JZEhCTWIxQm5FQUXgAQD6AQUIxQEQKQ!16s%2Fg%2F11b5ytbs_h?authuser=0&hl=cs&entry=ttu&g_ep=EgoyMDI1MDMwNC4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
  // );
  // await scraper.close();

  // const info = await runGoogleMapsLinkScraper(
  //   'https://www.google.com/maps/place/Hair+Design+MOSKEVSK%C3%81/@50.228338,12.8440061,15z/data=!4m10!1m2!2m1!1sdesign+karlovy+vary!3m6!1s0x47a0996fd49426c9:0x3250b231ab798ff7!8m2!3d50.2277979!4d12.8610234!15sChNkZXNpZ24ga2FybG92eSB2YXJ5WhUiE2Rlc2lnbiBrYXJsb3Z5IHZhcnmSAQpoYWlyX3NhbG9umgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU5JZEhCTWIxQm5FQUXgAQD6AQUIxQEQKQ!16s%2Fg%2F11b5ytbs_h?authuser=0&hl=cs&entry=ttu&g_ep=EgoyMDI1MDMwNC4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
  // );
  // console.log(info);
  // return;

  const scraperTasks = await getScraperTasks();
  const pendingTasks = await getScraperTasks(ScraperTaskStatus.PENDING);
  const failedTasks = await getScraperTasks(ScraperTaskStatus.FAILED);
  const queue = new TaskQueue(5);

  if (!pendingTasks.length) {
    const industries = await prisma.industry.findMany();
    const regions = await prisma.region.findMany();

    const tasks = [];
    const sektory = [
      // 'Služby',
      // 'Design',
      // 'Kadeřnictví',
      // 'Barber',
      // 'Software',
      // 'Programátor',
      // 'Tvorba webu',
      'Digitální marketing',
      'Poradce',
      'Právní služby',
      'Ruční mytí aut',
      'Stavební firma',
      'Natěrač a malířské služby',
      'Fotograf',
      'Kavárny a restaurace',
      'Hotely a ubytování',
      'Event management',
      'Fitness a wellness',
      'E-commerce',
      'Influencer',
      'Realitní makléř',
      'Architekt',
      'Zdravotnictví a estetická medicína',
      'Autoservisy a tuning',
      'Hudebníci a kapely',
      'Vzdělávání',
    ];

    for (const industry of sektory) {
      for (const region of regions) {
        const task = await createScraperTask({
          scraperType: 'AiGoogleMapsScraper',
          scraperConfig: {
            industry,
            region: region.name,
            headless: false, // nastavíme na true pro produkční použití
          },
        });
        tasks.push(task);
      }
    }
    const queueEntries = tasks.map((task) => runScraperTask(task.id));
    // @ts-ignore
    await queue.addAll<ScraperTask>(queueEntries);
    console.log('Všechny úlohy dokončeny');
    return;
  }

  console.log('pending tasks ' + pendingTasks.length);

  // @ts-ignore
  await queue.addAll<ScraperTask>(pendingTasks.map((task) => runScraperTask(task.id)));
}

main().catch(console.error);
