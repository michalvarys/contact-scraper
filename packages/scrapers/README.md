# Scraper Package

Tento balíček obsahuje scrapery pro získávání dat o firmách z různých zdrojů, jako jsou Google Maps a Firmy.cz.

## Struktura

Balíček byl refaktorován do modulární struktury:

```
packages/scrapers/
├── src/
│   ├── services/           # Služby pro různé funkcionality
│   │   ├── GeminiService.ts    # Služba pro práci s Google Gemini AI
│   │   ├── WebsiteAnalyzer.ts  # Služba pro analýzu webových stránek
│   │   ├── DatabaseManager.ts  # Služba pro práci s databází
│   │   ├── BrowserManager.ts   # Služba pro práci s prohlížečem
│   │   └── index.ts            # Export všech služeb
│   ├── tools/              # Pomocné nástroje
│   │   ├── bucket.ts           # Nástroje pro práci s Supabase Storage
│   │   └── json.ts             # Nástroje pro práci s JSON
│   ├── types.ts            # Definice typů
│   ├── AiGoogleMapsScraper.ts  # Scraper pro Google Maps s využitím AI
│   ├── GoogleMapsScraper.ts    # Základní scraper pro Google Maps
│   ├── FirmyCzScraper.ts       # Scraper pro Firmy.cz
│   ├── BaseScraper.ts          # Základní třída pro scrapery
│   └── index.ts            # Export všech komponent
```

## Služby

### GeminiService

Služba pro práci s Google Gemini AI. Poskytuje metody pro extrakci dat z HTML pomocí AI.

```typescript
import { geminiService } from '@contact-scraper/scrapers';

// Extrakce dat o firmách z HTML
const companies = await geminiService.extractCompaniesFromHtml(html);

// Extrakce dat o firmě z HTML
const company = await geminiService.extractCompanyDataFromHtml(html, link);

// Analýza webové stránky
const analysis = await geminiService.analyzeWebsite(html, url, viewportSize, dimensions);
```

### WebsiteAnalyzer

Služba pro analýzu webových stránek. Poskytuje metody pro extrakci metadat, emailů a analýzu webových stránek.

```typescript
import { websiteAnalyzer } from '@contact-scraper/scrapers';

// Analýza webové stránky
const websiteData = await websiteAnalyzer.analyzeWebsite(page, websiteUrl, existingEmail);

// Extrakce emailu z HTML
const email = websiteAnalyzer.extractEmail(html);
```

### DatabaseManager

Služba pro práci s databází. Poskytuje metody pro ukládání dat o firmách a webových stránkách.

```typescript
import { databaseManager } from '@contact-scraper/scrapers';

// Uložení dat o firmě
const savedCompany = await databaseManager.saveCompanyData(companyData, industryName, regionName);

// Uložení dat o webové stránce
await databaseManager.saveWebsiteData(companyId, websiteData, websiteUrl);
```

### BrowserManager

Služba pro práci s prohlížečem. Poskytuje metody pro inicializaci prohlížeče, navigaci, scrollování a extrakci dat.

```typescript
import { browserManager } from '@contact-scraper/scrapers';

// Inicializace prohlížeče
await browserManager.init();

// Navigace na stránku
await browserManager.navigateTo(url);

// Získání HTML obsahu stránky
const content = await browserManager.getPageContent();

// Scrollování a extrakce odkazů
const links = await browserManager.scrollAndExtractLinks();

// Zavření prohlížeče
await browserManager.close();
```

## Scrapery

### AiGoogleMapsScraper

Scraper pro Google Maps s využitím AI pro extrakci dat.

```typescript
import { AiGoogleMapsScraper } from '@contact-scraper/scrapers';

// Vytvoření instance
const scraper = new AiGoogleMapsScraper();

// Inicializace
await scraper.init();

// Získání dat o firmě z odkazu
const company = await scraper.getCompanyDataFromLink(link, industryName, regionName);

// Scrapování firem podle oboru a regionu
const result = await scraper.scrapeCompanies(industry, region);

// Zavření scraperu
await scraper.close();
```

### GoogleMapsScraper

Základní scraper pro Google Maps.

```typescript
import { GoogleMapsScraper, runGoogleMapsScraper } from '@contact-scraper/scrapers';

// Vytvoření instance
const scraper = new GoogleMapsScraper(industry, region, headless);

// Scrapování
const companies = await scraper.scrape(query);

// Nebo použití pomocné funkce
const companies = await runGoogleMapsScraper(industry, region, query, options);
```

## Příklad použití

```typescript
import { AiGoogleMapsScraper } from '@contact-scraper/scrapers';

async function main() {
  const scraper = new AiGoogleMapsScraper();
  
  // Scrapování firem podle oboru a regionu
  const result = await scraper.scrapeCompanies('Stavební firma', 'Karlovy Vary');
  console.log(`Úspěšně zpracováno ${result.length} firem.`);
  
  // Nebo získání dat o firmě z odkazu
  const company = await scraper.getCompanyDataFromLink(
    'https://www.google.com/maps/place/...',
    'Stavební firma',
    'Karlovy Vary'
  );
  console.log(`Získána data o firmě: ${company.name}`);
  
  // Nezapomeňte zavřít scraper
  await scraper.close();
}

main().catch(console.error);
