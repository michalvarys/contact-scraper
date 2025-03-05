import { Page } from 'puppeteer';

export class WebsiteScraper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async scrapeWebsite(url: string): Promise<{ email: string; screenshot: string }> {
    await this.page.goto(url);

    let email = '';

    // Try to find email on main page
    email = await this.findEmailOnPage();

    if (!email) {
      // Check sitemap.xml
      const contactPage = await this.findContactPage();
      if (contactPage) {
        await this.page.goto(contactPage);
        email = await this.findEmailOnPage();
      }
    }

    // Take screenshot
    const screenshot = await this.takeScreenshot();

    return { email, screenshot };
  }

  private async findEmailOnPage(): Promise<string> {
    return await this.page.evaluate(() => {
      const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/gi;
      const pageText = document.body.innerText;
      const matches = pageText.match(emailRegex);
      return matches ? matches[0] : '';
    });
  }

  private async findContactPage(): Promise<string> {
    try {
      // Try to find sitemap
      const response = await fetch(this.page.url() + '/sitemap.xml');
      const sitemap = await response.text();

      // Look for contact page URL
      const contactRegex = /(?<=<loc>)(.*?contact.*?)(?=<\/loc>)/i;
      const match = sitemap.match(contactRegex);
      return match ? match[0] : '';
    } catch {
      return '';
    }
  }

  private async takeScreenshot(): Promise<string> {
    const timestamp = Date.now();
    const filename = `screenshots/${timestamp}.png`;
    await this.page.screenshot({ path: filename });
    return filename;
  }
}
