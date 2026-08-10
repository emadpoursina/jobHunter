// Self-check for server/db.js applied_at + application_stage
// Run: cd tools/job-collector && bun run server/db.self-check.js
import {
  insertJob,
  getJobById,
  getJobs,
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
    assert(
      inserted.status === 'raw' || inserted.status === 'parsed',
      `new job has pipeline status ("${inserted.status}")`,
    );

    const first = markApplied(id, { appliedUrl: 'https://example.com/apply' });
    assert(first !== null, 'markApplied returns job row');
    assert(
      first.applicationStage === 'sent',
      `markApplied sets application_stage=sent ("${first.applicationStage}")`,
    );
    assert(
      first.status !== 'applied',
      `markApplied does not leave long-lived status=applied ("${first.status}")`,
    );
    assert(first.appliedAt !== null && first.appliedAt !== '', `applied_at set ("${first.appliedAt}")`);
    assert(first.appliedUrl === 'https://example.com/apply', 'applied_url stored');

    const firstAppliedAt = first.appliedAt;
    const firstStatus = first.status;

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
    assert(
      second.applicationStage === 'sent' && second.status === firstStatus,
      'idempotent: stage/status stable on second markApplied',
    );

    // --- updateJob status=applied maps to stage sent (UI cutover) ---
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
    assert(
      viaStatus.applicationStage === 'sent',
      `updateJob status=applied → application_stage=sent ("${viaStatus.applicationStage}")`,
    );
    assert(
      viaStatus.status === 'parsed',
      `updateJob status=applied → pipeline parsed ("${viaStatus.status}")`,
    );
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

    // --- direct applicationStage=sent stamps applied_at ---
    const id4 = insertJob({
      source: 'selfcheck',
      sourceUrl: `selfcheck-stage-sent-${Date.now()}`,
      rawText: 'selfcheck stage sent',
      title: 'Stage Sent Job',
      company: 'Selfcheck Co',
    });
    if (!id4) {
      console.error('  FAIL  insertJob #4 returned null');
      process.exit(1);
    }
    ids.push(id4);
    const viaStage = updateJob(id4, { applicationStage: 'sent' });
    assert(viaStage.applicationStage === 'sent', 'PATCH-style stage=sent works');
    assert(Boolean(viaStage.appliedAt), 'stage=sent stamps applied_at once');

    // --- invalid stage throws VALIDATION_ERROR ---
    let threw = false;
    try {
      updateJob(id4, { applicationStage: 'bogus' });
    } catch (err) {
      threw = err?.code === 'VALIDATION_ERROR';
    }
    assert(threw, 'invalid application_stage throws VALIDATION_ERROR');

    // --- getJobs filter by application_stage ---
    const filtered = getJobs({ application_stage: 'sent' });
    assert(
      filtered.some((j) => j.id === id) && filtered.every((j) => j.applicationStage === 'sent'),
      'getJobs filters by application_stage=sent',
    );

    // --- legacy migrate remap still works for leftover status=rejected ---
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
    // Force legacy status via raw path: updateJob maps rejected → stage
    const viaRejected = updateJob(id3, { status: 'rejected' });
    assert(
      viaRejected.applicationStage === 'rejected',
      `status=rejected → application_stage=rejected ("${viaRejected.applicationStage}")`,
    );
    assert(
      viaRejected.status === 'cv_generated',
      `status=rejected → pipeline cv_generated ("${viaRejected.status}")`,
    );

    migrateApplicationStages();
    assert(
      getJobById(id3).applicationStage === 'rejected',
      'migrateApplicationStages leaves already-mapped rows alone',
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
