import * as cheerio from 'cheerio';
import { cleanHtml } from './base.js';

const RSS_URL = 'https://germantechjobs.de/rss';
const SOURCE = 'germantechjobs';
// Board is DE-only; RSS bodies rarely contain the word "Germany"
const DE_LOCATION_ALIASES = new Set(['germany', 'deutschland', 'de']);

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

// Strip tracking params so the same listing dedupes cleanly
function normalizeJobUrl(href) {
  if (!href) return null;

  try {
    const url = new URL(href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_')) url.searchParams.delete(key);
    }
    url.hash = '';
    let out = url.toString();
    if (out.endsWith('?')) out = out.slice(0, -1);
    return out.replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Parse "Role @ Company [salary]" titles used by the RSS feed
function parseRssTitle(rawTitle) {
  const title = String(rawTitle ?? '').trim();
  const match = title.match(/^(.+?)\s+@\s+(.+?)(?:\s*\[([^\]]+)\])?\s*$/);
  if (!match) {
    return { title, company: '', salary: '' };
  }

  return {
    title: match[1].trim(),
    company: match[2].trim(),
    salary: (match[3] ?? '').trim(),
  };
}

// Fetch and parse GermanTechJobs RSS items into plain records
async function fetchRssItems() {
  const response = await fetch(RSS_URL, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
  });

  if (!response.ok) {
    const err = new Error(`Failed to fetch RSS (${response.status}): ${RSS_URL}`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  const xml = await response.text();
  const $ = cheerio.load(xml, { xml: true });
  const items = [];

  $('channel > item').each((_i, el) => {
    const node = $(el);
    const rawTitle = node.find('title').first().text().trim();
    const link = node.find('link').first().text().trim();
    const sourceUrl = normalizeJobUrl(link);
    if (!sourceUrl || !rawTitle) return;

    const descriptionHtml =
      node.find('content\\:encoded').html() ||
      node.find('encoded').html() ||
      node.find('description').html() ||
      '';
    const body = cleanHtml(descriptionHtml);
    const { title, company, salary } = parseRssTitle(rawTitle);

    items.push({
      sourceUrl,
      title,
      company,
      salary,
      body,
      haystack: `${rawTitle}\n${body}`.toLowerCase(),
    });
  });

  return items;
}

// True when the item matches the query (and optional city/remote keyword)
function matchesFilters(item, query, location) {
  const q = query.toLowerCase();
  if (!item.haystack.includes(q)) return false;

  if (location) {
    const loc = location.toLowerCase();
    // Country aliases always match — every listing is already in Germany
    if (!DE_LOCATION_ALIASES.has(loc) && !item.haystack.includes(loc)) return false;
  }

  return true;
}

// Build a RawOffer record for the pipeline
function toOffer(item, queryMatched) {
  const rawText = [
    item.title ? `Title: ${item.title}` : '',
    item.company ? `Company: ${item.company}` : '',
    'Location: Germany',
    item.salary ? `Salary: ${item.salary}` : '',
    '',
    item.body,
  ]
    .join('\n')
    .trim();

  return {
    sourceUrl: item.sourceUrl,
    rawText,
    source: SOURCE,
    collectedAt: new Date().toISOString(),
    queryMatched,
    title: item.title || null,
    company: item.company || null,
    location: 'Germany',
    countryCode: 'DE',
    salary: item.salary || null,
  };
}

const collector = {
  name: SOURCE,
  label: 'GermanTechJobs',
  configSchema: {
    queries: {
      type: 'array',
      description:
        'Keywords for roles you want (matched → LLM parse). Non-matches are skipped.',
    },
    location: {
      type: 'string',
      description:
        'Optional city/remote keyword (e.g. "Berlin"). "Germany" is ignored — board is DE-only.',
    },
    maxResults: {
      type: 'number',
      default: 10,
      description: 'Max matched listings to LLM-parse per run (extra matches stored as raw)',
    },
  },

  // Return the full RSS feed; mark query matches vs the rest
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

    console.log(`[INFO] [${SOURCE}] Fetching RSS feed`);
    const items = await fetchRssItems();
    console.log(`[INFO] [${SOURCE}] Feed has ${items.length} items`);

    const matched = [];
    const unmatched = [];

    for (const item of items) {
      const isMatch = queries.some((query) => matchesFilters(item, query, location));
      if (isMatch) matched.push(item);
      else unmatched.push(item);
    }

    const toParse = matched.slice(0, maxResults).map((item) => toOffer(item, true));
    const matchedRest = matched.slice(maxResults).map((item) => ({
      ...toOffer(item, true),
      skipParse: true,
    }));
    const offQuery = unmatched.map((item) => toOffer(item, false));

    const offers = [...toParse, ...matchedRest, ...offQuery];
    console.log(
      `[INFO] [${SOURCE}] Collection finished: parse=${toParse.length}, matched-raw=${matchedRest.length}, unmatched=${offQuery.length}`,
    );
    return offers;
  },
};

export default collector;

// Self-check: bun collectors/germantechjobs.js
if (import.meta.main) {
  const offers = await collector.run({ queries: ['zzznomatchxyz'], maxResults: 2 });
  const unmatched = offers.filter((o) => o.queryMatched === false);
  const matched = offers.filter((o) => o.queryMatched === true);
  if (!unmatched.length) throw new Error('expected unmatched offers for nonsense query');
  if (matched.length) throw new Error('expected zero matches for nonsense query');
  if (unmatched.some((o) => !o.title)) throw new Error('unmatched offers need title');

  const mixed = await collector.run({ queries: ['developer'], maxResults: 2 });
  const yes = mixed.filter((o) => o.queryMatched === true);
  const no = mixed.filter((o) => o.queryMatched === false);
  if (yes.length < 1) throw new Error('expected some developer matches');
  if (no.length < 1) throw new Error('expected unmatched alongside matches');
  if (yes.filter((o) => !o.skipParse).length > 2) {
    throw new Error('maxResults should cap LLM-parse candidates');
  }

  // "Germany" must not zero out matches — RSS rarely contains that word
  const withCountry = await collector.run({
    queries: ['javascript'],
    location: 'Germany',
    maxResults: 2,
  });
  const jsMatched = withCountry.filter((o) => o.queryMatched === true);
  if (jsMatched.length < 1) {
    throw new Error('location=Germany should not filter out javascript matches on DE-only board');
  }

  console.log(
    `ok: nonsense→${unmatched.length} unmatched; developer→${yes.length} matched + ${no.length} unmatched; js+Germany→${jsMatched.length} matched`,
  );
}
