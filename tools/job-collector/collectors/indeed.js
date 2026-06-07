import { inferCountryCode, sleep } from './base.js';
import { getBrowser } from './linkedin.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const NAV_TIMEOUT = 30_000;
const MAX_BLOCKED_RETRIES = 2;
const DEFAULT_SUBDOMAIN = 'de';

// Indeed country subdomain map — ISO code → Indeed subdomain (verified 2026-06)
const COUNTRY_SUBDOMAIN = {
  DE: 'de',
  NL: 'nl',
  GB: 'uk',
  US: 'www',
  FR: 'fr',
  ES: 'es',
  IT: 'it',
  PT: 'pt',
  PL: 'pl',
  AT: 'at',
  CH: 'ch',
  BE: 'be',
  IE: 'ie',
  CA: 'ca',
  AU: 'au',
  SE: 'se',
  NO: 'no',
  DK: 'dk',
  FI: 'fi',
  CZ: 'cz',
  AE: 'ae',
};

// Selectors last verified 2026-06 — Indeed updates DOM periodically
const SEARCH_LIST_SELECTORS = ['#mosaic-provider-jobcards', '.jobsearch-ResultsList'];

const JOB_LINK_SELECTORS = [
  '.jcs-JobTitle a',
  'a.jcs-JobTitle',
  '.jobsearch-ResultsList a[data-jk]',
  '#mosaic-provider-jobcards a[href*="/viewjob"]',
  'a[href*="/viewjob"]',
];

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

// Map a location string to an Indeed subdomain (defaults to de.indeed.com)
function resolveSubdomain(location) {
  const code = inferCountryCode(location);
  return COUNTRY_SUBDOMAIN[code] ?? DEFAULT_SUBDOMAIN;
}

// Build the Indeed jobs search URL with a 30-day posted filter
function buildSearchUrl(query, location) {
  const subdomain = resolveSubdomain(location);
  const params = new URLSearchParams();
  params.set('q', query);
  if (location) params.set('l', location);
  params.set('fromage', '30');
  return `https://${subdomain}.indeed.com/jobs?${params.toString()}`;
}

