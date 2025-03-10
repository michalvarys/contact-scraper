import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '@contact-scraper/db';
import AiGoogleMapsScraper from './AiGoogleMapsScraper';

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
  const industries = await prisma.industry.findMany();
  const regions = await prisma.region.findMany();
  const pLimit = (await import('p-limit')).default; // Dynamický import

  const limit = pLimit(6);

  const tasks = [];
  const sektory = [
    // 'Služby',
    // 'Design',
    // 'Kadeřnictví',
    // 'Barber',
    'Software',
    'Programátor',
    'Tvorba webu',
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
    //) {
    for (const region of regions) {
      const scraper = new AiGoogleMapsScraper();
      tasks.push(limit(() => scraper.scrapeCompanies(industry, region.name)));
    }
  }

  await Promise.all(tasks); // Počká na dokončení všech úloh
  console.log('Všechny úlohy dokončeny');

  // for (const industry of industries) {
  //   // await runGoogleMapsScraper(industry.name, 'Karlovy Vary', `${industry.name} Karlovy Vary`, {
  //   //   headless: false,
  //   // });

  //   for (const region of regions) {
  //     // await runGoogleMapsScraper(industry.name, region.name);
  //   }
  // }
}

main().catch(console.error);
