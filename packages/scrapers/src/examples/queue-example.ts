import {
  createScraperTask,
  runScraperTask,
  processLink,
  getScraperTask,
  getTaskLinks,
  ScraperTaskStatus,
  ScrapedLinkStatus,
} from '../tools/scraperQueue';

/**
 * Ukázkový skript pro demonstraci použití fronty pro scraper
 */
async function runQueueExample() {
  try {
    console.log('Vytvářím novou úlohu pro Google Maps Scraper...');

    // 1. Vytvoříme novou úlohu pro GoogleMapsScraper
    const task = await createScraperTask({
      scraperType: 'GoogleMapsScraper',
      scraperConfig: {
        industry: 'restaurace',
        region: 'Praha',
        headless: false, // nastavíme na true pro produkční použití
      },
      searchQuery: 'nejlepší restaurace Praha',
    });

    console.log(`Úloha byla vytvořena s ID: ${task.id}`);

    // 2. Spustíme úlohu
    console.log('Spouštím úlohu...');
    await runScraperTask(task.id);

    // 3. Načteme úlohu a zkontrolujeme její stav
    const updatedTask = await getScraperTask(task.id);
    console.log(`Úloha je ve stavu: ${updatedTask?.status}`);

    // 4. Získáme odkazy nalezené v rámci úlohy
    const allLinks = await getTaskLinks(task.id);
    console.log(`Úloha nalezla celkem ${allLinks.length} odkazů`);

    // 5. Vypíšeme statistiky podle stavu odkazů
    const processedLinks = await getTaskLinks(task.id, ScrapedLinkStatus.PROCESSED);
    const failedLinks = await getTaskLinks(task.id, ScrapedLinkStatus.FAILED);
    const pendingLinks = await getTaskLinks(task.id, ScrapedLinkStatus.PENDING);

    console.log(`Zpracované odkazy: ${processedLinks.length}`);
    console.log(`Selhavší odkazy: ${failedLinks.length}`);
    console.log(`Čekající odkazy: ${pendingLinks.length}`);

    // 6. Ukážeme, jak můžeme manuálně zpracovat konkrétní odkaz
    if (pendingLinks.length > 0) {
      console.log(`Manuálně zpracovávám odkaz: ${pendingLinks[0].link}`);
      const result = await processLink(task.id, pendingLinks[0].link);
      console.log(`Výsledek zpracování: ${result.success ? 'Úspěch' : 'Selhání'}`);
      if (result.success && result.business) {
        console.log(`Získaná data: ${result.business.name}, ${result.business.address}`);
      }
    }

    return {
      taskId: task.id,
      status: updatedTask?.status,
      linksCount: allLinks.length,
      processedCount: processedLinks.length,
      failedCount: failedLinks.length,
      pendingCount: pendingLinks.length,
    };
  } catch (error) {
    console.error('Chyba při spuštění ukázky fronty:', error);
    throw error;
  }
}

// Spustíme ukázku, pokud je soubor spuštěn přímo
if (require.main === module) {
  runQueueExample()
    .then((result) => {
      console.log('Ukázka byla úspěšně dokončena:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ukázka selhala:', error);
      process.exit(1);
    });
}

export default runQueueExample;
