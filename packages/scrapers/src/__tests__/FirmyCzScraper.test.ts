// @ts-nocheck
import { FirmyCzScraper } from '../FirmyCzScraper';
import { mockBusinesses, mockFirmyCzHtml } from '../__mocks__/businessMocks';
import puppeteer from 'puppeteer';
import axios from 'axios';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockImplementation(() => ({
    newPage: jest.fn().mockImplementation(() => ({
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      cookies: jest.fn().mockResolvedValue([]),
      setCookie: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn().mockImplementation((url: any) => {
    return Promise.resolve({ data: mockFirmyCzHtml });
  }),
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

describe('FirmyCzScraper', () => {
  let scraper: FirmyCzScraper;

  beforeEach(() => {
    jest.clearAllMocks();
    scraper = new FirmyCzScraper({ searchQuery: 'autoservis' });
  });

  afterEach(async () => {
    await scraper.close();
  });

  test('měl by inicializovat scraper s výchozími hodnotami', () => {
    expect(scraper.baseUrl).toBe('https://www.firmy.cz/');
  });

  test('měl by správně sestavit URL stránky', () => {
    // @ts-ignore
    const url1 = scraper.buildPageUrl(1, 'autoservis');
    // @ts-ignore
    const url2 = scraper.buildPageUrl(2, 'autoservis');
    // @ts-ignore
    const url3 = scraper.buildPageUrl(1, 'autoservis Praha');

    expect(url1).toBe('https://www.firmy.cz/?q=autoservis');
    expect(url2).toBe('https://www.firmy.cz/?q=autoservis&page=2');
    expect(url3).toBe('https://www.firmy.cz/?q=autoservis%20Praha');
  });

  test('měl by správně extrahovat odkazy na firmy', () => {
    const html = `
      <div>
        <a href="/detail/12345-autoservis-rychly-plzen.html">Autoservis Rychlý</a>
        <a href="https://c.seznam.cz/click?adurl=https://www.example.com">Reklama</a>
        <a href="/detail/67890-kvetinarstvi-orchidej-plzen.html">Květinářství Orchidej</a>
      </div>
    `;

    // @ts-ignore
    const links = scraper.extractCompanyLinks(html);

    expect(links).toHaveLength(2);
    expect(links[0]).toBe('https://www.firmy.cz/detail/12345-autoservis-rychly-plzen.html');
    expect(links[1]).toBe('https://www.firmy.cz/detail/67890-kvetinarstvi-orchidej-plzen.html');
  });

  test('měl by správně scrapovat detaily firmy', async () => {
    // @ts-ignore
    const businessDetails = await scraper.scrapeBusinessDetails(
      'https://www.firmy.cz/detail/12345-autoservis-rychly-plzen.html',
    );

    expect(businessDetails.name).toBe('Autoservis Rychlý');
    expect(businessDetails.address).toBe('Patočkova 4/6, 169 00 Praha, Střešovice');
    expect(businessDetails.email).toBe('servis@autoservisrychly.cz');
    expect(businessDetails.phone).toBe('+420 345 678 901');
    expect(businessDetails.website).toBe('https://www.autoservisrychly.cz');
    expect(businessDetails.categories).toContain('Autoservis');
  });

  test('měl by správně detekovat další stránku', () => {
    const htmlWithNextPage = `
      <div>
        <a href="?page=2">›</a>
      </div>
    `;

    const htmlWithoutNextPage = `
      <div>
        <a href="?page=1">‹</a>
      </div>
    `;

    // @ts-ignore
    expect(scraper.hasNextPage(htmlWithNextPage)).toBe(true);
    // @ts-ignore
    expect(scraper.hasNextPage(htmlWithoutNextPage)).toBe(false);
  });
});
