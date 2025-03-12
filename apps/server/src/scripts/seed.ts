import { PrismaClient } from '@contact-scraper/db';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CompanyData {
    id: string;
    name: string;
    address: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    link: string;
    reviewsCount: number;
    scrapedAt: string;
    categories: string[];
}

interface CompanyDataMap {
    [key: string]: CompanyData;
}

async function main(): Promise<void> {
    try {
        // Načtení dat z JSON souboru
        const jsonPath = path.join(__dirname, '..', '..', 'firmy_cz.json');
        const data: CompanyDataMap = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        console.log(`Načteno ${Object.keys(data).length} záznamů z JSON souboru.`);

        // Získání unikátních kategorií
        const uniqueCategories = new Set<string>();
        Object.values(data).forEach((company) => {
            company.categories.forEach((category) => {
                uniqueCategories.add(category);
            });
        });

        console.log(`Nalezeno ${uniqueCategories.size} unikátních kategorií.`);

        // Vytvoření kategorií v databázi
        for (const categoryName of uniqueCategories) {
            await prisma.category.upsert({
                where: { name: categoryName },
                update: {},
                create: { name: categoryName },
            });
        }

        console.log('Kategorie byly úspěšně vytvořeny v databázi.');

        // Načtení všech kategorií z databáze pro mapování
        const categories = await prisma.category.findMany();
        const categoryMap: { [key: string]: number } = {};
        categories.forEach((category) => {
            categoryMap[category.name] = category.id;
        });

        // Import firem do databáze
        for (const companyData of Object.values(data)) {
            // Připravení kategorií pro propojení
            const categoryConnections = companyData.categories.map((categoryName) => ({
                name: categoryName,
            }));

            // Vytvoření firmy v databázi
            await prisma.company.upsert({
                where: { id: companyData.id },
                update: {
                    name: companyData.name,
                    address: companyData.address,
                    email: companyData.email || null,
                    phone: companyData.phone || null,
                    website: companyData.website || null,
                    link: companyData.link,
                    reviewsCount: companyData.reviewsCount,
                    scrapedAt: new Date(companyData.scrapedAt),
                    categories: {
                        connect: categoryConnections,
                    },
                },
                create: {
                    id: companyData.id,
                    name: companyData.name,
                    address: companyData.address,
                    email: companyData.email || null,
                    phone: companyData.phone || null,
                    website: companyData.website || null,
                    link: companyData.link,
                    reviewsCount: companyData.reviewsCount,
                    scrapedAt: new Date(companyData.scrapedAt),
                    categories: {
                        connect: categoryConnections,
                    },
                },
            });
        }

        console.log(`Úspěšně importováno ${Object.keys(data).length} firem do databáze.`);
    } catch (error) {
        console.error('Chyba při importu dat:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => console.log('Import dat byl dokončen.'))
    .catch((e) => {
        console.error('Chyba při importu dat:', e);
        process.exit(1);
    });
