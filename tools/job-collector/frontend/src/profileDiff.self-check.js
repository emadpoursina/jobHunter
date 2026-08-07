// Self-check for frontend/src/profileDiff.js
// Run: cd tools/job-collector && bun run frontend/src/profileDiff.self-check.js
import { buildLineDiff, diffHasChanges } from './profileDiff.js';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

const before = 'line one\nline two\nline three';
const after = 'line one\nline TWO\nline three\nline four';

const rows = buildLineDiff(before, after);
assert(diffHasChanges(rows), 'detects changes');
assert(rows.some((r) => r.type === 'remove' && r.text === 'line two'), 'marks removed line');
assert(rows.some((r) => r.type === 'add' && r.text === 'line TWO'), 'marks added line');
assert(rows.some((r) => r.type === 'add' && r.text === 'line four'), 'marks appended line');

const identical = buildLineDiff('a\nb', 'a\nb');
assert(!diffHasChanges(identical), 'identical text has no changes');

if (failures === 0) {
  console.log('OK');
  process.exit(0);
} else {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