// Normalize a job detail URL for deduplication
function normalizeJobUrl(href, subdomain) {
  if (!href) return null;

  const host = `${subdomain}.indeed.com`;
  const absolute = href.startsWith('http')
    ? href
    : `https://${host}${href.startsWith('/') ? '' : '/'}${href}`;

  try {
    const url = new URL(absolute);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Detect CAPTCHA, Cloudflare, or other bot-block pages
async function isBlocked(page) {
  const currentUrl = page.url();
  if (/captcha|challenge|security-check|__cf_chl/i.test(currentUrl)) {
    return true;
  }

  const title = await page.title().catch(() => '');
  if (/security check|nur einen moment|just a moment/i.test(title)) {
    return true;
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (
    /unusual traffic|verify you are human|security check|additional verification required|ray id/i.test(
      bodyText,
    )
  ) {
    return true;
  }

  const captchaCount = await page
    .locator('iframe[src*="captcha"], #captcha, .captcha, #challenge-form')
    .count()
    .catch(() => 0);

  return captchaCount > 0;
}

// Navigate to a URL with limited retries when blocked
async function navigateWithRetry(page, url) {
  for (let attempt = 0; attempt <= MAX_BLOCKED_RETRIES; attempt += 1) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      });

      if (response?.status() === 403) {
        if (attempt < MAX_BLOCKED_RETRIES) {
          console.warn(
            `[WARN] [indeed] HTTP 403, retry ${attempt + 1}/${MAX_BLOCKED_RETRIES}`,
          );
          await randomDelay();
          continue;
        }
        return 'blocked';
      }

      if (await isBlocked(page)) {
        if (attempt < MAX_BLOCKED_RETRIES) {
          console.warn(
            `[WARN] [indeed] Blocked response, retry ${attempt + 1}/${MAX_BLOCKED_RETRIES}`,
          );
          await randomDelay();
          continue;
        }
        return 'blocked';
      }

      return 'ok';
    } catch (err) {
      if (attempt < MAX_BLOCKED_RETRIES) {
        console.warn(
          `[WARN] [indeed] Navigation failed (${err.message}), retry ${attempt + 1}/${MAX_BLOCKED_RETRIES}`,
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

  console.warn('[WARN] [indeed] Search results list not found');
  return false;
}

// Collect job detail URLs from the current search results page
async function collectJobUrls(page, maxResults, subdomain) {
  const seen = new Set();
  const urls = [];

  for (const selector of JOB_LINK_SELECTORS) {
    const links = await page.locator(selector).all();
    if (links.length === 0) continue;

    for (const link of links) {
      if (urls.length >= maxResults) break;

      const href = await link.getAttribute('href').catch(() => null);
      const normalized = normalizeJobUrl(href, subdomain);
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

// Scrape one Indeed job detail page into a RawOffer
async function scrapeJobDetail(page, url) {
  const navResult = await navigateWithRetry(page, url);
  if (navResult === 'blocked') return { blocked: true };

  await page
    .waitForSelector(
      'h1.jobsearch-JobInfoHeader-title, #jobDescriptionText, [data-testid="jobsearch-JobInfoHeader-title"]',
      { timeout: 15_000 },
    )
    .catch(() => null);

  const title = await firstText(page, [
    'h1.jobsearch-JobInfoHeader-title',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    'h1',
  ]);
  const company = await firstText(page, [
    '[data-testid="inlineHeader-companyName"]',
    '[data-company-name="true"]',
    '.jobsearch-InlineCompanyRating a',
  ]);
  const location = await firstText(page, [
    '[data-testid="job-location"]',
    '[data-testid="inlineHeader-companyLocation"]',
    '.jobsearch-JobInfoHeader-subtitle div',
  ]);
  const description = await firstText(page, ['#jobDescriptionText', '.jobsearch-JobComponent-description']);

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
    source: 'indeed',
    collectedAt: new Date().toISOString(),
  };
}

export default {
  name: 'indeed',
  label: 'Indeed',
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

  // Search Indeed Jobs and return raw listings for each result
  async run(config = {}) {
    const queries = normalizeQueries(config);
    const location = typeof config.location === 'string' ? config.location.trim() : '';
    const maxResults =
      typeof config.maxResults === 'number' && config.maxResults > 0
        ? Math.min(Math.floor(config.maxResults), 50)
        : 10;
    const subdomain = resolveSubdomain(location);

    if (queries.length === 0) {
      const err = new Error('At least one query must be provided in config.queries');
      err.code = 'INVALID_CONFIG';
      throw err;
    }

    const offers = [];
    const seenUrls = new Set();
    const sharedBrowser = await getBrowser();
    const context = await sharedBrowser.newContext({
      userAgent: USER_AGENT,
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    const page = await context.newPage();

    let stopAll = false;

    try {
      for (const query of queries) {
        if (stopAll) break;

        console.log(`[INFO] [indeed] Starting collection for query: "${query}"`);
        const searchUrl = buildSearchUrl(query, location);
        const navResult = await navigateWithRetry(page, searchUrl);

        if (navResult === 'blocked') {
          console.warn('[WARN] [indeed] Session blocked — stopping');
          stopAll = true;
          break;
        }

        await waitForSearchResults(page);
        await randomDelay();

        const jobUrls = await collectJobUrls(page, maxResults, subdomain);
        console.log(`[INFO] [indeed] Found ${jobUrls.length} job cards for query "${query}"`);

        for (const jobUrl of jobUrls) {
          if (seenUrls.has(jobUrl)) continue;

          const result = await scrapeJobDetail(page, jobUrl);

          if (result?.blocked) {
            console.warn('[WARN] [indeed] Session blocked — stopping');
            stopAll = true;
            break;
          }

          if (result?.rawText) {
            seenUrls.add(jobUrl);
            offers.push(result);
          } else {
            console.warn(`[WARN] [indeed] Skipping listing (extraction failed): ${jobUrl}`);
          }

          await randomDelay();
        }
      }
    } finally {
      await context.close();
    }

    console.log(`[INFO] [indeed] Collection finished, jobs found: ${offers.length}`);
    return offers;
  },
};
