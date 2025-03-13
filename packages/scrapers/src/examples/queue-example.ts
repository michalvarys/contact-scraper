import { ScraperQueue } from '../tools/queue';
import { ScraperLog, Business } from '../types';
import { prisma } from '../tools/mockDb';
import { ScrapedLink, ScraperTaskStatus } from '@contact-scraper/db';

export async function main() {
  // Získání instance fronty
  const queue = ScraperQueue.getInstance();

  try {
    // Vytvoření nové úlohy pro Google Maps scraper
    const task = await prisma.scraperTask.create({
      data: {
        scraperType: 'GoogleMapsScraper',
        scraperConfig: {
          headless: true,
        },
        industry: 'restaurants',
        region: 'Prague',
        status: ScraperTaskStatus.PENDING,
      },
    });

    console.log('Created new task:', task);

    // Spuštění úlohy
    await queue.processNextTask();

    // Kontrola stavu úlohy
    const updatedTask = await prisma.scraperTask.findUnique({
      where: { id: task.id },
    });

    console.log('Task status:', updatedTask?.status);

    // Získání nalezených odkazů
    const links = await prisma.scrapedLink.findMany({
      where: { taskId: task.id },
    });

    console.log('Found links:', links.length);
    console.log('Links by status:');
    console.log('- Pending:', links.filter((l) => l.status === ScraperTaskStatus.PENDING).length);
    console.log('- Running:', links.filter((l) => l.status === ScraperTaskStatus.RUNNING).length);
    console.log(
      '- Processed:',
      links.filter((l) => l.status === ScraperTaskStatus.PROCESSED).length,
    );
    console.log('- Failed:', links.filter((l) => l.status === ScraperTaskStatus.FAILED).length);

    // Získání logů úlohy
    const logs = await prisma.scraperLog.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });

    console.log('\nTask logs:');
    logs.forEach((log: ScraperLog) => {
      console.log(`[${log.level}] ${log.message}`);
    });

    // Získání získaných dat
    const businesses = await prisma.business.findMany({
      where: { taskId: task.id },
    });

    console.log('\nScraped businesses:', businesses.length);
    businesses.forEach((business: Business) => {
      console.log('-', business.name);
      console.log('  Address:', business.address);
      console.log('  Phone:', business.phone);
      console.log('  Email:', business.email);
      console.log('  Website:', business.website);
      console.log('');
    });

    // Příklad pozastavení úlohy
    if (updatedTask?.status === ScraperTaskStatus.RUNNING) {
      await queue.pauseTask(task.id);
      console.log('Task paused');
    }

    // Příklad obnovení úlohy
    if (updatedTask?.status === ScraperTaskStatus.PAUSED) {
      await queue.resumeTask(task.id);
      console.log('Task resumed');
    }

    // Příklad opakování selhavších odkazů
    if (updatedTask?.status === ScraperTaskStatus.FAILED) {
      await queue.retryFailedLinks(task.id);
      console.log('Retrying failed links');
    }

    // Příklad zpracování konkrétního odkazu
    const pendingLink = links.find((l: ScrapedLink) => l.status === ScraperTaskStatus.PENDING);
    if (pendingLink) {
      await queue.processLink(task.id, pendingLink.link);
      console.log('Processed specific link:', pendingLink.link);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Pokud je soubor spuštěn přímo
if (require.main === module) {
  main().catch(console.error);
}
