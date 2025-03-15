import { PrismaClient as SqlitePrismaClient } from '../prisma/generated/sqlite';
import { PrismaClient } from '../prisma/generated/pg';

const sqlite = new SqlitePrismaClient();
const pg = new PrismaClient();
const BATCH_SIZE = 500;

async function migrateCategories() {
  console.log('Migrating categories...');
  const categories = await sqlite.category.findMany();

  await pg.$transaction(async (tx) => {
    for (const category of categories) {
      await tx.category.create({
        data: {
          id: category.id,
          name: category.name,
        },
      });
    }
  });

  console.log(`Migrated ${categories.length} categories`);
}

async function migrateCompanies() {
  console.log('Migrating companies...');
  let skip = 0;
  let totalMigrated = 0;

  while (true) {
    // Načtení dávky firem včetně jejich kategorií
    const companies = await sqlite.company.findMany({
      skip,
      take: BATCH_SIZE,
      include: {
        categories: true,
        metadata: {
          include: {
            website: true,
          },
        },
      },
    });

    if (companies.length === 0) break;

    // Zpracování dávky v transakci
    await pg.$transaction(async (tx) => {
      for (const company of companies) {
        const { metadata, categories, ...companyData } = company;

        // Vytvoření firmy s připojenými kategoriemi
        await tx.company.create({
          data: {
            ...companyData,
            categories: {
              connect: categories.map((cat) => ({ id: cat.id })),
            },
            // Vytvoření metadat a website, pokud existují
            metadata: metadata
              ? {
                  create: {
                    id: metadata.id,
                    notes: metadata.notes,
                    data: metadata.data,
                    website: metadata.website
                      ? {
                          create: {
                            id: metadata.website.id,
                            link: metadata.website.link,
                            thumbnail: metadata.website.thumbnail,
                            data: metadata.website.data,
                          },
                        }
                      : undefined,
                  },
                }
              : undefined,
          },
        });
      }
    });

    totalMigrated += companies.length;
    console.log(`Migrated ${totalMigrated} companies`);
    skip += BATCH_SIZE;
  }

  console.log(`Total companies migrated: ${totalMigrated}`);
}

async function migrateScraperTasks() {
  console.log('Migrating scraper tasks...');
  let skip = 0;
  let totalMigrated = 0;

  while (true) {
    const tasks = await sqlite.scraperTask.findMany({
      skip,
      take: BATCH_SIZE,
      include: {
        scrapedLinks: true,
        logs: true,
      },
    });

    if (tasks.length === 0) break;

    await pg.$transaction(async (tx) => {
      for (const task of tasks) {
        const { scrapedLinks, logs, ...taskData } = task;

        await tx.scraperTask.create({
          data: {
            ...taskData,
            scrapedLinks: {
              create: scrapedLinks.map((link) => ({
                id: link.id,
                link: link.link,
                status: link.status,
                processedAt: link.processedAt,
                errorMessage: link.errorMessage,
                companyId: link.companyId,
                createdAt: link.createdAt,
                updatedAt: link.updatedAt,
              })),
            },
            logs: {
              create: logs.map((log) => ({
                id: log.id,
                message: log.message,
                level: log.level,
                createdAt: log.createdAt,
              })),
            },
          },
        });
      }
    });

    totalMigrated += tasks.length;
    console.log(`Migrated ${totalMigrated} scraper tasks`);
    skip += BATCH_SIZE;
  }

  console.log(`Total scraper tasks migrated: ${totalMigrated}`);
}

async function main() {
  try {
    console.log('Starting migration...');

    // Migrace v pořadí podle závislostí
    await migrateCategories();
    await migrateCompanies();
    await migrateScraperTasks();

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sqlite.$disconnect();
    await pg.$disconnect();
  }
}

// Spuštění migrace
main().catch(console.error);
