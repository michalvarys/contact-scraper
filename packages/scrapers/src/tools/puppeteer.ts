import puppeteer, { Browser, Page } from 'puppeteer';

export function launchBrowser(headless: boolean = true) {
  return puppeteer.launch({
    headless: headless ? 'new' : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  });
}
