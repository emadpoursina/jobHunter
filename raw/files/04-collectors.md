# 04 — Collectors

Collectors are pluggable modules that fetch raw job listings from a source.
They return raw text — they do NOT parse, call the LLM, or write to the DB.
All of that happens in the pipeline stage after collection.

---

## Base interface (`collectors/base.js`)

Every collector must export an object that satisfies this interface:

```js
{
  name: string,           // machine name, e.g. "linkedin"
  label: string,          // human label, e.g. "LinkedIn"
  configSchema: object,   // JSON-schema-like description of config fields (for UI)

  // Main method. Returns array of RawOffer objects.
  // config is validated by the route before calling run().
  run(config: CollectorConfig): Promise<RawOffer[]>
}
```

### `RawOffer` shape

```js
{
  sourceUrl: string | null,   // canonical URL of the listing (for deduplication)
  rawText: string,            // full text content of the job listing
  source: string,             // collector name, e.g. "linkedin"
  collectedAt: string         // ISO timestamp
}
```

### `base.js` shared utilities to export

```js
// Delay helper — used to be polite to servers
sleep(ms: number): Promise<void>

// Strips HTML tags, normalises whitespace
cleanHtml(html: string): string

// Builds a slug for the offer .md filename
// e.g. "acme-gmbh-backend-engineer-2025-06"
makeSlug(company: string, title: string, date: Date): string

// Derives ISO country code from a location string
// e.g. "Berlin, Germany" → "DE", "Amsterdam" → "NL"
// Returns "XX" if unknown.
inferCountryCode(location: string): string
```

---

## Registry (`collectors/registry.js`)

Imports all collectors and exports a `Map<name, collector>`.

```js
import linkedin from './linkedin.js'
import indeed   from './indeed.js'
import manual   from './manual.js'

export const registry = new Map([
  ['linkedin', linkedin],
  ['indeed',   indeed],
  ['manual',   manual],
])

export function getCollector(name) {
  const c = registry.get(name)
  if (!c) throw new Error(`Unknown collector: ${name}`)
  return c
}
```

Adding a new source in the future = create a new file, add one line here.

---

## Manual collector (`collectors/manual.js`)

Accepts either pasted text or a URL. For URLs, uses `fetch()` + `cheerio` to
extract text content (no Playwright needed for manual URL fetch — the user
pastes a URL they already have access to).

### Config schema
```js
{
  text: { type: 'string', description: 'Raw pasted job listing text' },
  url:  { type: 'string', description: 'Direct URL to job listing page' }
}
```
At least one of `text` or `url` must be provided.

### Behaviour
1. If `config.text` is provided: wrap it in a `RawOffer` directly.
2. If `config.url` is provided:
   a. `fetch()` the URL
   b. Load HTML into `cheerio`
   c. Extract `document.body` text, clean with `base.cleanHtml()`
   d. Return one `RawOffer`

### Returns
Array of exactly one `RawOffer`.

---

## LinkedIn collector (`collectors/linkedin.js`)

Uses Playwright (headless Chromium) to search LinkedIn Jobs and collect
listings. LinkedIn renders content via JavaScript so plain `fetch()` does not
work.

### Config schema
```js
{
  queries:    { type: 'array',  description: 'Search strings, e.g. ["backend engineer Berlin"]' },
  location:   { type: 'string', description: 'Location filter, e.g. "Germany"' },
  maxResults: { type: 'number', default: 10, description: 'Max listings to collect per query' }
}
```

### Implementation notes

**Important:** LinkedIn actively detects bots. This collector must:
- Use `playwright-extra` with `puppeteer-extra-plugin-stealth` (the Playwright
  version) to reduce detection fingerprinting
- Add random delays of 2–5 seconds between page navigations (use
  `base.sleep(randomInt(2000, 5000))`)
- Set a realistic `userAgent` string
- Not retry more than 2 times on a blocked response
- Log a clear warning (not throw) if LinkedIn rate-limits the session

**Search URL pattern:**
```
https://www.linkedin.com/jobs/search/?keywords=<encoded_query>&location=<encoded_location>&f_TPR=r2592000
```
`f_TPR=r2592000` filters to the last 30 days.

**Page scraping steps per query:**
1. Navigate to the search URL
2. Wait for `.jobs-search__results-list` or `.scaffold-layout__list`
3. Collect up to `maxResults` job card elements
4. For each card, extract the detail page URL
5. Navigate to each detail page
6. Wait for `.jobs-unified-top-card` and `.jobs-description`
7. Extract: title, company, location (from the top card), full description text
8. Construct `RawOffer` with the detail page URL and combined text
9. Sleep 2–5s between listings

**On failure:**
- If a page load times out or returns an error, log a warning and skip that
  listing (do not throw — partial results are acceptable)
- If the session appears blocked (CAPTCHA page detected), stop immediately and
  update the run record with a warning message

### Browser singleton

Playwright's `chromium.launch()` is slow (~1s). Use a module-level singleton:

```js
let browser = null

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true })
  }
  return browser
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
```

Call `closeBrowser()` on `process.on('SIGINT')` and `process.on('SIGTERM')` in
`server/index.js`.

---

## Indeed collector (`collectors/indeed.js`)

Similar Playwright-based approach. Indeed is generally less aggressive about
bot detection than LinkedIn.

### Config schema
```js
{
  queries:    { type: 'array',  description: 'Search strings' },
  location:   { type: 'string', description: 'Location filter, e.g. "Germany"' },
  maxResults: { type: 'number', default: 10 }
}
```

**Search URL pattern:**
```
https://de.indeed.com/jobs?q=<encoded_query>&l=<encoded_location>&fromage=30
```
Use `de.indeed.com` for Germany targeting. For other countries, the subdomain
changes (e.g. `nl.indeed.com`). Derive subdomain from the location field using
a simple country→subdomain map in the collector.

**Page scraping steps:**
1. Navigate to search URL
2. Wait for `#mosaic-provider-jobcards` or `.jobsearch-ResultsList`
3. Collect job card links (`.jcs-JobTitle a` or similar)
4. For each link, navigate to the full job page
5. Extract title from `h1.jobsearch-JobInfoHeader-title`
6. Extract company from `[data-testid="inlineHeader-companyName"]`
7. Extract location from `[data-testid="job-location"]`
8. Extract description text from `#jobDescriptionText`
9. Construct `RawOffer`

**Selectors may change** — Indeed updates its DOM periodically. Add a comment
noting the date these selectors were last verified. If extraction fails for a
card, skip it and log a warning.

---

## Adding a new collector

To add a new source (e.g. `glassdoor`, `xing`, `stepstone`):

1. Create `collectors/<name>.js`
2. Export an object satisfying the base interface
3. Add one line to `collectors/registry.js`
4. The API, queue, and frontend will all pick it up automatically

No other files need to change.
