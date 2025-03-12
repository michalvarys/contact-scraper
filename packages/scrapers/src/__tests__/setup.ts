import { prisma } from '../tools/mockDb';

// Vyčištění mock databáze před každým testem
beforeEach(async () => {
  // Vyčištění všech kolekcí
  prisma._testing.clearAll();
});

// Nastavení delšího timeoutu pro testy, protože pracujeme s puppeteer
jest.setTimeout(30000);

// Mock pro puppeteer, abychom nemuseli spouštět skutečný prohlížeč
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(null),
      evaluate: jest.fn().mockResolvedValue(null),
      close: jest.fn().mockResolvedValue(null),
      $: jest.fn().mockResolvedValue(null),
      $$: jest.fn().mockResolvedValue([]),
      $eval: jest.fn().mockResolvedValue(null),
      $$eval: jest.fn().mockResolvedValue([]),
      waitForSelector: jest.fn().mockResolvedValue(null),
      waitForNavigation: jest.fn().mockResolvedValue(null),
      content: jest.fn().mockResolvedValue(''),
      setViewport: jest.fn().mockResolvedValue(null),
      setUserAgent: jest.fn().mockResolvedValue(null),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(null),
    }),
    close: jest.fn().mockResolvedValue(null),
  }),
}));

// Potlačení console.error během testů
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ExperimentalWarning') || // Ignorovat experimentální varování
        args[0].includes('Failed to process next task')) // Ignorovat očekávané chyby při testování
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
