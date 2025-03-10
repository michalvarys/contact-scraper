# Scrapery pro kontaktní údaje

Tento balíček obsahuje implementace scraperů pro získávání kontaktních údajů firem z různých zdrojů.

## Dostupné scrapery

- **GoogleMapsScraper** - Scraper pro Google Maps
- **FirmyCzScraper** - Scraper pro Firmy.cz
- **AiGoogleMapsScraper** - Scraper pro Google Maps s využitím AI pro extrakci dat

## Mock data a testy

Balíček obsahuje mock data a testy pro všechny scrapery, které umožňují testování bez nutnosti přístupu k reálným datům.

### Struktura mock dat

Mock data jsou uložena v adresáři `src/__mocks__` a obsahují:

- **businessMocks.ts** - Mock data pro business objekty, včetně:
  - Ukázkové firmy z Google Maps
  - Ukázkové firmy z Firmy.cz
  - Ukázkové HTML obsahy stránek
  - Ukázkové výsledky vyhledávání
  - Ukázkové analýzy webových stránek

- **serviceMocks.ts** - Mock implementace služeb používaných scrapery:
  - MockBrowserManager - Mock pro správu prohlížeče
  - MockGeminiService - Mock pro AI službu Gemini
  - MockWebsiteAnalyzer - Mock pro analýzu webových stránek
  - MockDatabaseManager - Mock pro správu databáze

### Testy

Testy jsou uloženy v adresáři `src/__tests__` a obsahují:

- **GoogleMapsScraper.test.ts** - Testy pro GoogleMapsScraper
- **FirmyCzScraper.test.ts** - Testy pro FirmyCzScraper
- **AiGoogleMapsScraper.test.ts** - Testy pro AiGoogleMapsScraper

### Spuštění testů

Pro spuštění automatizovaných testů použijte:

```bash
npm test
```

Pro spuštění manuálních testů použijte:

```bash
npm run test:manual
```

## Použití mock dat ve vlastních testech

Mock data můžete použít ve vlastních testech následujícím způsobem:

```typescript
import { mockBusinesses, mockGoogleMapsHtml } from './__mocks__/businessMocks';
import { mockBrowserManager, mockGeminiService } from './__mocks__/serviceMocks';

// Použití mock dat
const testBusiness = mockBusinesses.googleMapsCompany1;

// Použití mock služeb
const browserManager = mockBrowserManager;
const geminiService = mockGeminiService;
```

## Přidání vlastních mock dat

Pro přidání vlastních mock dat můžete rozšířit existující soubory nebo vytvořit nové v adresáři `src/__mocks__`.

Příklad přidání nového mock business objektu:

```typescript
// Přidání do src/__mocks__/businessMocks.ts
export const mockBusinesses: Record<string, Business> = {
  // Existující mock data
  googleMapsCompany1: { ... },
  
  // Nový mock objekt
  myCustomBusiness: {
    id: 'custom1',
    name: 'Moje Firma',
    address: 'Moje Adresa 123',
    email: 'info@mojefirma.cz',
    phone: '+420 123 456 789',
    website: 'https://www.mojefirma.cz',
    industry: 'IT',
    region: 'Praha',
    reviewsCount: 10,
    categories: ['IT služby'],
    link: 'https://www.google.com/maps/place/Moje+Firma',
    scrapedAt: new Date().toISOString(),
  }
};
```

## Tipy pro testování

1. **Izolace testů** - Každý test by měl být nezávislý na ostatních testech.
2. **Resetování mocků** - Používejte `jest.clearAllMocks()` v `beforeEach` pro resetování mocků před každým testem.
3. **Testování protected metod** - Pro testování protected metod můžete použít `@ts-ignore` nebo vytvořit testovací podtřídu.
4. **Simulace chyb** - Testujte i chybové stavy pomocí `mockRejectedValue` nebo `mockImplementation` s throw.
