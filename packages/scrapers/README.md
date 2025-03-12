# Scraper Queue System

Systém pro správu a řízení scraperů s podporou fronty úloh, sledováním stavu a možností pozastavení/obnovení.

## Funkce

- Správa úloh scraperů (vytvoření, spuštění, pozastavení, obnovení)
- Sledování stavu úloh a jednotlivých odkazů
- Ukládání logů a chybových hlášek
- Možnost opakování selhavších odkazů
- Podpora různých typů scraperů (Google Maps, Firmy.cz)

## Architektura

### ScraperQueue

Hlavní třída pro správu fronty scraperů. Implementuje návrhový vzor Singleton pro zajištění jediné instance fronty.

```typescript
const queue = ScraperQueue.getInstance();
```

### Stavy úloh

- `PENDING` - Čeká na zpracování
- `RUNNING` - Probíhá zpracování
- `PAUSED` - Pozastaveno
- `COMPLETED` - Dokončeno
- `FAILED` - Selhalo
- `PROCESSED` - Zpracováno
- `SKIPPED` - Přeskočeno

### Metadata úlohy

- ID úlohy
- Typ scraperu
- Konfigurace scraperu
- Průmysl/obor
- Region
- Vyhledávací dotaz
- Stav
- Chybová hláška
- Časy (vytvoření, spuštění, dokončení)
- Seznam odkazů ke zpracování

### Příklad použití

```typescript
// Vytvoření nové úlohy
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

// Pozastavení úlohy
await queue.pauseTask(taskId);

// Obnovení úlohy
await queue.resumeTask(taskId);

// Opakování selhavších odkazů
await queue.retryFailedLinks(taskId);

// Zpracování konkrétního odkazu
await queue.processLink(taskId, link);
```

## Spuštění příkladů

```bash
# Instalace závislostí
pnpm install

# Spuštění příkladu fronty
pnpm queue:example

# Spuštění testovacího scraperu
pnpm test:scraper

# Spuštění unit testů
pnpm test
```

## Rozšíření

Pro přidání nového typu scraperu:

1. Vytvořte novou třídu dědící z `BaseScraper`
2. Implementujte metody `searchLinks` a `scrapeLink`
3. Přidejte nový typ do `createScraper` v `ScraperQueue`

```typescript
class NewScraper extends BaseScraper {
  public async searchLinks(query: string): Promise<string[]> {
    // Implementace vyhledávání odkazů
  }

  public async scrapeLink(link: string): Promise<BaseBusinessData> {
    // Implementace scrapování dat z odkazu
  }
}
```

## Použití v projektu

Scraper queue systém je integrován s TRPC API a může být použit přes endpointy v `packages/api/src/routers/scraper.ts`. Frontend komponenty pro správu úloh jsou dostupné v `apps/client/src/app/scraper-queue/`.

## Testování

Projekt obsahuje několik typů testů:

### Unit testy

Unit testy používají Jest a testují jednotlivé komponenty systému izolovaně. Testy jsou umístěny v adresáři `__tests__` a lze je spustit pomocí:

```bash
pnpm test
```

### Integrační testy

Integrační testy testují spolupráci mezi komponentami systému. Používají mock implementaci databáze pro simulaci reálného prostředí.

### Manuální testování

Pro manuální testování jednotlivých scraperů lze použít testovací skript:

```bash
pnpm test:scraper
```

Tento skript spustí scraper v testovacím režimu a vypíše nalezené odkazy a získaná data.

### Příklad fronty

Pro otestování celého systému fronty včetně zpracování úloh lze použít ukázkový skript:

```bash
pnpm queue:example
```

Tento skript vytvoří testovací úlohu a demonstruje různé operace s frontou (pozastavení, obnovení, opakování selhavších odkazů).
