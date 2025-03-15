// @ts-nocheck
import AiGoogleMapsScraper from '../AiGoogleMapsScraper';
import { mockBusinesses, mockGoogleMapsHtml } from '../__mocks__/businessMocks';
import * as services from '../services';

// Mock služeb
jest.mock('../services', () => {
  const originalModule = jest.requireActual('../__mocks__/serviceMocks');
  return {
    geminiService: originalModule.mockGeminiService,
    websiteAnalyzer: originalModule.mockWebsiteAnalyzer,
    databaseManager: originalModule.mockDatabaseManager,
    BrowserManager: jest.fn().mockImplementation(() => originalModule.mockBrowserManager),
  };
});

describe('AiGoogleMapsScraper', () => {
  let scraper: AiGoogleMapsScraper;

  beforeEach(() => {
    // Resetování mocků před každým testem
    jest.clearAllMocks();

    // Vytvoření instance scraperu
    scraper = new AiGoogleMapsScraper();
  });

  afterEach(async () => {
    // Uzavření scraperu po každém testu
    await scraper.close();
  });

  test('měl by inicializovat scraper', async () => {
    await scraper.init();
    // Ověření, že scraper byl inicializován
    expect(scraper).toBeDefined();
  });

  test('měl by získat data o firmě z odkazu', async () => {
    const link = 'https://www.google.com/maps/place/Kavárna+U+Růže';
    const result = await scraper.getCompanyDataFromLink(link);

    // Ověření, že výsledek obsahuje očekávané hodnoty
    expect(result).toBeDefined();
    expect(result?.name).toBeDefined();
  });

  test('měl by scrapovat firmy podle oboru a regionu', async () => {
    const result = await scraper.scrapeCompanies('kavárna Praha');

    // Ověření, že výsledek obsahuje očekávané hodnoty
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Úspěšně zpracováno');
  });

  test('měl by extrahovat detaily firmy z HTML', async () => {
    // @ts-ignore - přístup k protected metodě pro testování
    const result = await scraper.scrapeBusinessDetails(
      mockGoogleMapsHtml,
      'https://www.google.com/maps/place/Kavárna+U+Růže',
    );

    // Ověření, že výsledek obsahuje očekávané hodnoty
    expect(result).toBeDefined();
    expect(result.name).toBe('Kavárna U Růže');
  });
});
