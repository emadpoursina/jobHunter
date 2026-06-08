// Browser-console extraction scripts — run on the target site in DevTools (F12 → Console)

const SCRIPT_HEADER = `// job-collector browser extractor — paste in DevTools Console on the target page
(function () {`;

const SCRIPT_FOOTER = `
  const payload = { source: SOURCE, offers };
  const json = JSON.stringify(payload, null, 2);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).then(
      () => console.log('Copied ' + offers.length + ' offer(s) to clipboard. Paste into job-collector Dashboard.'),
      () => console.log(json),
    );
  } else {
    console.log('Copy this JSON into job-collector Dashboard:\\n', json);
  }
  return payload;
})();`;

// Pick the first element matching any selector and return trimmed innerText
const pickTextHelper = `
  function pickText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim();
    }
    return '';
  }`;

// LinkedIn: job detail page or search results list
const LINKEDIN_BODY = `
  const SOURCE = 'linkedin';
  const offers = [];

  function normalizeUrl(href) {
    if (!href) return null;
    try {
      const url = new URL(href, location.origin);
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\\/$/, '');
    } catch { return null; }
  }

  const isJobPage = /\\/jobs\\/view\\//.test(location.pathname)
    || document.querySelector('.jobs-description, .jobs-description__content, #job-details');

  if (isJobPage) {
    const title = pickText(['h1.top-card-layout__title', '.jobs-unified-top-card h1', 'h1.t-24', 'h1']);
    const company = pickText([
      '.jobs-unified-top-card__company-name a',
      '.topcard__org-name-link',
      'a.topcard__org-name-link',
      '.jobs-unified-top-card__company-name',
    ]);
    const loc = pickText([
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
    ]);
    const description = pickText([
      '.jobs-description__content',
      '.jobs-description',
      '#job-details',
      '.jobs-box__html-content',
    ]);
    const rawText = [
      title ? 'Title: ' + title : '',
      company ? 'Company: ' + company : '',
      loc ? 'Location: ' + loc : '',
      '',
      description,
    ].join('\\n').trim();
    if (rawText) {
      offers.push({
        sourceUrl: normalizeUrl(location.href),
        rawText,
        source: SOURCE,
        collectedAt: new Date().toISOString(),
      });
    }
  } else {
    const seen = new Set();
    const linkSelectors = [
      '.jobs-search__results-list li .base-card__full-link',
      '.scaffold-layout__list li a[href*="/jobs/view/"]',
      'a.base-card__full-link[href*="/jobs/view/"]',
      'a[href*="/jobs/view/"]',
    ];
    for (const sel of linkSelectors) {
      document.querySelectorAll(sel).forEach((link) => {
        const href = link.getAttribute('href');
        const sourceUrl = normalizeUrl(href);
        if (!sourceUrl || seen.has(sourceUrl)) return;
        seen.add(sourceUrl);
        const card = link.closest('li, .job-card-container, .base-card') || link;
        const title = link.innerText?.trim() || pickText(['h3', 'h2'], card);
        const company = pickText(['h4', '.artdeco-entity-lockup__subtitle', '.base-search-card__subtitle'], card);
        const loc = pickText(['.job-search-card__location', '.artdeco-entity-lockup__caption'], card);
        const rawText = [
          title ? 'Title: ' + title : '',
          company ? 'Company: ' + company : '',
          loc ? 'Location: ' + loc : '',
          '',
          '(Open job page and re-run script for full description)',
        ].join('\\n').trim();
        offers.push({ sourceUrl, rawText, source: SOURCE, collectedAt: new Date().toISOString() });
      });
      if (offers.length) break;
    }
  }`;

// Indeed: job detail page or search results list
const INDEED_BODY = `
  const SOURCE = 'indeed';
  const offers = [];

  function normalizeUrl(href) {
    if (!href) return null;
    try {
      const url = new URL(href, location.origin);
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\\/$/, '');
    } catch { return null; }
  }

  const isJobPage = /\\/viewjob/.test(location.pathname + location.search)
    || document.querySelector('#jobDescriptionText, h1.jobsearch-JobInfoHeader-title');

  if (isJobPage) {
    const title = pickText([
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1',
    ]);
    const company = pickText([
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating a',
    ]);
    const loc = pickText([
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
    ]);
    const description = pickText(['#jobDescriptionText', '.jobsearch-JobComponent-description']);
    const rawText = [
      title ? 'Title: ' + title : '',
      company ? 'Company: ' + company : '',
      loc ? 'Location: ' + loc : '',
      '',
      description,
    ].join('\\n').trim();
    if (rawText) {
      offers.push({
        sourceUrl: normalizeUrl(location.href),
        rawText,
        source: SOURCE,
        collectedAt: new Date().toISOString(),
      });
    }
  } else {
    const seen = new Set();
    const linkSelectors = [
      '.jcs-JobTitle a',
      'a.jcs-JobTitle',
      '.jobsearch-ResultsList a[data-jk]',
      '#mosaic-provider-jobcards a[href*="/viewjob"]',
      'a[href*="/viewjob"]',
    ];
    for (const sel of linkSelectors) {
      document.querySelectorAll(sel).forEach((link) => {
        const href = link.getAttribute('href');
        const sourceUrl = normalizeUrl(href);
        if (!sourceUrl || seen.has(sourceUrl)) return;
        seen.add(sourceUrl);
        const card = link.closest('li, .job_seen_beacon, .cardOutline') || link;
        const title = link.innerText?.trim() || '';
        const company = pickText(['[data-testid="company-name"]', '.companyName', 'span[data-testid="company-name"]'], card);
        const loc = pickText(['[data-testid="text-location"]', '.companyLocation'], card);
        const rawText = [
          title ? 'Title: ' + title : '',
          company ? 'Company: ' + company : '',
          loc ? 'Location: ' + loc : '',
          '',
          '(Open job page and re-run script for full description)',
        ].join('\\n').trim();
        offers.push({ sourceUrl, rawText, source: SOURCE, collectedAt: new Date().toISOString() });
      });
      if (offers.length) break;
    }
  }`;

