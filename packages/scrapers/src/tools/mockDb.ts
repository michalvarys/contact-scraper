import { ScraperTask, ScrapedLink, ScraperTaskStatus } from '@contact-scraper/db';
import { Business, ScraperLog } from '../types';

class PrismaMock {
  private tasks: Map<string, ScraperTask> = new Map();
  private links: Map<string, ScrapedLink> = new Map();
  private logs: Map<string, ScraperLog> = new Map();
  private businesses: Map<string, Business> = new Map();

  // Metody pro testování
  public _testing = {
    clearAll: () => {
      this.tasks.clear();
      this.links.clear();
      this.logs.clear();
      this.businesses.clear();
    },
  };

  scraperTask = {
    create: async ({
      data,
    }: {
      data: Omit<ScraperTask, 'id' | 'createdAt' | 'updatedAt' | 'scrapedLinks'>;
    }) => {
      const id = Math.random().toString(36).substring(7);
      const task: ScraperTask = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        //@ts-ignore
        scrapedLinks: [],
        ...data,
      };
      this.tasks.set(id, task);
      return task;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.tasks.get(where.id) || null;
    },
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: { status: { in: ScraperTaskStatus[] } };
      orderBy: { createdAt: 'asc' | 'desc' };
    }) => {
      const tasks = Array.from(this.tasks.values()).filter((task) =>
        where.status.in.includes(task.status),
      );
      return tasks.length > 0 ? tasks[0] : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ScraperTask> }) => {
      const task = this.tasks.get(where.id);
      if (!task) throw new Error('Task not found');
      const updatedTask = { ...task, ...data, updatedAt: new Date() };
      this.tasks.set(where.id, updatedTask);
      return updatedTask;
    },
  };

  scrapedLink = {
    findMany: async ({ where }: { where: { taskId: string } }) => {
      return Array.from(this.links.values()).filter((link) => link.taskId === where.taskId);
    },
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Array<Omit<ScrapedLink, 'id' | 'createdAt' | 'updatedAt'>>;
      skipDuplicates?: boolean;
    }) => {
      data.forEach((link) => {
        const id = Math.random().toString(36).substring(7);
        //@ts-ignore
        const newLink: ScrapedLink = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          processedAt: null,
          taskId: link.taskId,
          link: link.link,
          status: link.status,
        };
        this.links.set(id, newLink);
      });
      return { count: data.length };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string } | { taskId_link: { taskId: string; link: string } };
      data: Partial<ScrapedLink>;
    }) => {
      let link: ScrapedLink | undefined;
      if ('id' in where) {
        link = this.links.get(where.id);
      } else {
        link = Array.from(this.links.values()).find(
          (l) => l.taskId === where.taskId_link.taskId && l.link === where.taskId_link.link,
        );
      }
      if (!link) throw new Error('Link not found');
      const updatedLink = { ...link, ...data, updatedAt: new Date() };
      this.links.set(link.id, updatedLink);
      return updatedLink;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { taskId: string; status: ScraperTaskStatus };
      data: Partial<ScrapedLink>;
    }) => {
      let count = 0;
      this.links.forEach((link) => {
        if (link.taskId === where.taskId && link.status === where.status) {
          this.links.set(link.id, { ...link, ...data, updatedAt: new Date() });
          count++;
        }
      });
      return { count };
    },
    count: async ({ where }: { where: { taskId: string; status: ScraperTaskStatus } }) => {
      return Array.from(this.links.values()).filter(
        (link) => link.taskId === where.taskId && link.status === where.status,
      ).length;
    },
  };

  scraperLog = {
    create: async ({ data }: { data: Omit<ScraperLog, 'id' | 'createdAt'> }) => {
      const id = Math.random().toString(36).substring(7);
      const log = {
        id,
        createdAt: new Date(),
        ...data,
      };
      this.logs.set(id, log);
      return log;
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { taskId: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
    }) => {
      const logs = Array.from(this.logs.values()).filter((log) => log.taskId === where.taskId);
      if (orderBy?.createdAt === 'desc') {
        logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (orderBy?.createdAt === 'asc') {
        logs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return logs;
    },
  };

  business = {
    create: async ({ data }: { data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const id = Math.random().toString(36).substring(7);
      const business = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.businesses.set(id, business);
      return business;
    },
    findMany: async ({ where }: { where: { taskId: string } }) => {
      return Array.from(this.businesses.values()).filter(
        (business) => business.taskId === where.taskId,
      );
    },
  };
}

export const prisma = new PrismaMock();
