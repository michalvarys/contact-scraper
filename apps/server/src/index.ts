import dotenv from 'dotenv';
import express, { Express, Request, Response, Router } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { runScraper, runAllScrapers, fixEmptyLinks, clean } from './services';
import { prisma } from '@contact-scraper/db';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@contact-scraper/api/routers';
import { openApiDocument } from '@contact-scraper/api/openapi';
dotenv.config();

const app: Express = express();
const router: Router = express.Router();
const PORT = process.env.PORT || 3000;

// Health check endpoint pro Docker
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Typy pro query parametry
interface CompanyQueryParams {
    page?: string;
    limit?: string;
    keyword?: string;
    category?: string;
    industry?: string;
    region?: string;
    hasWebsite?: 'true' | 'false';
    hasPhone?: 'true' | 'false';
    hasEmail?: 'true' | 'false';
    sortBy?: 'name' | 'address' | 'reviewsCount' | 'email' | 'website' | 'scrapedAt';
    sortDir?: 'asc' | 'desc';
}

// Typy pro filtr
interface CompanyFilter {
    OR?: Array<Record<string, any>>;
    name?: Record<string, any>;
    address?: Record<string, any>;
    categories?: Record<string, any>;
    industry?: Record<string, any>;
    region?: Record<string, any>;
    website?: Record<string, any>;
    phone?: Record<string, any>;
    email?: Record<string, any>;
}

// Middleware
app.use(cors());
app.use(express.json());

// Pomocná funkce pro vytvoření filtru
function createFilter(query: CompanyQueryParams): CompanyFilter {
    const filter: CompanyFilter = {};
    const conditions: Array<Record<string, any>> = [];

    // Filtrování podle klíčových slov (v názvu nebo adrese)
    if (query.keyword) {
        conditions.push(
            { name: { contains: query.keyword } },
            { address: { contains: query.keyword } },
        );
    }

    // Filtrování podle kategorií
    if (query.category) {
        filter.categories = {
            some: {
                name: {
                    contains: query.category,
                },
            },
        };
    }

    // Filtrování podle odvětví
    if (query.industry) {
        filter.industry = {
            name: {
                equals: query.industry,
            },
        };
    }

    // Filtrování podle regionu
    if (query.region) {
        filter.region = {
            name: {
                equals: query.region,
            },
        };
    }

    // Filtrování podle existence webu, emailu a telefonu
    if (query.hasWebsite === 'false') {
        filter.website = { equals: null };
    }
    if (query.hasEmail === 'false') {
        filter.email = { equals: null };
    }
    if (query.hasPhone === 'false') {
        filter.phone = { equals: null };
    }

    // Filtrování pro existující hodnoty
    if (query.hasWebsite === 'true') {
        filter.website = { not: null };
    }
    if (query.hasEmail === 'true') {
        filter.email = { not: null };
    }
    if (query.hasPhone === 'true') {
        filter.phone = { not: null };
    }

    // Přidání podmínek do OR, pokud existují
    if (conditions.length > 0) {
        filter.OR = conditions;
    }

    return filter;
}

// Pomocná funkce pro vytvoření řazení
function createOrderBy(query: CompanyQueryParams): Array<Record<string, string>> {
    const orderBy: Array<Record<string, string>> = [];

    if (query.sortBy) {
        const direction = query.sortDir === 'desc' ? 'desc' : 'asc';

        switch (query.sortBy) {
            case 'name':
                orderBy.push({ name: direction });
                break;
            case 'address':
                orderBy.push({ address: direction });
                break;
            case 'reviewsCount':
                orderBy.push({ reviewsCount: direction });
                break;
            case 'scrapedAt':
                orderBy.push({ scrapedAt: direction });
                break;
            case 'email':
                orderBy.push({ email: direction });
                break;
            case 'website':
                orderBy.push({ website: direction });
                break;
            default:
                orderBy.push({ name: 'asc' });
        }
    } else {
        // Výchozí řazení podle názvu
        orderBy.push({ name: 'asc' });
    }

    return orderBy;
}

