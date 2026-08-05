import { inferCountryCode, sleep } from './base.js';

const BASE_URL = 'https://hiringcafe.com';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SOURCE = 'hiringcafe';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const PAGE_DELAY_MS = 1000;
const MAX_PAGES = 5;

// Cache geocoded locations for the process lifetime (one Nominatim call per place name)
const locationCache = new Map();

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

// Shared browser-like headers for HiringCafe edge requests
function headers(extra = {}) {
  return {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${BASE_URL}/`,
    ...extra,
  };
}

// Pull the rotating Next.js buildId from the homepage __NEXT_DATA__ blob
async function fetchBuildId() {
  const response = await fetch(`${BASE_URL}/`, { headers: headers({ Accept: 'text/html' }) });
  if (!response.ok) {
    const err = new Error(`Failed to fetch HiringCafe homepage (${response.status})`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match) {
    const err = new Error('HiringCafe homepage missing __NEXT_DATA__ (bot challenge?)');
    err.code = 'FETCH_ERROR';
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(match[1]);
  } catch (cause) {
    const err = new Error('Failed to parse HiringCafe __NEXT_DATA__');
    err.code = 'FETCH_ERROR';
    err.cause = cause;
    throw err;
  }

  if (!payload.buildId) {
    const err = new Error('HiringCafe __NEXT_DATA__ missing buildId');
    err.code = 'FETCH_ERROR';
    throw err;
  }

  return payload.buildId;
}

// Resolve a place name into HiringCafe's locations[] object via OpenStreetMap Nominatim
async function geocodeLocation(name) {
  const key = name.toLowerCase();
  if (locationCache.has(key)) return locationCache.get(key);

  const params = new URLSearchParams({
    q: name,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    'accept-language': 'en',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'jobHunter-hiringcafe/1.0' },
  });

  if (!response.ok) {
    const err = new Error(`Geocoding failed (${response.status}) for location "${name}"`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    const err = new Error(
      `Could not geocode location "${name}". Try a simpler name, e.g. "Germany" or "Berlin".`,
    );
    err.code = 'INVALID_CONFIG';
    throw err;
  }

  const result = results[0];
  const address = result.address ?? {};
  const addressType = result.addresstype ?? '';

  const country = address.country ?? '';
  const countryCode = String(address.country_code ?? '').toUpperCase();
  const state = address.state ?? '';
  const stateCode = (address['ISO3166-2-lvl4'] || '').split('-').pop() || state;
  const city = address.city || address.town || address.village || '';

  const components = [];
  const formattedParts = [];
  let types;

  if (addressType === 'country') {
    types = ['country'];
  } else if (addressType === 'state' || addressType === 'province' || addressType === 'region') {
    types = ['administrative_area_level_1'];
    components.push({
      long_name: state || name,
      short_name: stateCode || name,
      types: ['administrative_area_level_1'],
    });
    formattedParts.push(state || name);
  } else {
    types = ['locality'];
    const locality = city || name;
    components.push({ long_name: locality, short_name: locality, types: ['locality'] });
    formattedParts.push(locality);
    if (state) {
      components.push({
        long_name: state,
        short_name: stateCode,
        types: ['administrative_area_level_1'],
      });
      formattedParts.push(stateCode || state);
    }
  }

  if (country) {
    components.push({ long_name: country, short_name: countryCode, types: ['country'] });
    formattedParts.push(country);
  }

  const location = {
    formatted_address: formattedParts.join(', ') || name,
    types,
    id: 'user_defined',
    address_components: components,
    options:
      types[0] === 'country'
        ? { flexible_regions: ['anywhere_in_continent', 'anywhere_in_world'] }
        : {},
  };

  const lat = result.lat != null ? Number(result.lat) : null;
  const lon = result.lon != null ? Number(result.lon) : null;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    location.geometry = { location: { lat, lon } };
  }

  console.log(`[INFO] [${SOURCE}] Geocoded "${name}" → ${location.formatted_address} (${types[0]})`);
  locationCache.set(key, location);
  return location;
}

// Build the searchState object HiringCafe's data route expects
async function buildSearchState(query, locationName) {
  const searchState = {
    searchQuery: query,
    sortBy: 'date',
    dateFetchedPastNDays: 30,
    workplaceTypes: ['Remote', 'Hybrid', 'Onsite'],
  };

  if (locationName) {
    searchState.locations = [await geocodeLocation(locationName)];
  }

  return searchState;
}

// Fetch one page of SSR search hits via the Next.js data route
async function searchPage(buildId, searchState, page) {
  const params = new URLSearchParams({
    searchState: JSON.stringify(searchState),
    page: String(page),
  });
  const url = `${BASE_URL}/_next/data/${buildId}/index.json?${params}`;

  const response = await fetch(url, {
    headers: headers({ 'x-nextjs-data': '1' }),
  });

  if (response.status === 404) {
    return { staleBuildId: true };
  }

  if (!response.ok) {
    const err = new Error(`HiringCafe search failed (${response.status}) page=${page}`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  const payload = await response.json();
  const pageProps = payload.pageProps;
  if (!pageProps) {
    const err = new Error(`HiringCafe search page ${page} missing pageProps`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  return {
    hits: pageProps.ssrHits ?? [],
    isLastPage: Boolean(pageProps.ssrIsLastPage),
    totalCount: pageProps.ssrTotalCount ?? 0,
    ssrError: pageProps.ssrError ?? null,
  };
}

// Format compensation from HiringCafe's yearly/hourly fields when present
function formatSalary(v5 = {}) {
  const yearlyMin = v5.yearly_min_compensation;
  const yearlyMax = v5.yearly_max_compensation;
  if (yearlyMin || yearlyMax) {
    if (yearlyMin && yearlyMax) return `$${yearlyMin}/yr – $${yearlyMax}/yr`;
    if (yearlyMin) return `from $${yearlyMin}/yr`;
    return `up to $${yearlyMax}/yr`;
  }

  const hourlyMin = v5.hourly_min_compensation;
  const hourlyMax = v5.hourly_max_compensation;
  if (hourlyMin || hourlyMax) {
    if (hourlyMin && hourlyMax) return `$${hourlyMin}/hr – $${hourlyMax}/hr`;
    if (hourlyMin) return `from $${hourlyMin}/hr`;
    return `up to $${hourlyMax}/hr`;
  }

  return '';
}

// Stable HiringCafe URL for dedup ( /req/{objectID} mirrors /job/ )
function sourceUrlForHit(hit) {
  const objectId = hit.objectID || hit.id;
  if (objectId) return `${BASE_URL}/req/${encodeURIComponent(objectId)}`;

  const applyUrl = typeof hit.apply_url === 'string' ? hit.apply_url.trim() : '';
  if (!applyUrl) return null;

  try {
    const url = new URL(applyUrl);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return applyUrl;
  }
}

// Turn one HiringCafe search hit into a RawOffer for the pipeline
function toOffer(hit, queryMatched) {
  const v5 = hit.v5_processed_job_data ?? {};
  const info = hit.job_information ?? {};
  const companyData = hit.enriched_company_data ?? {};

  const title = info.title || info.job_title_raw || v5.core_job_title || '';
  const company = companyData.name || v5.company_name || '';
  const location =
    v5.formatted_workplace_location ||
    (Array.isArray(v5.workplace_cities) && v5.workplace_cities[0]) ||
    '';
  const workplaceType = v5.workplace_type || '';
  const commitment = Array.isArray(v5.commitment) ? v5.commitment.join(', ') : '';
  const seniority = v5.seniority_level || '';
  const salary = formatSalary(v5);
  const tools = Array.isArray(v5.technical_tools) ? v5.technical_tools.join(', ') : '';
  const activities = Array.isArray(v5.role_activities) ? v5.role_activities.join(', ') : '';
  const summary = v5.requirements_summary || '';
  const applyUrl = typeof hit.apply_url === 'string' ? hit.apply_url.trim() : '';
  const countryCode =
    (typeof companyData.hq_country === 'string' && companyData.hq_country.length === 2
      ? companyData.hq_country.toUpperCase()
      : null) || inferCountryCode(location);

  const rawText = [
    title ? `Title: ${title}` : '',
    company ? `Company: ${company}` : '',
    location ? `Location: ${location}` : '',
    workplaceType ? `Workplace: ${workplaceType}` : '',
    commitment ? `Commitment: ${commitment}` : '',
    seniority ? `Seniority: ${seniority}` : '',
    salary ? `Salary: ${salary}` : '',
    tools ? `Tech: ${tools}` : '',
    activities ? `Activities: ${activities}` : '',
    applyUrl ? `Apply: ${applyUrl}` : '',
    '',
    summary,
  ]
    .join('\n')
    .trim();

  return {
    sourceUrl: sourceUrlForHit(hit),
    rawText,
    source: SOURCE,
    collectedAt: new Date().toISOString(),
    queryMatched,
    title: title || null,
    company: company || null,
    location: location || null,
    countryCode,
    salary: salary || null,
  };
}

// Paginate HiringCafe search results for one query up to maxResults
async function collectForQuery(buildIdRef, query, locationName, maxResults) {
  const searchState = await buildSearchState(query, locationName);
  const offers = [];
  const seen = new Set();

  for (let page = 0; page < MAX_PAGES && offers.length < maxResults; page += 1) {
    if (page > 0) await sleep(PAGE_DELAY_MS);

    let result = await searchPage(buildIdRef.id, searchState, page);
    if (result.staleBuildId) {
      console.warn(`[WARN] [${SOURCE}] buildId stale, refreshing`);
      buildIdRef.id = await fetchBuildId();
      result = await searchPage(buildIdRef.id, searchState, page);
      if (result.staleBuildId) {
        const err = new Error('HiringCafe buildId still stale after refresh');
        err.code = 'FETCH_ERROR';
        throw err;
      }
    }

    if (result.ssrError) {
      console.warn(`[WARN] [${SOURCE}] ssrError on page ${page}: ${result.ssrError}`);
    }

    if (page === 0) {
      const where = locationName ? ` location="${locationName}"` : '';
      console.log(
        `[INFO] [${SOURCE}] query="${query}"${where} total=${result.totalCount} (fetching up to ${maxResults})`,
      );
    }

    for (const hit of result.hits) {
      if (offers.length >= maxResults) break;
      const url = sourceUrlForHit(hit);
      if (url && seen.has(url)) continue;
      if (url) seen.add(url);
      offers.push(toOffer(hit, true));
    }

    if (result.isLastPage || result.hits.length === 0) break;
  }

  return offers;
}

const collector = {
  name: SOURCE,
  label: 'HiringCafe',
  configSchema: {
    queries: {
      type: 'array',
      description: 'Keywords for roles to search on hiringcafe.com',
    },
    location: {
      type: 'string',
      description: 'Optional place filter (geocoded), e.g. "Germany" or "Berlin"',
    },
    maxResults: {
      type: 'number',
      default: 10,
      description: 'Max listings to LLM-parse per query',
    },
  },

  // Search HiringCafe via its Next.js SSR data route
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

    console.log(`[INFO] [${SOURCE}] Bootstrapping buildId`);
    const buildIdRef = { id: await fetchBuildId() };
    console.log(`[INFO] [${SOURCE}] buildId=${buildIdRef.id}`);

    const offers = [];
    const seen = new Set();

    for (const query of queries) {
      const batch = await collectForQuery(buildIdRef, query, location, maxResults);
      for (const offer of batch) {
        if (offer.sourceUrl && seen.has(offer.sourceUrl)) continue;
        if (offer.sourceUrl) seen.add(offer.sourceUrl);
        offers.push(offer);
      }
    }

    console.log(`[INFO] [${SOURCE}] Collection finished: ${offers.length} offers`);
    return offers;
  },
};

export default collector;

// Self-check: bun collectors/hiringcafe.js
if (import.meta.main) {
  // Keyword-append used to return 0 for "javascript" + "Germany"; geo filter must not.
  const offers = await collector.run({
    queries: ['javascript'],
    location: 'Germany',
    maxResults: 3,
  });
  if (!offers.length) throw new Error('expected at least one HiringCafe offer for javascript+Germany');
  if (offers.length > 3) throw new Error('maxResults should cap offers per query');
  if (offers.some((o) => !o.rawText || !o.sourceUrl)) {
    throw new Error('offers need rawText and sourceUrl');
  }
  if (offers.some((o) => o.source !== SOURCE)) throw new Error('source must be hiringcafe');
  if (offers.some((o) => o.queryMatched !== true)) throw new Error('search hits should be matched');

  const state = await buildSearchState('javascript', 'Germany');
  if (state.searchQuery !== 'javascript') throw new Error('searchQuery must stay keyword-only');
  if (!state.locations?.[0]?.address_components?.some((c) => c.short_name === 'DE')) {
    throw new Error('Germany must geocode to DE country component');
  }

  console.log(
    `ok: ${offers.length} offers; sample="${offers[0].title}" @ ${offers[0].company} (${offers[0].location})`,
  );
}
