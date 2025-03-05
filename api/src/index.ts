import dotenv from 'dotenv';
import express, { Express, Request, Response, Router } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { runScraper, runAllScrapers, fixEmptyLinks, clean } from './services/FirmyCzScraper';

dotenv.config();

const prisma = new PrismaClient();
const app: Express = express();
const router: Router = express.Router();
const PORT = process.env.PORT || 3000;

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

        if (industry || region) {
            // Spustit scraping pro konkrétní odvětví a region
            res.json({ message: `Spouštím scraping pro ${industry} v regionu ${region}` });

            // Spustit scraping asynchronně, aby neblokoval odpověď
            runScraper(industry as string, region as string).catch((error) => {
                console.error('Chyba při scrapingu:', error);
            });
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
