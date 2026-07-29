// Self-check for server/db.js markApplied idempotency
// Run: cd tools/job-collector && bun run server/db.self-check.js
// Asserts:
//   1. markApplied sets applied_at on a fresh job
//   2. markApplied is idempotent — second call does not change applied_at
//   3. Cleanup: throwaway row deleted
// Exits 0 on success, 1 on failure. No test framework.
import { insertJob, getJobById, markApplied, deleteJob } from './db.js';

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
  console.log('[self-check] db.js markApplied');

  const sourceUrl = `selfcheck-applied-${Date.now()}`;
  const id = insertJob({
    source: 'selfcheck',
    sourceUrl,
    rawText: 'selfcheck throwaway job',
    title: 'Selfcheck Job',
    company: 'Selfcheck Co',
  });
  if (!id) {
    console.error('  FAIL  insertJob returned null (dedup collision?)');
    process.exit(1);
  }

  try {
    // 1. First markApplied sets applied_at
    const first = markApplied(id, { appliedUrl: 'https://example.com/apply' });
    assert(first !== null, 'markApplied returns job row');
    assert(first.appliedAt !== null && first.appliedAt !== '', `applied_at set ("${first.appliedAt}")`);
    assert(first.appliedUrl === 'https://example.com/apply', 'applied_url stored');

    const firstAppliedAt = first.appliedAt;

    // 2. Second call is idempotent — applied_at unchanged
    const second = markApplied(id, { appliedUrl: 'https://different.com' });
    assert(second !== null, 'second markApplied returns job row');
    assert(
      second.appliedAt === firstAppliedAt,
      `idempotent: applied_at unchanged on second call ("${second.appliedAt}")`,
    );
    assert(
      second.appliedUrl === 'https://example.com/apply',
      'idempotent: applied_url not overwritten by second call',
    );
  } finally {
    // 3. Cleanup
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
