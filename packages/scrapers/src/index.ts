import { prisma } from '@contact-scraper/db';
import { runGoogleMapsScraper, runGoogleMapsLinkScraper } from './GoogleMapsScraper';

async function main() {
  // const info = await runGoogleMapsLinkScraper(
  //   'https://www.google.com/maps/place/Hair+Design+MOSKEVSK%C3%81/@50.228338,12.8440061,15z/data=!4m10!1m2!2m1!1sdesign+karlovy+vary!3m6!1s0x47a0996fd49426c9:0x3250b231ab798ff7!8m2!3d50.2277979!4d12.8610234!15sChNkZXNpZ24ga2FybG92eSB2YXJ5WhUiE2Rlc2lnbiBrYXJsb3Z5IHZhcnmSAQpoYWlyX3NhbG9umgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU5JZEhCTWIxQm5FQUXgAQD6AQUIxQEQKQ!16s%2Fg%2F11b5ytbs_h?authuser=0&hl=cs&entry=ttu&g_ep=EgoyMDI1MDMwNC4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
  // );
  // console.log(info);
  const industries = await prisma.industry.findMany();
  const regions = await prisma.region.findMany();
  for (const region of regions) {
    await runGoogleMapsScraper('Služby', region.name);
  }

  for (const industry of industries) {
    // await runGoogleMapsScraper(industry.name, 'Karlovy Vary', `${industry.name} Karlovy Vary`, {
    //   headless: false,
    // });

    for (const region of regions) {
      // await runGoogleMapsScraper(industry.name, region.name);
    }
  }
}

main().catch(console.error);
