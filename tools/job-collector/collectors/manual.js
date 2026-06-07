import * as cheerio from 'cheerio';
import { cleanHtml } from './base.js';

// Build a RawOffer record for the manual collector
function makeRawOffer({ sourceUrl, rawText }) {
  return {
    sourceUrl,
    rawText,
    source: 'manual',
    collectedAt: new Date().toISOString(),
  };
}

// Fetch a job listing URL and extract plain text from the HTML body
async function fetchUrlText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const err = new Error(`Failed to fetch URL (${response.status}): ${url}`);
    err.code = 'FETCH_ERROR';
    throw err;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const bodyHtml = $('body').html() ?? $('body').text();

  return cleanHtml(bodyHtml);
}

export default {
  name: 'manual',
  label: 'Manual',
  configSchema: {
    text: { type: 'string', description: 'Raw pasted job listing text' },
    url: { type: 'string', description: 'Direct URL to job listing page' },
  },

  // Collect one job from pasted text or a direct listing URL
  async run(config = {}) {
    const text = typeof config.text === 'string' ? config.text.trim() : '';
    const url = typeof config.url === 'string' ? config.url.trim() : '';

    if (!text && !url) {
      const err = new Error('Either text or url must be provided');
      err.code = 'INVALID_CONFIG';
      throw err;
    }

    console.log('[INFO] [manual] Starting manual collection');

    if (text) {
      const offer = makeRawOffer({
        sourceUrl: url || null,
        rawText: text,
      });
      console.log('[INFO] [manual] Collection finished, jobs found: 1');
      return [offer];
    }

    const rawText = await fetchUrlText(url);
    const offer = makeRawOffer({ sourceUrl: url, rawText });
    console.log('[INFO] [manual] Collection finished, jobs found: 1');
    return [offer];
  },
};
