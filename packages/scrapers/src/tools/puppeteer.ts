import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';

const executablePath = path.join(
  process.cwd(),
  'node_modules/puppeteer/.local-chromium/linux-938248/chrome-linux/chrome',
);

export function launchBrowser(headless: boolean = true) {
  return puppeteer.launch({
    headless: headless ? 'new' : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath,
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
