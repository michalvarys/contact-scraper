import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main(): Promise<void> {
    try {
        await prisma.$transaction([
            prisma.company.deleteMany({
                where: {
                    link: {
                        startsWith: 'https://c.seznam.cz/click',
                    },
                },
            }),
        ]);
        console.log('Database cleaned successfully');
    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => console.log('Firmy bez kontaktu smazány.'))
    .catch((e) => {
        console.error('Chyba při importu dat:', e);
        process.exit(1);
    });