// Route Handlers
async function getCompanies(
    req: Request<unknown, unknown, unknown, CompanyQueryParams>,
    res: Response,
): Promise<void> {
    try {
        const { page = '1', limit = '10' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Vytvoření filtru na základě query parametrů
        const filter = createFilter(req.query);

        // Vytvoření řazení na základě query parametrů
        const orderBy = createOrderBy(req.query);

        // Získání firem z databáze
        const companies = await prisma.company.findMany({
            where: filter,
            orderBy,
            skip: Number(skip),
            take: Number(limit),
            include: {
                categories: true,
                industry: true,
                region: true,
            },
        });

        // Získání celkového počtu firem pro stránkování
        const total = await prisma.company.count({
            where: filter,
        });

        res.json({
            data: companies,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Chyba při získávání firem:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function getCompanyById(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                categories: true,
                industry: true,
                region: true,
            },
        });

        if (!company) {
            res.status(404).json({ error: 'Firma nebyla nalezena' });
            return;
        }

        res.json(company);
    } catch (error) {
        console.error('Chyba při získávání detailu firmy:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function createCompany(req: Request, res: Response): Promise<void> {
    try {
        const {
            id,
            name,
            address,
            email,
            phone,
            website,
            link,
            reviewsCount,
            scrapedAt,
            categories,
            industry,
            region,
        } = req.body;

        if (!id || !name || !address || !link) {
            res.status(400).json({ error: 'ID, název, adresa a odkaz jsou povinné údaje' });
            return;
        }

        // Příprava dat pro vytvoření společnosti
        const companyData: any = {
            id,
            name,
            address,
            email: email || null,
            phone: phone || null,
            website: website || null,
            link,
            reviewsCount: reviewsCount || 0,
            scrapedAt: scrapedAt ? new Date(scrapedAt) : new Date(),
        };

        // Přidání industryId, pokud je k dispozici
        if (industry?.id) {
            companyData.industryId = industry.id;
        }

        // Přidání regionId, pokud je k dispozici
        if (region?.id) {
            companyData.regionId = region.id;
        }

        // Vytvoření společnosti
        const company = await prisma.company.create({
            data: {
                ...companyData,
                // Připojení kategorií, pokud jsou k dispozici
                ...(categories && categories.length > 0
                    ? {
                          categories: {
                              connect: categories.map((category: { id: number }) => ({
                                  id: category.id,
                              })),
                          },
                      }
                    : {}),
            },
            include: {
                categories: true,
                industry: true,
                region: true,
            },
        });

        res.status(201).json({
            success: true,
            data: company,
            message: 'Společnost byla úspěšně vytvořena',
        });
    } catch (error) {
        console.error('Chyba při vytváření společnosti:', error);
        res.status(500).json({
            success: false,
            message: 'Interní chyba serveru při vytváření společnosti',
        });
    }
}

async function updateCompany(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const {
            name,
            address,
            email,
            phone,
            website,
            link,
            reviewsCount,
            scrapedAt,
            categories,
            industry,
            region,
        } = req.body;

        // Kontrola existence společnosti
        const existingCompany = await prisma.company.findUnique({
            where: { id },
            include: { categories: true },
        });

        if (!existingCompany) {
            res.status(404).json({
                success: false,
                message: 'Společnost nebyla nalezena',
            });
            return;
        }

        // Příprava dat pro aktualizaci
        const updateData: any = {
            name,
            address,
            email: email || null,
            phone: phone || null,
            website: website || null,
            link,
            reviewsCount: reviewsCount || 0,
            scrapedAt: scrapedAt ? new Date(scrapedAt) : existingCompany.scrapedAt,
        };

        // Aktualizace industryId
        if (industry?.id) {
            updateData.industryId = industry.id;
        } else {
            updateData.industryId = null;
        }

        // Aktualizace regionId
        if (region?.id) {
            updateData.regionId = region.id;
        } else {
            updateData.regionId = null;
        }

        // Aktualizace společnosti
        await prisma.company.update({
            where: { id },
            data: {
                ...updateData,
                // Odpojení všech stávajících kategorií
                categories: {
                    disconnect: existingCompany.categories.map((category) => ({
                        id: category.id,
                    })),
                },
            },
        });

        // Pokud jsou k dispozici nové kategorie, připojíme je
        if (categories && categories.length > 0) {
            await prisma.company.update({
                where: { id },
                data: {
                    categories: {
                        connect: categories.map((category: { id: number }) => ({
                            id: category.id,
                        })),
                    },
                },
            });
        }

        // Získání aktualizované společnosti se všemi vztahy
        const finalCompany = await prisma.company.findUnique({
            where: { id },
            include: {
                categories: true,
                industry: true,
                region: true,
            },
        });

        res.json({
            success: true,
            data: finalCompany,
            message: 'Společnost byla úspěšně aktualizována',
        });
    } catch (error) {
        console.error('Chyba při aktualizaci společnosti:', error);
        res.status(500).json({
            success: false,
            message: 'Interní chyba serveru při aktualizaci společnosti',
        });
    }
}

async function deleteCompany(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Kontrola existence společnosti
        const existingCompany = await prisma.company.findUnique({
            where: { id },
        });

        if (!existingCompany) {
            res.status(404).json({
                success: false,
                message: 'Společnost nebyla nalezena',
            });
            return;
        }

        // Smazání společnosti
        await prisma.company.delete({
            where: { id },
        });

        res.json({
            success: true,
            message: 'Společnost byla úspěšně smazána',
        });
    } catch (error) {
        console.error('Chyba při mazání společnosti:', error);
        res.status(500).json({
            success: false,
            message: 'Interní chyba serveru při mazání společnosti',
        });
    }
}

async function bulkUpdateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { businessIds, categoryId } = req.body;

        if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Je vyžadován alespoň jeden ID společnosti',
            });
            return;
        }

        if (!categoryId) {
            res.status(400).json({
                success: false,
                message: 'Je vyžadováno ID kategorie',
            });
            return;
        }

        // Kontrola existence kategorie
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Kategorie nebyla nalezena',
            });
            return;
        }

        // Aktualizace kategorií pro všechny společnosti
        let updatedCount = 0;
        for (const businessId of businessIds) {
            try {
                await prisma.company.update({
                    where: { id: businessId },
                    data: {
                        categories: {
                            connect: { id: categoryId },
                        },
                    },
                });
                updatedCount++;
            } catch (error) {
                console.error(
                    `Chyba při aktualizaci kategorie pro společnost ${businessId}:`,
                    error,
                );
                // Pokračujeme s dalšími společnostmi i v případě chyby
            }
        }

        res.json({
            success: true,
            count: updatedCount,
            message: `Kategorie byla úspěšně aktualizována pro ${updatedCount} společností`,
        });
    } catch (error) {
        console.error('Chyba při hromadné aktualizaci kategorií:', error);
        res.status(500).json({
            success: false,
            message: 'Interní chyba serveru při hromadné aktualizaci kategorií',
        });
    }
}

