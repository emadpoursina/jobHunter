// Pause for a given number of milliseconds
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strip HTML tags and collapse whitespace into a single plain-text string
export function cleanHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Turn a string into a lowercase hyphenated slug segment
function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Build an offer filename slug from company, title, and collection date
export function makeSlug(company, title, date) {
  const when = date instanceof Date ? date : new Date(date);
  const year = when.getFullYear();
  const month = String(when.getMonth() + 1).padStart(2, '0');
  const parts = [slugify(company), slugify(title), `${year}-${month}`].filter(Boolean);

  return parts.join('-') || 'unknown-offer';
}

const COUNTRY_ALIASES = {
  germany: 'DE',
  deutschland: 'DE',
  netherlands: 'NL',
  holland: 'NL',
  'the netherlands': 'NL',
  austria: 'AT',
  österreich: 'AT',
  switzerland: 'CH',
  schweiz: 'CH',
  belgium: 'BE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  portugal: 'PT',
  poland: 'PL',
  czechia: 'CZ',
  'czech republic': 'CZ',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  ireland: 'IE',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'united states': 'US',
  usa: 'US',
  canada: 'CA',
  australia: 'AU',
  'united arab emirates': 'AE',
  uae: 'AE',
  dubai: 'AE',
};

const CITY_COUNTRY = {
  berlin: 'DE',
  munich: 'DE',
  münchen: 'DE',
  hamburg: 'DE',
  frankfurt: 'DE',
  cologne: 'DE',
  köln: 'DE',
  amsterdam: 'NL',
  rotterdam: 'NL',
  utrecht: 'NL',
  vienna: 'AT',
  wien: 'AT',
  zurich: 'CH',
  zürich: 'CH',
  geneva: 'CH',
  brussels: 'BE',
  bruxelles: 'BE',
  paris: 'FR',
  lyon: 'FR',
  madrid: 'ES',
  barcelona: 'ES',
  rome: 'IT',
  milan: 'IT',
  milano: 'IT',
  lisbon: 'PT',
  warsaw: 'PL',
  krakow: 'PL',
  prague: 'CZ',
  stockholm: 'SE',
  oslo: 'NO',
  copenhagen: 'DK',
  helsinki: 'FI',
  dublin: 'IE',
  london: 'GB',
  manchester: 'GB',
  edinburgh: 'GB',
  'new york': 'US',
  'san francisco': 'US',
  toronto: 'CA',
  sydney: 'AU',
  melbourne: 'AU',
};

// Derive an ISO 3166-1 alpha-2 country code from a free-text location
export function inferCountryCode(location) {
  if (!location || typeof location !== 'string') return 'XX';

  const normalized = location.trim().toLowerCase();
  if (!normalized) return 'XX';

  const isoMatch = normalized.match(/\b([a-z]{2})\b/gi);
  if (isoMatch) {
    const candidate = isoMatch[isoMatch.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(candidate)) {
      return candidate === 'UK' ? 'GB' : candidate;
    }
  }

  const segments = normalized.split(/[,/|]/).map((part) => part.trim()).filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const code = lookupLocationSegment(segments[i]);
    if (code) return code;
  }

  return lookupLocationSegment(normalized) ?? 'XX';
}

// Match one location segment against known country and city aliases
function lookupLocationSegment(segment) {
  if (COUNTRY_ALIASES[segment]) return COUNTRY_ALIASES[segment];

  for (const [name, code] of Object.entries(COUNTRY_ALIASES)) {
    if (segment.includes(name)) return code;
  }

  if (CITY_COUNTRY[segment]) return CITY_COUNTRY[segment];

  for (const [city, code] of Object.entries(CITY_COUNTRY)) {
    if (segment.includes(city)) return code;
  }

  return null;
}
