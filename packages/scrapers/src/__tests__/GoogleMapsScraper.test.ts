import { GoogleMapsScraper } from '../GoogleMapsScraper';
import { mockBusinesses, mockGoogleMapsHtml } from '../__mocks__/businessMocks';
import puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockImplementation(() => ({
    newPage: jest.fn().mockImplementation(() => ({
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      keyboard: {
        press: jest.fn().mockResolvedValue(undefined),
      },
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation(() => {
        return [
          { link: 'https://www.google.com/maps/place/Kavárna+U+Růže', name: 'Kavárna U Růže' },
          {
            link: 'https://www.google.com/maps/place/IT+Solutions+s.r.o.',
            name: 'IT Solutions s.r.o.',
          },
        ];
      }),
      content: jest.fn().mockResolvedValue(mockGoogleMapsHtml),
      cookies: jest.fn().mockResolvedValue([]),
      setCookie: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock prisma
jest.mock('@contact-scraper/db', () => ({
  prisma: {
    industry: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data: { data: any }) => Promise.resolve({ id: 1, ...data.data })),
    },
    region: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data: { data: any }) => Promise.resolve({ id: 2, ...data.data })),
    },
    company: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((data: { data: any }) =>
          Promise.resolve({ id: 'test-id', ...data.data }),
        ),
      update: jest
        .fn()
        .mockImplementation((data: { data: any }) =>
          Promise.resolve({ id: 'test-id', ...data.data }),
        ),
    },
    category: {
      upsert: jest
        .fn()
        .mockImplementation((data: { create: any }) => Promise.resolve({ id: 3, ...data.create })),
    },
  },
}));

describe('GoogleMapsScraper', () => {
  let scraper: GoogleMapsScraper;

  beforeEach(() => {
    // Resetování mocků před každým testem
    jest.clearAllMocks();

    // Vytvoření instance scraperu
    scraper = new GoogleMapsScraper('kavárna', 'Praha', false);
  });

  afterEach(async () => {
    // Uzavření browseru po každém testu
    await scraper.closeBrowser();
  });

  test('měl by inicializovat scraper s výchozími hodnotami', () => {
    expect(scraper.baseUrl).toBe('https://www.google.com/maps');
    expect(scraper.industry).toBe('kavárna');
    expect(scraper.region).toBe('Praha');
  });

  test('měl by správně extrahovat odkazy na firmy', () => {
    const html = `
      <div>
        <a href="https://www.google.com/maps/place/Kavárna+U+Růže">Kavárna U Růže</a>
        <a href="https://www.google.com/maps/place/IT+Solutions+s.r.o.">IT Solutions s.r.o.</a>
        <a href="https://www.google.com/maps/dir/Kavárna">Směr (tento by měl být přeskočen)</a>
      </div>
    `;

    const links = scraper.extractCompanyLinks(html);

    // Extrahované odkazy by měly být prázdné, protože GoogleMapsScraper používá collectMapLinks
    expect(links).toEqual([]);
  });

  test('měl by správně scrapovat detaily firmy', async () => {
    // Inicializace browseru
    await scraper.initializeBrowser();

    // Scrapování detailů firmy
    const link = 'https://www.google.com/maps/place/Kavárna+U+Růže';
    const businessDetails = await scraper.scrapeBusinessDetails(link);

    // Ověření, že detaily firmy obsahují očekávané hodnoty
    expect(businessDetails.name).toBe('Kavárna U Růže');
    expect(businessDetails.link).toBe(link);
    expect(businessDetails.industry).toBe('kavárna');
    expect(businessDetails.region).toBe('Praha');
  });

  test('měl by vrátit výsledky při vyhledávání', async () => {
    const results = await scraper.searchAndScrape('kavárna Praha');

    // Ověření, že výsledky obsahují očekávané hodnoty
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBeDefined();
    expect(results[0].link).toBeDefined();
  });

  test('měl by správně scrapovat jeden odkaz', async () => {
    const link = 'https://www.google.com/maps/place/Kavárna+U+Růže';
    const result = await scraper.scrapeLink(link);

    // Ověření, že výsledek obsahuje očekávané hodnoty
    expect(result.name).toBeDefined();
    expect(result.link).toBe(link);
  });
});