async function bulkDelete(req: Request, res: Response): Promise<void> {
    try {
        const { businessIds } = req.body;

        if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Je vyžadován alespoň jeden ID společnosti',
            });
            return;
        }

        // Smazání společností
        let deletedCount = 0;
        for (const businessId of businessIds) {
            try {
                await prisma.company.delete({
                    where: { id: businessId },
                });
                deletedCount++;
            } catch (error) {
                console.error(`Chyba při mazání společnosti ${businessId}:`, error);
                // Pokračujeme s dalšími společnostmi i v případě chyby
            }
        }

        res.json({
            success: true,
            count: deletedCount,
            message: `Bylo úspěšně smazáno ${deletedCount} společností`,
        });
    } catch (error) {
        console.error('Chyba při hromadném mazání společností:', error);
        res.status(500).json({
            success: false,
            message: 'Interní chyba serveru při hromadném mazání společností',
        });
    }
}

async function getCategories(_req: Request, res: Response): Promise<void> {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                name: 'asc',
            },
        });

        res.json(categories);
    } catch (error) {
        console.error('Chyba při získávání kategorií:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

// Industry handlers
async function getIndustries(_req: Request, res: Response): Promise<void> {
    try {
        const industries = await prisma.industry.findMany({
            orderBy: {
                name: 'asc',
            },
        });

        res.json(industries);
    } catch (error) {
        console.error('Chyba při získávání odvětví:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function createIndustry(req: Request, res: Response): Promise<void> {
    try {
        const { name } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Název odvětví je povinný' });
            return;
        }

        const industry = await prisma.industry.create({
            data: { name },
        });

        res.status(201).json(industry);
    } catch (error) {
        console.error('Chyba při vytváření odvětví:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function updateIndustry(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Název odvětví je povinný' });
            return;
        }

        const industry = await prisma.industry.update({
            where: { id: Number(id) },
            data: { name },
        });

        res.json(industry);
    } catch (error) {
        console.error('Chyba při aktualizaci odvětví:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function deleteIndustry(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Kontrola, zda existují firmy s tímto odvětvím
        const companiesCount = await prisma.company.count({
            where: { industryId: Number(id) },
        });

        if (companiesCount > 0) {
            res.status(400).json({
                error: `Nelze smazat odvětví, protože je přiřazeno k ${companiesCount} firmám`,
            });
            return;
        }

        await prisma.industry.delete({
            where: { id: Number(id) },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Chyba při mazání odvětví:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

// Region handlers
async function getRegions(_req: Request, res: Response): Promise<void> {
    try {
        const regions = await prisma.region.findMany({
            orderBy: {
                name: 'asc',
            },
        });

        res.json(regions);
    } catch (error) {
        console.error('Chyba při získávání regionů:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function createRegion(req: Request, res: Response): Promise<void> {
    try {
        const { name } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Název regionu je povinný' });
            return;
        }

        const region = await prisma.region.create({
            data: { name },
        });

        res.status(201).json(region);
    } catch (error) {
        console.error('Chyba při vytváření regionu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function updateRegion(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Název regionu je povinný' });
            return;
        }

        const region = await prisma.region.update({
            where: { id: Number(id) },
            data: { name },
        });

        res.json(region);
    } catch (error) {
        console.error('Chyba při aktualizaci regionu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function deleteRegion(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Kontrola, zda existují firmy s tímto regionem
        const companiesCount = await prisma.company.count({
            where: { regionId: Number(id) },
        });

        if (companiesCount > 0) {
            res.status(400).json({
                error: `Nelze smazat region, protože je přiřazen k ${companiesCount} firmám`,
            });
            return;
        }

        await prisma.region.delete({
            where: { id: Number(id) },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Chyba při mazání regionu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

// Scraping handlers
async function startScraping(req: Request, res: Response): Promise<void> {
    try {
        const { industry, region } = req.query;

        if (industry && region) {
            // Spustit scraping pro konkrétní odvětví a region
            res.json({ message: `Spouštím scraping pro ${industry} v regionu ${region}` });

            // Spustit scraping asynchronně, aby neblokoval odpověď
            runScraper(industry as string, region as string).catch((error) => {
                console.error('Chyba při scrapingu:', error);
            });
        } else if (region) {
            const industries = await prisma.industry.findMany();
            res.json({
                message: `Spouštím scraping pro všechna odvětví v regionu ${region}`,
            });
            for (const industry of industries) {
                try {
                    await runScraper(industry.name, region as string);
                } catch (error) {
                    console.error(
                        `Chyba při spouštění scrapingu pro odvětví: ${industry.name} v regionu ${region}:`,
                        error,
                    );
                }
            }
        } else if (industry) {
            const regions = await prisma.region.findMany();
            res.json({
                message: `Spouštím scraping pro odvětví ${industry} ve všech regionech`,
            });
            for (const region of regions) {
                try {
                    await runScraper(industry as string, region.name).catch((error) => {
                        console.error('Chyba při scrapingu:', error);
                    });
                } catch (error) {
                    console.error(
                        `Chyba při spouštění scrapingu pro odvětví: ${industry} v regionu ${region.name}:`,
                        error,
                    );
                }
            }
        } else {
            // Spustit scraping pro všechny odvětví a regiony
            res.json({ message: 'Spouštím scraping pro všechny odvětví a regiony' });

            // Spustit scraping asynchronně, aby neblokoval odpověď
            runAllScrapers().catch((error) => {
                console.error('Chyba při scrapingu:', error);
            });
        }
    } catch (error) {
        console.error('Chyba při spouštění scrapingu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function fixScraperLinks(req: Request, res: Response): Promise<void> {
    try {
        // Spustit scraping pro konkrétní odvětví a region
        res.json({ message: `Spouštím opravování špatně scrapovaných linků` });

        // Spustit scraping asynchronně, aby neblokoval odpověď
        fixEmptyLinks().catch((error) => {
            console.error('Chyba při opravování linků:', error);
        });
    } catch (error) {
        console.error('Chyba při spouštění scrapingu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

async function cleanDatabase(req: Request, res: Response): Promise<void> {
    try {
        // Spustit scraping pro konkrétní odvětví a region
        res.json({ message: `Spouštím čištění` });

        // Spustit scraping asynchronně, aby neblokoval odpověď
        clean().catch((error) => {
            console.error('Chyba při opravování linků:', error);
        });
    } catch (error) {
        console.error('Chyba při spouštění scrapingu:', error);
        res.status(500).json({ error: 'Interní chyba serveru' });
    }
}

// API Routes
router.get('/companies', getCompanies);
router.get('/companies/:id', getCompanyById);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);
router.post('/companies/bulk-update-category', bulkUpdateCategory);
router.post('/companies/bulk-delete', bulkDelete);
router.get('/categories', getCategories);

// Industry routes
router.get('/industries', getIndustries);
router.post('/industries', createIndustry);
router.put('/industries/:id', updateIndustry);
router.delete('/industries/:id', deleteIndustry);

// Region routes
router.get('/regions', getRegions);
router.post('/regions', createRegion);
router.put('/regions/:id', updateRegion);
router.delete('/regions/:id', deleteRegion);

// Scraping routes
router.post('/scrape', startScraping);
router.post('/fix-links', fixScraperLinks);
router.post('/clean', cleanDatabase);

// Přidání routeru s prefixem /api
app.use('/api', router);

app.use(
    '/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: () => ({
            prisma,
            user: null,
        }),
    }),
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});

// Správné ukončení Prisma klienta při ukončení aplikace
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
