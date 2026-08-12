import {
  fetchApplyPage,
  fetchApplyPageHtml,
  looksUsable,
  MAX_HTML_CHARS,
  trimHtml,
} from './pageFetcher.js';

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ok  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    failures += 1;
  }
}

async function main() {
  console.log('[self-check] pageFetcher.js');

  const form = `<form id="application">${'<label>Name</label><input name="name">'.repeat(40)}<textarea name="note"></textarea></form>`;
  const noisyHtml = `<html><body><!-- comment --><script>alert(1)</script><style>.x{}</style><svg><path /></svg>${form}</body></html>`;
  const trimmed = trimHtml(noisyHtml);

  assert(trimmed.includes('<form id="application">'), 'keeps the substantial form subtree');
  assert(!/<script|<style|<svg|<!--/.test(trimmed), 'strips scripts, styles, SVGs, and comments');
  assert(looksUsable(trimmed), 'recognizes pages with enough form controls');
  assert(!looksUsable('<main><input name="only-one"></main>'), 'rejects CSR-like shells');
  assert(trimHtml(`<body>${'x'.repeat(MAX_HTML_CHARS + 1)}</body>`).length === MAX_HTML_CHARS, 'caps trimmed HTML');

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(noisyHtml, { status: 200 });
    const success = await fetchApplyPage('https://example.test/apply');
    assert(success.status === 'ok' && success.html === trimmed, 'returns usable HTML with ok status');
    assert(await fetchApplyPageHtml('https://example.test/apply') === trimmed, 'simple helper returns HTML only');

    globalThis.fetch = async () => new Response('blocked', { status: 401 });
    const httpError = await fetchApplyPage('https://example.test/login');
    assert(httpError.status === 'http-error' && httpError.html === null, 'maps non-OK responses to http-error');

    globalThis.fetch = async () => new Response('<main><input name="only-one"></main>', { status: 200 });
    const unusable = await fetchApplyPage('https://example.test/csr-shell');
    assert(unusable.status === 'unusable' && unusable.html === null, 'maps CSR-like shells to unusable fallback');

    globalThis.fetch = async () => {
      const error = new Error('timed out');
      error.name = 'AbortError';
      throw error;
    };
    const timeout = await fetchApplyPage('https://example.test/slow');
    assert(timeout.status === 'timeout' && timeout.html === null, 'maps aborted requests to timeout');
  } finally {
    globalThis.fetch = originalFetch;
  }

  if (failures > 0) {
    throw new Error(`${failures} check(s) failed`);
  }

  console.log('OK');
}

main().catch((error) => {
  console.error('self-check crashed:', error);
  process.exit(1);
});
