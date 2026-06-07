import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { sleep } from './base.js';

chromium.use(StealthPlugin());

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const NAV_TIMEOUT = 30_000;
const MAX_BLOCKED_RETRIES = 2;

const SEARCH_LIST_SELECTORS = [
  '.jobs-search__results-list',
  '.scaffold-layout__list',
  '.jobs-search-results-list',
];

const JOB_LINK_SELECTORS = [
  '.jobs-search__results-list li .base-card__full-link',
  '.scaffold-layout__list li a[href*="/jobs/view/"]',
  'a.base-card__full-link[href*="/jobs/view/"]',
  'a[href*="/jobs/view/"]',
];

let browser = null;

// Return a random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Wait a random 2–5 seconds between navigations
async function randomDelay() {
  await sleep(randomInt(2000, 5000));
}

// Normalize and validate query strings from collector config
function normalizeQueries(config = {}) {
  if (Array.isArray(config.queries)) {
    return config.queries
      .filter((query) => typeof query === 'string')
      .map((query) => query.trim())
      .filter(Boolean);
  }

  if (typeof config.query === 'string' && config.query.trim()) {
    return [config.query.trim()];
  }

  return [];
}

// Build a LinkedIn jobs search URL with a 30-day posted filter
function buildSearchUrl(query, location) {
  const params = new URLSearchParams();
  params.set('keywords', query);
  if (location) params.set('location', location);
  params.set('f_TPR', 'r2592000');
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

// Normalize a job detail URL for deduplication
function normalizeJobUrl(href) {
  if (!href) return null;

  const absolute = href.startsWith('http')
    ? href
    : `https://www.linkedin.com${href.startsWith('/') ? '' : '/'}${href}`;

  try {
    const url = new URL(absolute);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Detect CAPTCHA, checkpoint, or other bot-block pages
async function isBlocked(page) {
  const currentUrl = page.url();
  if (/captcha|challenge|security-verify|checkpoint/i.test(currentUrl)) {
    return true;
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (
    /unusual activity|security verification|let's do a quick security check|quick security check/i.test(
      bodyText,
    )
  ) {
    return true;
  }

  const captchaCount = await page
    .locator('iframe[src*="captcha"], #captcha, .captcha, form[action*="checkpoint"]')
    .count()
    .catch(() => 0);

  return captchaCount > 0;
}

// Detect LinkedIn rate-limit messaging in page text
function isRateLimited(bodyText) {
  return /too many requests|rate limit|try again later/i.test(bodyText);
}

// Navigate to a URL with limited retries when blocked
async function navigateWithRetry(page, url) {
  for (let attempt = 0; attempt <= MAX_BLOCKED_RETRIES; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

      if (await isBlocked(page)) {
        if (attempt < MAX_BLOCKED_RETRIES) {
          console.warn(
            `[WARN] [linkedin] Blocked response, retry ${attempt + 1}/${MAX_BLOCKED_RETRIES}`,
          );
          await randomDelay();
          continue;
        }
        return 'blocked';
      }

      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (isRateLimited(bodyText)) {
        console.warn('[WARN] [linkedin] Rate limited by LinkedIn — stopping collection');
        return 'rate_limited';
      }

      return 'ok';
    } catch (err) {
      if (attempt < MAX_BLOCKED_RETRIES) {
        console.warn(
          `[WARN] [linkedin] Navigation failed (${err.message}), retry ${attempt + 1}/${MAX_BLOCKED_RETRIES}`,
        );
        await randomDelay();
        continue;
      }
      throw err;
    }
  }

  return 'blocked';
}

// Wait for the search results list to appear
async function waitForSearchResults(page) {
  for (const selector of SEARCH_LIST_SELECTORS) {
    const found = await page
      .waitForSelector(selector, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (found) return true;
  }

  console.warn('[WARN] [linkedin] Search results list not found');
  return false;
}

// Collect job detail URLs from the current search results page
async function collectJobUrls(page, maxResults) {
  const seen = new Set();
  const urls = [];

  for (const selector of JOB_LINK_SELECTORS) {
    const links = await page.locator(selector).all();
    if (links.length === 0) continue;

    for (const link of links) {
      if (urls.length >= maxResults) break;

      const href = await link.getAttribute('href').catch(() => null);
      const normalized = normalizeJobUrl(href);
      if (!normalized || seen.has(normalized)) continue;

      seen.add(normalized);
      urls.push(normalized);
    }

    if (urls.length > 0) break;
  }

  return urls;
}

// Extract visible text from the first matching selector
async function firstText(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (count === 0) continue;

    const text = await locator.innerText().catch(() => '');
    if (text.trim()) return text.trim();
  }

  return '';
}

// Scrape one LinkedIn job detail page into a RawOffer
async function scrapeJobDetail(page, url) {
  const navResult = await navigateWithRetry(page, url);
  if (navResult === 'blocked') return { blocked: true };
  if (navResult === 'rate_limited') return { rateLimited: true };

  await page
    .waitForSelector('.jobs-unified-top-card, .jobs-description, #job-details, h1', {
      timeout: 15_000,
    })
    .catch(() => null);

  const title = await firstText(page, [
    'h1.top-card-layout__title',
    '.jobs-unified-top-card h1',
    'h1.t-24',
    'h1',
  ]);
  const company = await firstText(page, [
    '.jobs-unified-top-card__company-name a',
    '.topcard__org-name-link',
    'a.topcard__org-name-link',
    '.jobs-unified-top-card__company-name',
  ]);
  const location = await firstText(page, [
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
    '.jobs-unified-top-card__workplace-type + span',
  ]);
  const description = await firstText(page, [
    '.jobs-description__content',
    '.jobs-description',
    '#job-details',
    '.jobs-box__html-content',
  ]);

  const rawText = [
    title ? `Title: ${title}` : '',
    company ? `Company: ${company}` : '',
    location ? `Location: ${location}` : '',
    '',
    description,
  ]
    .join('\n')
    .trim();

  if (!rawText) return null;

  return {
    sourceUrl: url,
    rawText,
    source: 'linkedin',
    collectedAt: new Date().toISOString(),
  };
}

// Return the shared Playwright browser instance (lazy launch)
export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

// Close the shared browser and reset the singleton
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export default {
  name: 'linkedin',
  label: 'LinkedIn',
  configSchema: {
    queries: {
      type: 'array',
      description: 'Search strings, e.g. ["backend engineer Berlin"]',
    },
    location: { type: 'string', description: 'Location filter, e.g. "Germany"' },
    maxResults: {
      type: 'number',
      default: 10,
      description: 'Max listings to collect per query',
    },
  },

  // Search LinkedIn Jobs and return raw listings for each result
  async run(config = {}) {
    const queries = normalizeQueries(config);
    const location = typeof config.location === 'string' ? config.location.trim() : '';
    const maxResults =
      typeof config.maxResults === 'number' && config.maxResults > 0
        ? Math.min(Math.floor(config.maxResults), 50)
        : 10;

    if (queries.length === 0) {
      const err = new Error('At least one query must be provided in config.queries');
      err.code = 'INVALID_CONFIG';
      throw err;
    }

    const offers = [];
    const seenUrls = new Set();
    const sharedBrowser = await getBrowser();
    const context = await sharedBrowser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    let stopAll = false;

    try {
      for (const query of queries) {
        if (stopAll) break;

        console.log(`[INFO] [linkedin] Starting collection for query: "${query}"`);
        const searchUrl = buildSearchUrl(query, location);
        const navResult = await navigateWithRetry(page, searchUrl);

        if (navResult === 'blocked') {
          console.warn('[WARN] [linkedin] Session blocked (CAPTCHA detected) — stopping');
          stopAll = true;
          break;
        }

        if (navResult === 'rate_limited') {
          stopAll = true;
          break;
        }

        await waitForSearchResults(page);
        await randomDelay();

        const jobUrls = await collectJobUrls(page, maxResults);
        console.log(`[INFO] [linkedin] Found ${jobUrls.length} job cards for query "${query}"`);

        for (const jobUrl of jobUrls) {
          if (seenUrls.has(jobUrl)) continue;

          const result = await scrapeJobDetail(page, jobUrl);

          if (result?.blocked) {
            console.warn('[WARN] [linkedin] Session blocked (CAPTCHA detected) — stopping');
            stopAll = true;
            break;
          }

          if (result?.rateLimited) {
            stopAll = true;
            break;
          }

          if (result?.rawText) {
            seenUrls.add(jobUrl);
            offers.push(result);
          } else {
            console.warn(`[WARN] [linkedin] Skipping listing (extraction failed): ${jobUrl}`);
          }

          await randomDelay();
        }
      }
    } finally {
      await context.close();
    }

    console.log(`[INFO] [linkedin] Collection finished, jobs found: ${offers.length}`);
    return offers;
  },
};
