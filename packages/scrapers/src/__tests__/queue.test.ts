import { ScraperQueue } from '../tools/queue';
import { ScraperTaskStatus } from '../types';
import { prisma } from '../tools/mockDb';

describe('ScraperQueue', () => {
  let queue: ScraperQueue;

  beforeEach(() => {
    queue = ScraperQueue.getInstance();
  });

  it('should create and process a task', async () => {
    // Vytvoření úlohy
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

    // Spuštění úlohy
    await queue.processNextTask();

    // Kontrola stavu úlohy
    const updatedTask = await prisma.scraperTask.findUnique({
      where: { id: task.id },
    });

    expect(updatedTask?.status).toBe(ScraperTaskStatus.COMPLETED);
  });

  it('should pause and resume a task', async () => {
    // Vytvoření úlohy
    const task = await prisma.scraperTask.create({
      data: {
        scraperType: 'FirmyCzScraper',
        scraperConfig: {
          headless: true,
        },
        industry: 'restaurants',
        region: 'Prague',
        status: ScraperTaskStatus.PENDING,
      },
    });

    // Spuštění úlohy
    await queue.processNextTask();

    // Pozastavení úlohy
    await queue.pauseTask(task.id);

    // Kontrola stavu úlohy
    let updatedTask = await prisma.scraperTask.findUnique({
      where: { id: task.id },
    });

    expect(updatedTask?.status).toBe(ScraperTaskStatus.PAUSED);

    // Obnovení úlohy
    await queue.resumeTask(task.id);

    // Kontrola stavu úlohy
    updatedTask = await prisma.scraperTask.findUnique({
      where: { id: task.id },
    });

    expect(updatedTask?.status).toBe(ScraperTaskStatus.PENDING);
  });

  it('should retry failed links', async () => {
    // Vytvoření úlohy
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

    // Vytvoření selhavšího odkazu
    await prisma.scrapedLink.createMany({
      data: [
        {
          taskId: task.id,
          link: 'https://example.com',
          status: ScraperTaskStatus.FAILED,
          processedAt: new Date(),
        },
      ],
    });

    // Opakování selhavších odkazů
    await queue.retryFailedLinks(task.id);

    // Kontrola stavu odkazu
    const links = await prisma.scrapedLink.findMany({
      where: { taskId: task.id },
    });

    expect(links[0].status).toBe(ScraperTaskStatus.PENDING);
    expect(links[0].processedAt).toBeNull();
  });

  it('should process a specific link', async () => {
    // Vytvoření úlohy
    const task = await prisma.scraperTask.create({
      data: {
        scraperType: 'FirmyCzScraper',
        scraperConfig: {
          headless: true,
        },
        industry: 'restaurants',
        region: 'Prague',
        status: ScraperTaskStatus.PENDING,
      },
    });

    // Vytvoření odkazu
    const link = 'https://example.com';
    await prisma.scrapedLink.createMany({
      data: [
        {
          taskId: task.id,
          link,
          status: ScraperTaskStatus.PENDING,
          processedAt: null,
        },
      ],
    });

    // Zpracování odkazu
    await queue.processLink(task.id, link);

    // Kontrola stavu odkazu
    const updatedLinks = await prisma.scrapedLink.findMany({
      where: { taskId: task.id },
    });

    expect(updatedLinks[0].status).toBe(ScraperTaskStatus.PROCESSED);
    expect(updatedLinks[0].processedAt).toBeTruthy();

    // Kontrola vytvořeného záznamu firmy
    const businesses = await prisma.business.findMany({
      where: { taskId: task.id },
    });

    expect(businesses).toHaveLength(1);
    expect(businesses[0].sourceLink).toBe(link);
  });
});
