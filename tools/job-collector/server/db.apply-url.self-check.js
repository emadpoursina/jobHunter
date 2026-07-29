// Self-check for apply_url column + updateJob round-trip
// Run: cd tools/job-collector && bun run server/db.apply-url.self-check.js
import { insertJob, getJobById, updateJob, deleteJob } from './db.js';
import { normalizeApplyUrl } from './routes/jobs.js';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

function main() {
  console.log('[self-check] db.js apply_url');

  const sourceUrl = `selfcheck-apply-url-${Date.now()}`;
  const id = insertJob({
    source: 'selfcheck',
    sourceUrl,
    rawText: 'selfcheck throwaway job',
    title: 'Selfcheck Job',
    company: 'Selfcheck Co',
  });
  if (!id) {
    console.error('  FAIL  insertJob returned null');
    process.exit(1);
  }

  try {
    const fresh = getJobById(id);
    assert(fresh.applyUrl == null, 'applyUrl null on new job');

    const updated = updateJob(id, {
      applyUrl: 'https://careers.example.com/jobs/123',
    });
    assert(
      updated.applyUrl === 'https://careers.example.com/jobs/123',
      'applyUrl round-trip via updateJob',
    );

    const cleared = updateJob(id, { applyUrl: null });
    assert(cleared.applyUrl == null, 'applyUrl cleared to null');

    const emptyNorm = normalizeApplyUrl('   ');
    assert(emptyNorm === null, 'normalizeApplyUrl: whitespace → null');

    const bad = normalizeApplyUrl('not-a-url');
    assert(bad?.error != null, 'normalizeApplyUrl: invalid URL rejected');

    const good = normalizeApplyUrl('https://example.com/apply');
    assert(good === 'https://example.com/apply', 'normalizeApplyUrl: valid https URL');
  } finally {
    const deleted = deleteJob(id);
    assert(deleted, 'throwaway job cleaned up');
  }

  if (failures === 0) {
    console.log('OK');
    process.exit(0);
  } else {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
}

main();
