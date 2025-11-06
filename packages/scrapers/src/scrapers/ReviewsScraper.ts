import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Define interfaces for the data structure
interface BusinessInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: string | null;
  totalReviews: string | null;
}

interface Reviewer {
  name: string;
  avatarUrl: string;
  profileUrl: string;
  isLocalGuide: boolean;
  reviewCount: number;
  photoCount: number;
}

interface OwnerResponse {
  relativeDate: string;
  text: string;
}

interface Review {
  reviewId: string;
  reviewer: Reviewer;
  rating: number;
  relativeDate: string;
  text: string;
  photos: string[];
  likes: number;
  ownerResponse: OwnerResponse | null;
}

interface ReviewsResult {
  businessInfo: BusinessInfo;
  totalReviewsExtracted: number;
  reviews: Review[];
}

interface CookieOptions {
  cookiesPath?: string;
  loadCookies: boolean;
  saveCookies: boolean;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class GoogleBusinessReviewsExtractor {
  private browser: Browser | null = null;
  private cookiesPath: string;
  private loadCookies: boolean;
  private saveCookies: boolean;

  constructor(cookieOptions: CookieOptions = { loadCookies: true, saveCookies: true }) {
    this.cookiesPath = cookieOptions.cookiesPath || path.join(process.cwd(), 'gmb_cookies.json');
    this.loadCookies = cookieOptions.loadCookies;
    this.saveCookies = cookieOptions.saveCookies;
  }

  async init(): Promise<Browser> {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process'],
    });
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('Browser closed.');
    }
  }

  async loadCookiesFromFile(page: Page): Promise<void> {
    try {
      if (this.loadCookies && fs.existsSync(this.cookiesPath)) {
        const cookiesString = fs.readFileSync(this.cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);

        if (cookies.length > 0) {
          console.log(`Loading ${cookies.length} cookies from file...`);
          await page.setCookie(...cookies);
        }
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }

  async saveCookiesToFile(page: Page): Promise<void> {
    try {
      if (this.saveCookies) {
        const cookies = await page.cookies();
        if (cookies.length > 0) {
          console.log(`Saving ${cookies.length} cookies to file...`);
          fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
        }
      }
    } catch (error) {
      console.error('Error saving cookies:', error);
    }
  }

  /**
   * Handle the cookie consent modal that appears on Google sites
   */
  async handleCookieModal(page: Page): Promise<void> {
    try {
      console.log('Checking for cookie consent modal...');

      // Wait a short time for the cookie modal to appear
      await delay(2000);
      // Common selectors for cookie consent buttons (Google uses different ones in different regions)
      const cookieSelectors = [
        'button[aria-label="Přijmout vše"]', // Czech
        'button[aria-label="Souhlasím"]', // Czech
        'button[aria-label="Accept all"]', // English
        'button[aria-label="Agree"]', // English
        'button[aria-label="I agree"]', // English
        'button[aria-label="Akzeptieren"]', // German
        'button[aria-label="Accepter tout"]', // French
        // Add more common selectors for different languages if needed
        'form button:nth-child(1)', // Generic - often the first button is accept
        'form button.tHlp8d', // Another common Google consent button class
        'div[role="dialog"] button:nth-child(1)', // Generic dialog first button
      ];

      for (const selector of cookieSelectors) {
        const buttonExists = await page.evaluate((sel) => {
          const button = document.querySelector(sel);
          return !!button;
        }, selector);

        if (buttonExists) {
          console.log(`Cookie consent button found: ${selector}`);
          await page.click(selector);
          console.log('Clicked cookie consent button');
          // Wait for the modal to disappear
          await delay(1000);
          return;
        }
      }

      console.log('No cookie consent modal detected or already accepted');
    } catch (error) {
      console.log('No cookie consent modal found or error handling it:', error);
    }
  }

  async extractReviews(url: string, maxReviews: number = 40): Promise<ReviewsResult> {
    if (!this.browser) {
      await this.init();
    }

    if (!this.browser) {
      throw new Error('Browser initialization failed');
    }

    const page = await this.browser.newPage();

    try {
      // Set user agent to appear more like a regular browser
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // Load cookies if available
      await this.loadCookiesFromFile(page);

      // Set viewport
      await page.setViewport({ width: 540, height: 960 });

      // Navigate to the page
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Handle cookie consent modal if it appears
      await this.handleCookieModal(page);

      // Additional timeout to ensure page is fully loaded after handling modal
      await delay(2000);

      // Save cookies after successful navigation and cookie consent
      await this.saveCookiesToFile(page);

      console.log('Waiting for reviews to load...');
      try {
        await page.waitForSelector('.jftiEf', { timeout: 30000 });
      } catch (error) {
        console.log('Reviews selector not found, trying to click on reviews tab...');

        // Try to click on the reviews tab if it exists
        try {
          const reviewTabSelector =
            'button[aria-label*="recenz"], button[aria-label*="review"], button[data-tab="reviews"], a[href*="reviews"]';
          await page.click(reviewTabSelector);
          await page.waitForSelector('.jftiEf', { timeout: 30000 });
        } catch (tabError) {
          console.error('Could not find reviews tab:', tabError);
          throw new Error(
            'Reviews not found on the page. Please check the URL or try again later.',
          );
        }
      }

      // Extract business info
      const businessInfo = await this.extractBusinessInfo(page);

      // Scroll to load more reviews
      console.log('Scrolling to load more reviews...');
      const reviews = await this.scrollAndExtractReviews(page, maxReviews);

      const result: ReviewsResult = {
        businessInfo,
        totalReviewsExtracted: reviews.length,
        reviews,
      };

      return result;
    } finally {
      await page.close();
    }
  }

  private async extractBusinessInfo(page: Page): Promise<BusinessInfo> {
    return await page.evaluate(() => {
      const ratingElement = document.querySelector('.F7nice');
      const totalReviewsElement = document.querySelector('.F7nice ~ span');

      return {
        name: document.querySelector('h1')?.textContent?.trim() || null,
        address: document.querySelector('[data-item-id="address"]')?.textContent?.trim() || null,
        phone: document.querySelector('[data-item-id="phone"]')?.textContent?.trim() || null,
        website: document.querySelector('[data-item-id="authority"]')?.textContent?.trim() || null,
        rating: ratingElement?.textContent?.trim() || null,
        totalReviews: totalReviewsElement?.textContent?.match(/\d+(?:[,.]\d+)*/)?.[0] || null,
      };
    });
  }

  private async scrollAndExtractReviews(page: Page, maxReviews: number): Promise<Review[]> {
    let previousHeight;
    let reviewsCount = 0;
    let currentReviewsCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Prevent infinite scrolling

    // Scroll to load more reviews
    while (currentReviewsCount < maxReviews && scrollAttempts < maxScrollAttempts) {
      // Wait for potential new content to load
      // await delay(2000);
      // Find the scrollable container and scroll it
      previousHeight = await page.evaluate(() => {
        const container = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
        return container?.scrollHeight || 0;
      });

      await page.evaluate(() => {
        const container = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
        console.log({ container }, container?.scrollHeight);
        if (container) {
          container.scrollTo(0, container.scrollHeight);
        }
      });

      // Wait for potential new content to load
      await delay(2000);

      currentReviewsCount = await page.evaluate(() => {
        return document.querySelectorAll('.jftiEf').length;
      });

      console.log(
        `Loaded ${currentReviewsCount} reviews so far... (Attempt ${scrollAttempts}/${maxScrollAttempts})`,
      );

      // Check if we loaded any new reviews
      if (currentReviewsCount <= reviewsCount) {
        const newHeight = await page.evaluate(() => {
          const container = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
          return container?.scrollHeight || 0;
        });

        // If height didn't change and review count didn't change, we've probably reached the end
        if (newHeight === previousHeight) {
          console.log('No new content loaded, stopping scroll.');
          scrollAttempts++;
        }
      }

      reviewsCount = currentReviewsCount;

      // Break if we have enough reviews
      if (reviewsCount >= maxReviews) {
        console.log(`Reached target of ${maxReviews} reviews.`);
        break;
      }
    }

    // Take a screenshot for debugging if needed
    // await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

    // Extract reviews from the page
    console.log('Extracting reviews from HTML...');
    const content = await page.content();
    return this.parseReviewsFromHTML(content, maxReviews);
  }

  private parseReviewsFromHTML(html: string, maxReviews: number): Review[] {
    const $ = cheerio.load(html);
    const reviews: Review[] = [];

    $('.jftiEf').each((i, reviewElement) => {
      if (i >= maxReviews) return false; // Limit to max reviews

      const $review = $(reviewElement);

      // Extract reviewer info
      const reviewerId = $review.attr('data-review-id') || '';
      const reviewerName = $review.find('.d4r55').text().trim();
      const reviewerInfo = $review.find('.RfnDt').text().trim();
      const avatarUrl = $review.find('.NBa7we').attr('src') || '';
      const profileUrl = $review.find('.al6Kxe').attr('data-href') || '';

      // Extract review details
      const ratingElement = $review.find('.kvMYJc');
      const rating = ratingElement.find('.elGi1d').length;
      const relativeDate = $review.find('.rsqaWe').text().trim();
      const reviewText = $review.find('.MyEned .wiI7pd').text().trim();

      // Extract photos
      const photos: string[] = [];
      $review.find('.Tya61d').each((j, photoElement) => {
        const backgroundImage = $(photoElement).attr('style') || '';
        const match = backgroundImage.match(/background-image: url\("([^"]+)"\)/);
        const photoUrl = match ? match[1] : null;

        if (photoUrl) {
          photos.push(photoUrl);
        }
      });

      // Extract likes count
      const likesText = $review.find('.znYl0').first().text().trim();
      const likesMatch = likesText.match(/(\d+)/);
      const likes = likesMatch ? parseInt(likesMatch[1]) : 0;

      // Extract owner response
      let ownerResponse: OwnerResponse | null = null;
      const ownerResponseElement = $review.find('.CDe7pd');

      if (ownerResponseElement.length > 0) {
        ownerResponse = {
          relativeDate: ownerResponseElement.find('.DZSIDd').text().trim(),
          text: ownerResponseElement.find('.wiI7pd').text().trim(),
        };
      }

      // Parse reviewer info for additional details
      const isLocalGuide = reviewerInfo.includes('Místní průvodce');
      const reviewCountMatch = reviewerInfo.match(/(\d+) recenzí/);
      const photoCountMatch = reviewerInfo.match(/(\d+) fotek/);

      const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : 0;
      const photoCount = photoCountMatch ? parseInt(photoCountMatch[1]) : 0;

      reviews.push({
        reviewId: reviewerId,
        reviewer: {
          name: reviewerName,
          avatarUrl: avatarUrl,
          profileUrl: profileUrl,
          isLocalGuide: isLocalGuide,
          reviewCount: reviewCount,
          photoCount: photoCount,
        },
        rating: rating,
        relativeDate: relativeDate,
        text: reviewText,
        photos: photos,
        likes: likes,
        ownerResponse: ownerResponse,
      });
    });

    return reviews;
  }
}

// Example usage
async function main() {
  const extractor = new GoogleBusinessReviewsExtractor({
    cookiesPath: './gmb_cookies.json',
    loadCookies: true,
    saveCookies: true,
  });

  try {
    const urls = [
      'https://www.google.com/maps/place/Pizza+Sidonio+Karlovy+Vary/@50.2333697,12.8423088,17z/data=!4m8!3m7!1s0x47a099bae55961c7:0xba260cd80cc1a084!8m2!3d50.2333663!4d12.8448891!9m1!1b1!16s%2Fg%2F11y85m53j9?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
      'https://www.google.com/maps/place/Pizza+Sidonio+Ostrov/@50.3089201,12.9395352,17z/data=!4m8!3m7!1s0x47a0a1515859f2d3:0x5d2fde78ca3b61f9!8m2!3d50.3089167!4d12.9421155!9m1!1b1!16s%2Fg%2F11t7cvwqxq?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
      'https://www.google.com/maps/place/Pizza+Sidonio+Pelh%C5%99imov/@49.4243852,15.220643,17z/data=!4m8!3m7!1s0x470ce56c67b91f8f:0x6f723af36c73089a!8m2!3d49.4243817!4d15.2232233!9m1!1b1!16s%2Fg%2F11y3_jhgg8?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
      'https://www.google.com/maps/place/Pizza+Sidonio+Sokolov/@50.1697863,12.6452462,17z/data=!4m8!3m7!1s0x47a0922346775b6d:0xeff5462134a67c96!8m2!3d50.1697829!4d12.6478265!9m1!1b1!16s%2Fg%2F1th1t13k?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D',
    ];
    // Replace with the actual Google My Business URL
    const gmb_url =
      'https://www.google.com/maps/place/Pizza+Sidonio+Pelh%C5%99imov/@49.4243852,15.220643,17z/data=!4m8!3m7!1s0x470ce56c67b91f8f:0x6f723af36c73089a!8m2!3d49.4243817!4d15.2232233!9m1!1b1!16s%2Fg%2F11y3_jhgg8?entry=ttu&g_ep=EgoyMDI1MDQwOS4wIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D';
    const reviews = await extractor.extractReviews(gmb_url, 1000);

    // Save to file
    fs.writeFileSync('gmb_reviews.json', JSON.stringify(reviews, null, 2));
    console.log(`Extracted ${reviews.totalReviewsExtracted} reviews and saved to gmb_reviews.json`);
  } catch (error) {
    console.error('Failed to extract reviews:', error);
  } finally {
    await extractor.close();
  }
}

// Run the script
main();
