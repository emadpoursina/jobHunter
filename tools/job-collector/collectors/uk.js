import hiringCafe from './hiringcafe.js';

// United Kingdom preset collector — same engine as HiringCafe, pinned to the UK
// so offers always route to phase2/offers/by-country/gb/.
const SOURCE = 'uk';
const LOCATION = 'United Kingdom';
const COUNTRY_CODE = 'GB';

function normalizeQueries(config = {}) {
  if (Array.isArray(config.queries)) {
    return config.queries.map((q) => String(q).trim()).filter(Boolean);
  }
  if (typeof config.query === 'string' && config.query.trim()) {
    return [config.query.trim()];
  }
  return [];
}

const collector = {
  name: SOURCE,
  label: 'United Kingdom (HiringCafe)',
  configSchema: {
    queries: {
      type: 'array',
      description: 'Keywords for backend / full-stack roles in the United Kingdom',
    },
    maxResults: {
      type: 'number',
      default: 10,
      description: 'Max listings to LLM-parse per query',
    },
  },

  async run(config = {}) {
    const queries = normalizeQueries(config);
    if (queries.length === 0) {
      const err = new Error('At least one query must be provided in config.queries');
      err.code = 'INVALID_CONFIG';
      throw err;
    }
    const offers = await hiringCafe.run({ ...config, location: LOCATION });
    return offers.map((offer) => ({ ...offer, countryCode: COUNTRY_CODE }));
  },
};

export default collector;

// Self-check (no network): bun collectors/uk.js
if (import.meta.main) {
  if (!collector.configSchema.queries || !collector.configSchema.maxResults) {
    throw new Error('uk preset missing configSchema');
  }
  console.log(`ok: uk preset ready (location=United Kingdom, countryCode=${COUNTRY_CODE})`);
}