// Generic: any job page — best-effort selectors
const MANUAL_BODY = `
  const SOURCE = 'manual';
  const offers = [];

  const title = pickText([
    'h1',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '.jobs-unified-top-card h1',
    '.job-title',
  ]);
  const company = pickText([
    '[data-testid="inlineHeader-companyName"]',
    '.jobs-unified-top-card__company-name',
    '.company-name',
    '[data-company-name="true"]',
  ]);
  const loc = pickText([
    '[data-testid="job-location"]',
    '.jobs-unified-top-card__bullet',
    '.location',
  ]);
  const description = pickText([
    '#jobDescriptionText',
    '.jobs-description__content',
    '.jobs-description',
    '#job-details',
    'article',
    'main',
  ]);
  const rawText = [
    title ? 'Title: ' + title : '',
    company ? 'Company: ' + company : '',
    loc ? 'Location: ' + loc : '',
    '',
    description || document.body.innerText.slice(0, 8000),
  ].join('\\n').trim();

  if (rawText) {
    offers.push({
      sourceUrl: location.href.split('?')[0],
      rawText,
      source: SOURCE,
      collectedAt: new Date().toISOString(),
    });
  }`;

// Fix pickText in search result branches — card-scoped variant
const pickTextInCard = `
  function pickText(selectors, root) {
    const scope = root || document;
    for (const sel of selectors) {
      const el = scope.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim();
    }
    return '';
  }`;

function buildScript(body) {
  return [SCRIPT_HEADER, pickTextInCard, body, SCRIPT_FOOTER].join('\n');
}

const BROWSER_SCRIPTS = {
  linkedin: {
    label: 'LinkedIn',
    instructions: [
      'Open LinkedIn Jobs — either a search results page or a single job posting.',
      'Press F12 (or Cmd+Option+I) → Console tab.',
      'Paste the script below and press Enter.',
      'JSON is copied to your clipboard automatically.',
      'Paste the JSON here and click Import.',
    ],
    searchHint: 'On search results: extracts visible cards (open each job for full description).',
    detailHint: 'On a job page: extracts title, company, location, and full description.',
    script: buildScript(LINKEDIN_BODY),
  },
  indeed: {
    label: 'Indeed',
    instructions: [
      'Open Indeed — search results (e.g. de.indeed.com/jobs) or a job detail page.',
      'Press F12 → Console, paste the script, press Enter.',
      'Copy the JSON output if clipboard access is denied.',
      'Paste the JSON here and click Import.',
    ],
    searchHint: 'On search results: extracts visible job cards from the current page.',
    detailHint: 'On a viewjob page: extracts full job description.',
    script: buildScript(INDEED_BODY),
  },
  manual: {
    label: 'Any site',
    instructions: [
      'Open any job listing page in your browser.',
      'Press F12 → Console, paste the script, press Enter.',
      'Paste the JSON here and click Import.',
    ],
    searchHint: 'Works on any job page — uses common title/company/description selectors.',
    detailHint: null,
    script: buildScript(MANUAL_BODY),
  },
};

// Return browser script metadata for a collector name
export function getBrowserScript(name) {
  return BROWSER_SCRIPTS[name] ?? null;
}

// Return all browser scripts keyed by collector name
export function getAllBrowserScripts() {
  return BROWSER_SCRIPTS;
}

// Normalize and validate offers pasted from a browser script
export function normalizeImportedOffers(source, rawOffers) {
  if (!Array.isArray(rawOffers) || rawOffers.length === 0) {
    const err = new Error('offers must be a non-empty array');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const normalized = [];

  for (const entry of rawOffers) {
    if (!entry || typeof entry !== 'object') continue;

    const rawText = typeof entry.rawText === 'string' ? entry.rawText.trim() : '';
    if (!rawText) continue;

    const sourceUrl =
      typeof entry.sourceUrl === 'string' && entry.sourceUrl.trim()
        ? entry.sourceUrl.trim()
        : null;

    normalized.push({
      sourceUrl,
      rawText,
      source: entry.source ?? source,
      collectedAt: entry.collectedAt ?? new Date().toISOString(),
    });
  }

  if (normalized.length === 0) {
    const err = new Error('No valid offers found — each entry needs a non-empty rawText');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  return normalized;
}
