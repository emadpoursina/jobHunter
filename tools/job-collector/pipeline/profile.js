import { createHash } from 'crypto';
import { mkdir, rename, stat, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getSetting, setSetting } from '../server/db.js';
import { repoPath, readRepoFile } from './repoFiles.js';

export const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';
const CACHE_KEY = 'parsed_profile';
const MTIME_KEY = 'parsed_profile_mtime';

const KEY_ALIASES = {
  'full name': 'fullName',
  'email': 'email',
  'phone / whatsapp': 'phone',
  'phone': 'phone',
  'whatsapp': 'phone',
  'telegram': 'telegram',
  'linkedin': 'linkedInUrl',
  'github': 'githubUrl',
  'location': 'location',
  'seeking': 'seeking',
  'work authorization': 'workAuthorization',
  'languages': 'languages',
};

const REQUIRED_FIELDS = ['fullName', 'email', 'phone'];

// Parse the "Personal Information" fenced block from master-profile.md into a typed object
export function parseProfileText(md) {
  const blockMatch = md.match(
    /##\s*1\.\s*Personal Information\s*\n+```[^\n]*\n([\s\S]*?)```/,
  );
  if (!blockMatch) {
    const err = new Error('Personal Information block not found in master-profile.md');
    err.code = 'PROFILE_INCOMPLETE';
    throw err;
  }

  const profile = {
    fullName: '',
    email: '',
    phone: '',
    telegram: '',
    linkedInUrl: '',
    githubUrl: '',
    location: '',
    seeking: '',
    workAuthorization: '',
    languages: [],
  };

  for (const rawLine of blockMatch[1].split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const sep = line.indexOf(':');
    if (sep === -1) continue;

    const rawKey = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    const field = KEY_ALIASES[rawKey];
    if (!field) continue;

    if (field === 'languages') {
      profile.languages = parseLanguages(value);
    } else {
      profile[field] = value;
    }
  }

  const missing = REQUIRED_FIELDS.filter((f) => !profile[f]);
  if (missing.length) {
    const err = new Error(`master-profile.md missing required fields: ${missing.join(', ')}`);
    err.code = 'PROFILE_INCOMPLETE';
    err.missing = missing;
    throw err;
  }

  return profile;
}

// Split "Farsi (Native), English (Fluent), German (A1 — learning)" into [{ name, level }]
function parseLanguages(value) {
  const result = [];
  const re = /([^(,]+?)\s*\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(value)) !== null) {
    result.push({ name: m[1].trim(), level: m[2].trim() });
  }
  return result;
}

// Read and parse the profile file at PROFILE_PATH (relative to REPO_ROOT)
export async function parseProfileFile(relativePath = PROFILE_PATH) {
  const md = await readRepoFile(relativePath);
  if (md === null) {
    const err = new Error(`master-profile.md not found at ${relativePath}`);
    err.code = 'PROFILE_INCOMPLETE';
    throw err;
  }
  return parseProfileText(md);
}

// SHA-256 fingerprint of profile Markdown for optimistic-lock checks
export function hashProfileRevision(markdown) {
  return createHash('sha256').update(markdown, 'utf8').digest('hex');
}

// Read profile Markdown with its current revision fingerprint
export async function getProfileDocument() {
  const markdown = await getProfileMarkdown();
  return { markdown, revision: hashProfileRevision(markdown) };
}

function assertRevisionMatch(currentMarkdown, baseRevision) {
  if (baseRevision === undefined || baseRevision === null || baseRevision === '') return;
  const current = hashProfileRevision(currentMarkdown);
  if (current !== baseRevision) {
    const err = new Error('Profile has changed since this revision; refresh and try again');
    err.code = 'PROFILE_REVISION_CONFLICT';
    throw err;
  }
}

// Atomic write: temp file in same directory, then rename
async function writeProfileFileAtomic(content) {
  const fullPath = repoPath(PROFILE_PATH);
  const tempPath = `${fullPath}.tmp-${process.pid}`;
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, fullPath);
}

// Read raw profile Markdown from the configured PROFILE_PATH
export async function getProfileMarkdown() {
  const md = await readRepoFile(PROFILE_PATH);
  if (md === null) {
    const err = new Error(`Profile not found at ${PROFILE_PATH}`);
    err.code = 'NOT_FOUND';
    throw err;
  }
  return md;
}

// Clear parsed profile cache so autofill re-reads the file on next use
export function invalidateProfileCache() {
  setSetting(CACHE_KEY, null);
  setSetting(MTIME_KEY, null);
}

// Validate and save profile Markdown; never writes on validation failure
export async function saveProfileMarkdown(content, { baseRevision } = {}) {
  if (typeof content !== 'string' || !content.trim()) {
    const err = new Error('Profile content must be a non-empty string');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const current = await readRepoFile(PROFILE_PATH);
  if (current !== null) {
    assertRevisionMatch(current, baseRevision);
  }

  parseProfileText(content);
  await writeProfileFileAtomic(content);
  invalidateProfileCache();
  const markdown = content;
  return { markdown, revision: hashProfileRevision(markdown) };
}

// Return cached parsed profile, re-parsing when the file mtime changes or refresh=true
export async function getParsedProfile({ refresh = false } = {}) {
  if (!refresh) {
    const cached = getSetting(CACHE_KEY);
    if (cached && typeof cached === 'object') return cached;
  }

  const profile = await parseProfileFile();
  setSetting(CACHE_KEY, profile);

  const fullPath = repoPath(PROFILE_PATH);
  try {
    const st = await stat(fullPath);
    setSetting(MTIME_KEY, st.mtimeMs);
  } catch {
    // mtime tracking is best-effort; ignore stat failures
  }

  return profile;
}
