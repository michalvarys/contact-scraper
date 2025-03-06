import { runGoogleMapsScraper } from './GoogleMapsScraper';

async function main() {
  await runGoogleMapsScraper('Design', 'Karlovy Vary', 'Design Karlovy vary', { headless: false });
}

main().catch(console.error);
