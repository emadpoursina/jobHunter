// Self-check for pipeline/profile.js
// Run: bun run pipeline/profile.self-check.js
// Asserts:
//   1. parseProfileText extracts non-empty fullName, email, phone from the real master-profile.md
//   2. languages parsed into [{ name, level }] with at least one entry
//   3. cache round-trips through db.setSetting/getSetting on a temp key (does not pollute real cache)
// Exits 0 on success, 1 on failure. No test framework.
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseProfileText, parseProfileFile, getParsedProfile } from './profile.js';
import { getSetting, setSetting } from '../server/db.js';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '../..');
const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';
const TEMP_KEY = 'parsed_profile_selfcheck_temp';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

async function main() {
  console.log('[self-check] profile.js');

  const fullPath = resolve(REPO_ROOT, PROFILE_PATH);
  const md = await readFile(fullPath, 'utf8');

  // 1. Required fields parsed
  let profile;
  try {
    profile = parseProfileText(md);
  } catch (err) {
    console.error('  FAIL  parseProfileText threw:', err.message);
    process.exit(1);
  }
  assert(profile.fullName && profile.fullName.length > 0, `fullName non-empty ("${profile.fullName}")`);
  assert(profile.email && profile.email.includes('@'), `email valid ("${profile.email}")`);
  assert(profile.phone && profile.phone.length > 0, `phone non-empty ("${profile.phone}")`);

  // 2. Languages parsed
  assert(
    Array.isArray(profile.languages) && profile.languages.length > 0,
    `languages array non-empty (${profile.languages.length} entries)`,
  );
  if (profile.languages.length > 0) {
    const first = profile.languages[0];
    assert(
      typeof first.name === 'string' && typeof first.level === 'string',
      `language entry has name+level ("${first.name}" / "${first.level}")`,
    );
  }

  // 3. parseProfileFile resolves via REPO_ROOT and returns same shape
  let fromFile;
  try {
    fromFile = await parseProfileFile();
  } catch (err) {
    console.error('  FAIL  parseProfileFile threw:', err.message);
    process.exit(1);
  }
  assert(fromFile.email === profile.email, 'parseProfileFile matches parseProfileText');

  // 4. Cache round-trip on a TEMP key (does not touch real 'parsed_profile')
  setSetting(TEMP_KEY, profile);
  const roundtripped = getSetting(TEMP_KEY);
  assert(
    roundtripped && roundtripped.email === profile.email,
    'cache round-trip via setSetting/getSetting',
  );
  // Clean up temp key by overwriting with null-ish value (settings table has no delete; use empty object)
  setSetting(TEMP_KEY, null);

  // 5. getParsedProfile returns cached object on second call (no refresh)
  const first = await getParsedProfile({ refresh: true });
  const second = await getParsedProfile();
  assert(first.email === second.email, 'getParsedProfile returns cached value on second call');

  if (failures === 0) {
    console.log('OK');
    process.exit(0);
  } else {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('self-check crashed:', err);
  process.exit(1);
});
