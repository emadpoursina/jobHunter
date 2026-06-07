import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PACKAGE_ROOT, 'data', 'jobs.db');

const JSON_COLUMNS = ['required_skills', 'nice_to_have', 'responsibilities'];
const JOB_SUMMARY_COLUMNS = [
  'id',
  'source',
  'title',
  'company',
  'location',
  'country_code',
  'match_score',
  'status',
  'visa_sponsorship',
  'created_at',
];

const DEFAULT_SETTINGS = {
  llm_provider: 'ollama',
  ollama_base_url: 'http://localhost:11434',
  ollama_model: '',
  anthropic_api_key: '',
  collectors: {},
};

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });
sqlite.run('PRAGMA journal_mode = WAL');
sqlite.run('PRAGMA foreign_keys = ON');

// Convert snake_case object keys to camelCase for API responses
export function toCamel(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (typeof obj !== 'object') return obj;

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [snakeToCamel(key), value]),
  );
}

// Create tables, trigger, and default settings on startup
export function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      source          TEXT    NOT NULL,
      source_url      TEXT,
      raw_text        TEXT    NOT NULL,
      title           TEXT,
      company         TEXT,
      location        TEXT,
      employment_type TEXT,
      salary          TEXT,
      visa_sponsorship TEXT,
      required_skills   TEXT,
      nice_to_have      TEXT,
      responsibilities  TEXT,
      match_score     INTEGER,
      offer_md_path   TEXT,
      cv_md_path      TEXT,
      status          TEXT    NOT NULL DEFAULT 'raw',
      country_code    TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      config      TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'running',
      jobs_found  INTEGER NOT NULL DEFAULT 0,
      jobs_new    INTEGER NOT NULL DEFAULT 0,
      error       TEXT,
      started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TRIGGER IF NOT EXISTS jobs_updated_at
    AFTER UPDATE ON jobs
    BEGIN
      UPDATE jobs SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);

  seedDefaultSettings();
}

// Return jobs matching optional status, source, and country filters
export function getJobs(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.source) {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters.country_code ?? filters.countryCode) {
    conditions.push('country_code = ?');
    params.push(filters.country_code ?? filters.countryCode);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = sqlite
    .prepare(
      `SELECT ${JOB_SUMMARY_COLUMNS.join(', ')} FROM jobs ${where} ORDER BY created_at DESC`,
    )
    .all(...params);

  return rows.map((row) => toCamel(row));
}

// Return one job with all fields, or null when missing
export function getJobById(id) {
  const row = sqlite.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  return row ? parseJobRow(row) : null;
}

// Insert a job row and return the new id
export function insertJob(jobData) {
  const row = normalizeJobInput(jobData);
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = sqlite.prepare(
    `INSERT INTO jobs (${columns.join(', ')}) VALUES (${placeholders})`,
  );
  const result = stmt.run(...columns.map((col) => row[col]));
  return Number(result.lastInsertRowid);
}

// Delete a job by id; returns true when a row was removed
export function deleteJob(id) {
  const result = sqlite.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return result.changes > 0;
}

// Partially update a job by id
export function updateJob(id, fields) {
  const row = normalizeJobInput(fields);
  const columns = Object.keys(row);

  if (columns.length === 0) return getJobById(id);

  const assignments = columns.map((col) => `${col} = ?`).join(', ');
  sqlite
    .prepare(`UPDATE jobs SET ${assignments} WHERE id = ?`)
    .run(...columns.map((col) => row[col]), id);

  return getJobById(id);
}

// Check whether a job with the same source URL already exists
export function jobExistsByUrl(sourceUrl) {
  if (!sourceUrl) return false;

  const row = sqlite
    .prepare('SELECT 1 AS found FROM jobs WHERE source_url = ? LIMIT 1')
    .get(sourceUrl);

  return Boolean(row);
}

// Insert a collection run and return the new id
export function insertRun(runData) {
  const source = runData.source;
  const config = JSON.stringify(runData.config ?? {});
  const status = runData.status ?? 'running';
  const jobsFound = runData.jobs_found ?? runData.jobsFound ?? 0;
  const jobsNew = runData.jobs_new ?? runData.jobsNew ?? 0;
  const error = runData.error ?? null;
  const finishedAt = runData.finished_at ?? runData.finishedAt ?? null;

  const result = sqlite
    .prepare(
      `INSERT INTO runs (source, config, status, jobs_found, jobs_new, error, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(source, config, status, jobsFound, jobsNew, error, finishedAt);

  return Number(result.lastInsertRowid);
}

// Partially update a collection run by id
export function updateRun(id, fields) {
  const row = normalizeRunInput(fields);
  const columns = Object.keys(row);

  if (columns.length === 0) {
    return getRunById(id);
  }

  const assignments = columns.map((col) => `${col} = ?`).join(', ');
  sqlite
    .prepare(`UPDATE runs SET ${assignments} WHERE id = ?`)
    .run(...columns.map((col) => row[col]), id);

  return getRunById(id);
}

// Return one collection run by id, or null when missing
export function getRunById(id) {
  const row = sqlite.prepare('SELECT * FROM runs WHERE id = ?').get(id);
  return row ? parseRunRow(row) : null;
}

// Return the most recent collection runs
export function getRecentRuns(limit = 20) {
  const rows = sqlite
    .prepare('SELECT * FROM runs ORDER BY started_at DESC LIMIT ?')
    .all(limit);

  return rows.map(parseRunRow);
}

// Read one setting value, parsed from JSON
export function getSetting(key) {
  const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return null;

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

// Persist one setting value as JSON
export function setSetting(key, value) {
  sqlite
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, JSON.stringify(value));
}

// Return all settings as a plain object
export function getAllSettings() {
  const rows = sqlite.prepare('SELECT key, value FROM settings').all();
  const settings = {};

  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

// Close the SQLite connection
export function close() {
  sqlite.close();
}

export const db = {
  getJobs,
  getJobById,
  insertJob,
  updateJob,
  deleteJob,
  jobExistsByUrl,
  insertRun,
  updateRun,
  getRunById,
  getRecentRuns,
  getSetting,
  setSetting,
  getAllSettings,
  close,
};

migrate();

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function seedDefaultSettings() {
  if (getSetting('llm_provider') !== null) return;

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    setSetting(key, value);
  }
}

function parseJobRow(row) {
  const job = toCamel(row);

  for (const field of ['requiredSkills', 'niceToHave', 'responsibilities']) {
    if (typeof job[field] === 'string') {
      try {
        job[field] = JSON.parse(job[field]);
      } catch {
        // Keep the raw string when JSON parsing fails.
      }
    }
  }

  return job;
}

function parseRunRow(row) {
  const run = toCamel(row);

  if (typeof run.config === 'string') {
    try {
      run.config = JSON.parse(run.config);
    } catch {
      // Keep the raw string when JSON parsing fails.
    }
  }

  return run;
}

function normalizeJobInput(jobData) {
  const row = {};

  for (const [key, value] of Object.entries(jobData)) {
    if (value === undefined) continue;

    const column = camelToSnake(key);
    row[column] = JSON_COLUMNS.includes(column) && value !== null
      ? JSON.stringify(value)
      : value;
  }

  return row;
}

function normalizeRunInput(fields) {
  const row = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;

    const column = camelToSnake(key);
    row[column] = column === 'config' && typeof value !== 'string'
      ? JSON.stringify(value)
      : value;
  }

  return row;
}
