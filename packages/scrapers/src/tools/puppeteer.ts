import puppeteer, { Browser, Page } from 'puppeteer';

export async function launchBrowser(headless: boolean = true) {
  const browserWSEndpoint = process.env.BROWSER_WS_ENDPOINT;
  if (browserWSEndpoint) {
    return puppeteer.connect({
      browserWSEndpoint,
      protocolTimeout: 120000,
    });
  }

  return puppeteer.launch({
    headless: headless ? true : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
    ],
    protocolTimeout: 120000,
  });
}
