import { WebsiteAnalysisResult } from '../types';
import { mockWebsiteAnalysis } from './businessMocks';

/**
 * Mock implementace BrowserManager
 */
export class MockBrowserManager {
  private page: any = {
    goto: async () => undefined,
    waitForSelector: async () => undefined,
    type: async () => undefined,
    keyboard: {
      press: async () => undefined,
    },
    waitForNavigation: async () => undefined,
    evaluate: async () => {
      // Simulace výsledku evaluate funkce
      return [
        { link: 'https://www.google.com/maps/place/Kavárna+U+Růže', name: 'Kavárna U Růže' },
        {
          link: 'https://www.google.com/maps/place/IT+Solutions+s.r.o.',
          name: 'IT Solutions s.r.o.',
        },
      ];
    },
    content: async () => '<html><body>Mock HTML content</body></html>',
    $: async () => ({}),
    $$: async () => [],
    close: async () => undefined,
  };

  private browser: any = {
    newPage: async () => this.page,
    close: async () => undefined,
  };

  private mockHtmlContent: string = '<html><body>Mock HTML content</body></html>';

  constructor(mockHtml?: string) {
    if (mockHtml) {
      this.mockHtmlContent = mockHtml;
    }
  }

  async init() {
    return Promise.resolve();
  }

  async close() {
    return Promise.resolve();
  }

  getPage() {
    return this.page;
  }

  async navigateTo(url: string) {
    return Promise.resolve();
  }

  async confirmCookiesModal() {
    return Promise.resolve();
  }

  async delay(ms: number) {
    return Promise.resolve();
  }

  async getElementContent(selector: string) {
    return Promise.resolve(this.mockHtmlContent);
  }

  async scrollAndExtractLinks() {
    return Promise.resolve([
      { link: 'https://www.google.com/maps/place/Kavárna+U+Růže', name: 'Kavárna U Růže' },
      {
        link: 'https://www.google.com/maps/place/IT+Solutions+s.r.o.',
        name: 'IT Solutions s.r.o.',
      },
    ]);
  }

  setMockHtmlContent(html: string) {
    this.mockHtmlContent = html;
  }
}

/**
 * Mock implementace GeminiService
 */
export class MockGeminiService {
  async extractCompanyDataFromHtml(html: string, link: string) {
    // Vrací základní data o firmě na základě odkazu
    if (link.includes('Kavárna+U+Růže')) {
      return {
        id: 'gm1',
        name: 'Kavárna U Růže',
        address: 'Václavské náměstí 123, 110 00 Praha 1',
        email: 'info@kavarnaruze.cz',
        phone: '+420 123 456 789',
        website: 'https://www.kavarnaruze.cz',
        rating: '4.7',
        reviewsCount: 128,
        categories: ['Kavárna'],
        link: link,
        scrapedAt: new Date().toISOString(),
      };
    } else if (link.includes('IT+Solutions')) {
      return {
        id: 'gm2',
        name: 'IT Solutions s.r.o.',
        address: 'Vinohradská 456, 120 00 Praha 2',
        email: 'info@itsolutions.cz',
        phone: '+420 234 567 890',
        website: 'https://www.itsolutions.cz',
        rating: '4.2',
        reviewsCount: 45,
        categories: ['IT služby'],
        link: link,
        scrapedAt: new Date().toISOString(),
      };
    } else {
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: 'Neznámá firma',
        address: 'Neznámá adresa',
        email: null,
        phone: null,
        website: null,
        reviewsCount: 0,
        link: link,
        scrapedAt: new Date().toISOString(),
      };
    }
  }
}

/**
 * Mock implementace WebsiteAnalyzer
 */
export class MockWebsiteAnalyzer {
  async analyzeWebsite(
    page: any,
    websiteUrl: string,
    email: string | null,
  ): Promise<WebsiteAnalysisResult> {
    // Vrací mock data o webové stránce na základě URL
    if (websiteUrl.includes('kavarnaruze')) {
      return mockWebsiteAnalysis.kavarnaRuze;
    } else if (websiteUrl.includes('itsolutions')) {
      return mockWebsiteAnalysis.itSolutions;
    } else {
      // Výchozí mock data pro neznámou webovou stránku
      return {
        metadata: {
          title: 'Neznámá webová stránka',
          description: 'Popis neznámé webové stránky',
          keywords: '',
        },
        email: email,
        thumbnail: null,
        websiteAnalysis: {
          seoScore: 50,
          errors: ['Neznámá chyba'],
          designScore: 50,
          modernityScore: 50,
          responsiveScore: 50,
          recommendations: ['Obecné doporučení'],
        },
      };
    }
  }
}

/**
 * Mock implementace DatabaseManager
 */
export class MockDatabaseManager {
  private savedCompanies: any[] = [];

  async saveCompanyData(companyData: any, industryName?: string, regionName?: string) {
    const savedCompany = {
      ...companyData,
      id: companyData.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      industry: industryName ? { name: industryName } : null,
      region: regionName ? { name: regionName } : null,
      categories: (companyData.categories || []).map((name: string) => ({ name })),
      address: companyData.address || undefined,
      metadata: companyData.websiteData
        ? {
            data: JSON.stringify(companyData.websiteData.metadata || {}),
            website: {
              link: companyData.website,
              thumbnail: companyData.websiteData.thumbnail,
              data: JSON.stringify(companyData.websiteData.websiteAnalysis || {}),
            },
          }
        : null,
    };

    this.savedCompanies.push(savedCompany);
    return savedCompany;
  }

  async saveWebsiteData(companyId: string, websiteData: WebsiteAnalysisResult, websiteUrl: string) {
    // Simulace uložení dat o webové stránce
    return Promise.resolve();
  }

  getSavedCompanies() {
    return this.savedCompanies;
  }

  clearSavedCompanies() {
    this.savedCompanies = [];
  }
}

// Export mock instancí služeb
export const mockBrowserManager = new MockBrowserManager();
export const mockGeminiService = new MockGeminiService();
export const mockWebsiteAnalyzer = new MockWebsiteAnalyzer();
export const mockDatabaseManager = new MockDatabaseManager();
