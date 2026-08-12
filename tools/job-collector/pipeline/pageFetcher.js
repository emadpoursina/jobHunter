const MAX_HTML_CHARS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; ApplyBot/1.0)';

function stripNoise(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function trimHtml(html) {
  if (typeof html !== 'string') return '';

  const cleaned = stripNoise(html);
  const formMatch = cleaned.match(/<form\b[\s\S]*?<\/form>/i);
  const form = formMatch?.[0];
  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1];
  const content = form && form.length >= 500 ? form : body || cleaned;

  return content.slice(0, MAX_HTML_CHARS);
}

export function looksUsable(html) {
  if (typeof html !== 'string' || html.length === 0) return false;

  const inputCount = (html.match(/<input\b/gi) || []).length;
  const textareaCount = (html.match(/<textarea\b/gi) || []).length;
  return inputCount + textareaCount >= 2;
}

export async function fetchApplyPage(url) {
  let controller;
  let timeout;

  try {
    new URL(url);
    controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      return { html: null, status: 'http-error' };
    }

    const html = trimHtml(await response.text());
    if (!looksUsable(html)) {
      return { html: null, status: 'unusable' };
    }

    return { html, status: 'ok' };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { html: null, status: 'timeout' };
    }

    return { html: null, status: 'network-error' };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchApplyPageHtml(url) {
  return (await fetchApplyPage(url)).html;
}

export {
  FETCH_TIMEOUT_MS,
  MAX_HTML_CHARS,
  USER_AGENT,
};
