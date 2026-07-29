import { stat } from 'fs/promises';
import { getSetting, setSetting } from '../server/db.js';
import { repoPath, readRepoFile } from './repoFiles.js';

const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';
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
