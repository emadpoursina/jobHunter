#!/usr/bin/env bun
// Backfill applied_at for jobs with status=applied but empty applied_at.
// Uses updated_at as the best available proxy for when the status was set.
//
// Default: dry-run (prints rows that would change).
// Apply:   bun scripts/backfill-applied-at.mjs --force
import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'jobs.db');
const force = process.argv.includes('--force');

const sqlite = new Database(DB_PATH);

const rows = sqlite
  .prepare(
    `SELECT id, company, title, status, applied_at, updated_at, apply_url, applied_url
     FROM jobs
     WHERE status = 'applied'
       AND (applied_at IS NULL OR applied_at = '')
     ORDER BY id`,
  )
  .all();

if (rows.length === 0) {
  console.log('No applied jobs missing applied_at.');
  sqlite.close();
  process.exit(0);
}

console.log(`${force ? 'Updating' : 'Would update'} ${rows.length} row(s):\n`);
for (const row of rows) {
  console.log(
    `  id=${row.id}  company=${row.company}  updated_at=${row.updated_at}  apply_url=${row.apply_url ?? ''}`,
  );
}

if (!force) {
  console.log('\nDry-run only. Re-run with --force to apply.');
  sqlite.close();
  process.exit(0);
}

const toFix = sqlite
  .prepare(
    `SELECT COUNT(*) AS n
     FROM jobs
     WHERE status = 'applied'
       AND (applied_at IS NULL OR applied_at = '')`,
  )
  .get().n;

sqlite
  .prepare(
    `UPDATE jobs
     SET applied_at = updated_at,
         applied_url = COALESCE(NULLIF(applied_url, ''), apply_url)
     WHERE status = 'applied'
       AND (applied_at IS NULL OR applied_at = '')`,
  )
  .run();

console.log(`\nUpdated ${toFix} row(s).`);
sqlite.close();
