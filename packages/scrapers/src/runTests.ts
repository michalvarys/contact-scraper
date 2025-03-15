/**
 * Skript pro spuštění testů scraperů
 *
 * Tento skript demonstruje, jak lze použít mock data a testy pro scrapery.
 * Pro spuštění testů použijte příkaz: npm test
 */

import { GoogleMapsScraper } from './GoogleMapsScraper';
import { FirmyCzScraper } from './FirmyCzScraper';
import AiGoogleMapsScraper from './AiGoogleMapsScraper';
import { mockBusinesses, mockGoogleMapsHtml, mockFirmyCzHtml } from './__mocks__/businessMocks';

/**
 * Funkce pro manuální testování GoogleMapsScraper
 */
async function testGoogleMapsScraper() {
  console.log('Testování GoogleMapsScraper...');

  try {
    // Vytvoření instance scraperu
    const scraper = new GoogleMapsScraper({});

    // Scrapování jednoho odkazu
    const link = 'https://www.google.com/maps/place/Kavárna+U+Růže';
    console.log(`Scrapování odkazu: ${link}`);

    const result = await scraper.scrapeLink(link);
    console.log('Výsledek:', result);

    await scraper.close();
    console.log('Test GoogleMapsScraper dokončen.');
  } catch (error) {
    console.error('Chyba při testování GoogleMapsScraper:', error);
  }
}

/**
 * Funkce pro manuální testování FirmyCzScraper
 */
async function testFirmyCzScraper() {
  console.log('Testování FirmyCzScraper...');

  try {
    // Vytvoření instance scraperu
    const scraper = new FirmyCzScraper({});

    // Scrapování jednoho odkazu
    const link = 'https://www.firmy.cz/detail/12345-autoservis-rychly-plzen.html';
    console.log(`Scrapování odkazu: ${link}`);

    const result = await scraper.scrapeLink(link);
    console.log('Výsledek:', result);

    await scraper.close();
    console.log('Test FirmyCzScraper dokončen.');
  } catch (error) {
    console.error('Chyba při testování FirmyCzScraper:', error);
  }
}

/**
 * Funkce pro manuální testování AiGoogleMapsScraper
 */
async function testAiGoogleMapsScraper() {
  console.log('Testování AiGoogleMapsScraper...');

  try {
    // Vytvoření instance scraperu
    const scraper = new AiGoogleMapsScraper();

    // Inicializace scraperu
    await scraper.init();

    // Scrapování jednoho odkazu
    const link = 'https://www.google.com/maps/place/Kavárna+U+Růže';
    console.log(`Scrapování odkazu: ${link}`);

    const result = await scraper.getCompanyDataFromLink(link);
    console.log('Výsledek:', result);

    await scraper.close();
    console.log('Test AiGoogleMapsScraper dokončen.');
  } catch (error) {
    console.error('Chyba při testování AiGoogleMapsScraper:', error);
  }
}

/**
 * Hlavní funkce pro spuštění všech testů
 */
async function runAllTests() {
  console.log('Spouštění manuálních testů scraperů...');

  await testGoogleMapsScraper();
  console.log('-----------------------------------');

  await testFirmyCzScraper();
  console.log('-----------------------------------');

  await testAiGoogleMapsScraper();
  console.log('-----------------------------------');

  console.log('Všechny testy dokončeny.');
  console.log('Pro spuštění automatizovaných testů použijte příkaz: npm test');
}

// Spuštění testů
if (require.main === module) {
  runAllTests().catch(console.error);
}
