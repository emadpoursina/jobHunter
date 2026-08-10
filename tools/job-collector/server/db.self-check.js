// Self-check for server/db.js applied_at + application_stage migration
// Run: cd tools/job-collector && bun run server/db.self-check.js
// Asserts:
//   1. markApplied sets applied_at + status=applied
//   2. markApplied is idempotent — second call does not change applied_at
//   3. updateJob({ status: 'applied' }) stamps applied_at (UI "Mark applied" path)
//   4. application_stage column exists; migrate() is idempotent
//   5. status=applied → application_stage=sent + pipeline status fallback
//   6. status=rejected → application_stage=rejected + pipeline status fallback
//   7. Cleanup: throwaway rows deleted
// Exits 0 on success, 1 on failure. No test framework.
import {
  insertJob,
  getJobById,
  markApplied,
  updateJob,
  deleteJob,
  migrate,
  migrateApplicationStages,
  APPLICATION_STAGES,
} from './db.js';
import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'jobs.db');

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
  console.log('[self-check] db.js applied_at + application_stage');

  assert(
    APPLICATION_STAGES.includes('not_started') &&
      APPLICATION_STAGES.includes('sent') &&
      APPLICATION_STAGES.length === 9,
    `APPLICATION_STAGES documents 9 funnel values (${APPLICATION_STAGES.length})`,
  );

  const cols = new Database(DB_PATH).prepare('PRAGMA table_info(jobs)').all();
  assert(
    cols.some((c) => c.name === 'application_stage'),
    'jobs.application_stage column exists',
  );
  migrate();
  migrate();
  assert(true, 'migrate() re-run is idempotent (no throw)');

  const ids = [];

  try {
    // --- markApplied path ---
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
    ids.push(id);

    const inserted = getJobById(id);
    assert(
      inserted.applicationStage === 'not_started',
      `new job defaults application_stage=not_started ("${inserted.applicationStage}")`,
    );

    const first = markApplied(id, { appliedUrl: 'https://example.com/apply' });
    assert(first !== null, 'markApplied returns job row');
    assert(first.status === 'applied', `markApplied sets status=applied ("${first.status}")`);
    assert(first.appliedAt !== null && first.appliedAt !== '', `applied_at set ("${first.appliedAt}")`);
    assert(first.appliedUrl === 'https://example.com/apply', 'applied_url stored');

    const firstAppliedAt = first.appliedAt;

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

    // --- updateJob status=applied path (UI "Mark applied" / bulk) ---
    const sourceUrl2 = `selfcheck-status-applied-${Date.now()}`;
    const id2 = insertJob({
      source: 'selfcheck',
      sourceUrl: sourceUrl2,
      rawText: 'selfcheck status-applied job',
      title: 'Selfcheck Status Job',
      company: 'Selfcheck Co',
      applyUrl: 'https://example.com/company-apply',
    });
    if (!id2) {
      console.error('  FAIL  insertJob #2 returned null');
      process.exit(1);
    }
    ids.push(id2);

    const before = getJobById(id2);
    assert(!before.appliedAt, 'fresh job has no applied_at');

    const viaStatus = updateJob(id2, { status: 'applied' });
    assert(viaStatus.status === 'applied', 'updateJob sets status=applied');
    assert(
      viaStatus.appliedAt !== null && viaStatus.appliedAt !== '',
      `updateJob stamps applied_at ("${viaStatus.appliedAt}")`,
    );
    assert(
      viaStatus.appliedUrl === 'https://example.com/company-apply',
      'updateJob copies apply_url into applied_url when empty',
    );

    const stampedAt = viaStatus.appliedAt;
    const again = updateJob(id2, { status: 'applied' });
    assert(
      again.appliedAt === stampedAt,
      `updateJob does not overwrite existing applied_at ("${again.appliedAt}")`,
    );

    // --- application_stage migration mapping ---
    migrateApplicationStages();
    const remappedApplied = getJobById(id);
    assert(
      remappedApplied.applicationStage === 'sent',
      `applied → application_stage=sent ("${remappedApplied.applicationStage}")`,
    );
    assert(
      remappedApplied.status === 'parsed',
      `applied status falls back to parsed when titled ("${remappedApplied.status}")`,
    );

    const remappedViaStatus = getJobById(id2);
    assert(
      remappedViaStatus.applicationStage === 'sent',
      `status-applied path also remaps to sent ("${remappedViaStatus.applicationStage}")`,
    );

    const id3 = insertJob({
      source: 'selfcheck',
      sourceUrl: `selfcheck-rejected-${Date.now()}`,
      rawText: 'selfcheck rejected job',
      title: 'Selfcheck Rejected',
      company: 'Selfcheck Co',
      cvMdPath: '/tmp/fake-cv.md',
    });
    if (!id3) {
      console.error('  FAIL  insertJob #3 returned null');
      process.exit(1);
    }
    ids.push(id3);
    updateJob(id3, { status: 'rejected' });
    migrateApplicationStages();
    const remappedRejected = getJobById(id3);
    assert(
      remappedRejected.applicationStage === 'rejected',
      `rejected → application_stage=rejected ("${remappedRejected.applicationStage}")`,
    );
    assert(
      remappedRejected.status === 'cv_generated',
      `rejected status falls back to cv_generated when CV path set ("${remappedRejected.status}")`,
    );

    migrateApplicationStages();
    assert(
      getJobById(id3).applicationStage === 'rejected' &&
        getJobById(id3).status === 'cv_generated',
      'second migrateApplicationStages leaves remapped rows unchanged',
    );
  } finally {
    for (const id of ids) {
      const deleted = deleteJob(id);
      assert(deleted, `throwaway job ${id} cleaned up`);
    }
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
