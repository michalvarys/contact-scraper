import puppeteer, { Browser, Page } from 'puppeteer';

export async function launchBrowser(headless: boolean = true) {
  // return puppeteer.connect({
  //   browserWSEndpoint: `ws:puppeteer:3000?token=puppeteer123`
  // })

  return puppeteer.launch({
    headless: headless ? 'new' : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
    ],
    protocolTimeout: 120000,
  });
}
