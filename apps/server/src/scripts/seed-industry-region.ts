import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface DatabaseJson {
    industries: string[];
    regions: string[];
}

async function main(): Promise<void> {
    try {
        // Načtení dat z JSON souboru
        const jsonPath = path.join(__dirname, '..', '..', 'database.json');
        const data: DatabaseJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        console.log(
            `Načteno ${data.industries.length} odvětví a ${data.regions.length} regionů z JSON souboru.`,
        );

        // Import odvětví do databáze
        for (const industryName of data.industries) {
            await prisma.industry.upsert({
                where: { name: industryName },
                update: {},
                create: { name: industryName },
            });
        }

        console.log(`Úspěšně importováno ${data.industries.length} odvětví do databáze.`);

        // Import regionů do databáze
        for (const regionName of data.regions) {
            await prisma.region.upsert({
                where: { name: regionName },
                update: {},
                create: { name: regionName },
            });
        }

        console.log(`Úspěšně importováno ${data.regions.length} regionů do databáze.`);
    } catch (error) {
        console.error('Chyba při importu dat:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => console.log('Import odvětví a regionů byl dokončen.'))
    .catch((e) => {
        console.error('Chyba při importu dat:', e);
        process.exit(1);
    });
