import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PACKAGE_ROOT, 'data', 'jobs.db');

const JSON_COLUMNS = ['required_skills', 'nice_to_have', 'responsibilities'];

/** Application funnel stages (separate from collector/CV `status`). */
export const APPLICATION_STAGES = [
  'not_started',
  'draft',
  'reviewed',
  'sent',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

const JOB_SUMMARY_COLUMNS = [
  'id',
  'source',
  'title',
  'company',
  'location',
  'country_code',
  'match_score',
  'status',
  'application_stage',
  'visa_sponsorship',
  'applied_at',
  'created_at',
];

const DEFAULT_LLM_TASK = { provider: '', model: '', provider_order: '' };

export const DEFAULT_LLM_TASKS = {
  parse: { ...DEFAULT_LLM_TASK },
  cv: { ...DEFAULT_LLM_TASK },
  cover_letter: { ...DEFAULT_LLM_TASK },
  profile_update: { ...DEFAULT_LLM_TASK },
};

const DEFAULT_SETTINGS = {
  llm_provider: 'openai',
  openai_api_key: '',
  openai_base_url: 'https://api.openai.com/v1',
  openai_model: '',
  openrouter_api_key: '',
  openrouter_model: '',
  openrouter_provider_order: '',
  llm_tasks: {
    parse: { ...DEFAULT_LLM_TASK },
    cv: { ...DEFAULT_LLM_TASK },
    cover_letter: { ...DEFAULT_LLM_TASK },
    profile_update: { ...DEFAULT_LLM_TASK },
  },
  collectors: {
    // English-first pivot default: point generic sources at the lead priority market
    linkedin: { enabled: true, queries: ['backend engineer', 'full-stack engineer', 'node.js engineer'], location: 'Canada', maxResults: 10 },
    indeed: { enabled: true, queries: ['backend engineer', 'full-stack engineer', 'node.js engineer'], location: 'Canada', maxResults: 10 },
    hiringcafe: { enabled: true, queries: ['backend engineer', 'full-stack engineer', 'node.js engineer'], location: 'Canada', maxResults: 10 },
    // New-market presets pre-scoped to priority countries
    uk: { enabled: true, queries: ['backend engineer', 'full-stack engineer', 'node.js engineer', 'senior full-stack', 'visa sponsorship'], location: '', maxResults: 10 },
    ireland: { enabled: true, queries: ['backend engineer', 'full-stack engineer', 'node.js engineer', 'senior full-stack', 'visa sponsorship'], location: '', maxResults: 10 },
    // DE-only board disabled by default after the English-first pivot
    germantechjobs: { enabled: false, queries: [], location: 'Germany', maxResults: 10 },
  },
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_url_unique
    ON jobs(source_url)
    WHERE source_url IS NOT NULL AND source_url != '';
  `);

  addColumnIfMissing('jobs', 'applied_at', 'TEXT');
  addColumnIfMissing('jobs', 'applied_url', 'TEXT');
  addColumnIfMissing('jobs', 'apply_url', 'TEXT');
  addColumnIfMissing('jobs', 'cover_letter_md_path', 'TEXT');
  addColumnIfMissing(
    'jobs',
    'application_stage',
    "TEXT NOT NULL DEFAULT 'not_started'",
  );

  migrateApplicationStages();
  seedDefaultSettings();
}

/**
 * One-time (idempotent) remap: legacy decision statuses → application_stage,
 * then restore collector/CV pipeline status from CV path / title.
 * Safe to re-run: only rows still on status=applied|rejected are rewritten.
 */
export function migrateApplicationStages() {
  const pipelineStatusSql = `
    CASE
      WHEN cv_md_path IS NOT NULL AND cv_md_path != '' THEN 'cv_generated'
      WHEN title IS NOT NULL AND title != '' THEN 'parsed'
      ELSE 'raw'
    END`;

  sqlite.run(`
    UPDATE jobs
    SET application_stage = 'sent',
        status = ${pipelineStatusSql}
    WHERE status = 'applied'
  `);

  sqlite.run(`
    UPDATE jobs
    SET application_stage = 'rejected',
        status = ${pipelineStatusSql}
    WHERE status = 'rejected'
  `);
}

// Add a column to a table if it does not already exist (SQLite has no ADD COLUMN IF NOT EXISTS)
function addColumnIfMissing(table, column, type) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    sqlite.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

// Return jobs matching optional status, source, country, and application_stage filters
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
  if (filters.application_stage ?? filters.applicationStage) {
    conditions.push('application_stage = ?');
    params.push(filters.application_stage ?? filters.applicationStage);
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

// Insert a job row and return the new id, or null when the source URL is a duplicate
export function insertJob(jobData) {
  const sourceUrl = jobData.sourceUrl ?? jobData.source_url ?? null;

  if (sourceUrl && jobExistsByUrl(sourceUrl)) {
    console.warn(`[WARN] [db] Skipping duplicate job for URL: ${sourceUrl}`);
    return null;
  }

  const row = normalizeJobInput(jobData);
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = sqlite.prepare(
    `INSERT INTO jobs (${columns.join(', ')}) VALUES (${placeholders})`,
  );

  try {
    const result = stmt.run(...columns.map((col) => row[col]));
    return Number(result.lastInsertRowid);
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      console.warn(`[WARN] [db] Skipping duplicate job (race): ${sourceUrl}`);
      return null;
    }
    throw err;
  }
}

// Delete a job by id; returns true when a row was removed
export function deleteJob(id) {
  const result = sqlite.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return result.changes > 0;
}

// Partially update a job by id.
// Throws Error with code VALIDATION_ERROR when application_stage is invalid.
export function updateJob(id, fields) {
  const existing = getJobById(id);
  if (!existing) return null;

  const normalized = { ...fields };

  // Backward-compat: long-lived status=applied|rejected → funnel stage + pipeline status
  if (normalized.status === 'applied') {
    normalized.applicationStage = 'sent';
    normalized.status = inferPipelineStatus(existing);
  } else if (normalized.status === 'rejected') {
    normalized.applicationStage = 'rejected';
    normalized.status = inferPipelineStatus(existing);
  }

  const row = normalizeJobInput(normalized);
  const columns = Object.keys(row);

  if (columns.length === 0) return existing;

  if (Object.prototype.hasOwnProperty.call(row, 'application_stage')) {
    const stage = row.application_stage;
    if (!APPLICATION_STAGES.includes(stage)) {
      const err = new Error(
        `Invalid application_stage "${stage}". Allowed: ${APPLICATION_STAGES.join(', ')}`,
      );
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  const assignments = columns.map((col) => `${col} = ?`).join(', ');
  sqlite
    .prepare(`UPDATE jobs SET ${assignments} WHERE id = ?`)
    .run(...columns.map((col) => row[col]), id);

  // sent ⇒ stamp applied_at once (first-wins); also covers legacy status=applied mapping
  if (row.application_stage === 'sent') {
    stampAppliedAt(id);
  }

  return getJobById(id);
}

// Mark a job as applied: application_stage=sent, stamp applied_at (first wins)
export function markApplied(id, { appliedUrl = null } = {}) {
  const row = sqlite
    .prepare('SELECT applied_at, apply_url, cv_md_path, title FROM jobs WHERE id = ?')
    .get(id);
  if (!row) return null;

  const pipelineStatus = inferPipelineStatusRow(row);

  if (row.applied_at) {
    // Keep funnel stage in sync even when the timestamp was already recorded
    sqlite
      .prepare(
        `UPDATE jobs
         SET application_stage = 'sent',
             status = CASE
               WHEN status IN ('applied', 'rejected') THEN ?
               ELSE status
             END
         WHERE id = ?`,
      )
      .run(pipelineStatus, id);
    return getJobById(id);
  }

  const url = appliedUrl || row.apply_url || null;
  sqlite
    .prepare(
      `UPDATE jobs
       SET application_stage = 'sent',
           status = CASE
             WHEN status IN ('applied', 'rejected') THEN ?
             ELSE status
           END,
           applied_at = datetime('now'),
           applied_url = ?
       WHERE id = ?`,
    )
    .run(pipelineStatus, url, id);

  // If status was already a pipeline value, leave it; if still applied/rejected, fixed above.
  // Fresh mark-applied on a normal pipeline job: only set stage + stamps (status unchanged).
  return getJobById(id);
}

// Infer collector/CV pipeline status from job fields (camel or snake)
export function inferPipelineStatus(job) {
  if (job.cvMdPath ?? job.cv_md_path) return 'cv_generated';
  if (job.title) return 'parsed';
  return 'raw';
}

function inferPipelineStatusRow(row) {
  return inferPipelineStatus(row);
}

// Stamp applied_at / applied_url once when a job becomes applied
function stampAppliedAt(id) {
  sqlite
    .prepare(
      `UPDATE jobs
       SET applied_at = datetime('now'),
           applied_url = COALESCE(applied_url, apply_url)
       WHERE id = ?
         AND (applied_at IS NULL OR applied_at = '')`,
    )
    .run(id);
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

// Mark runs left in 'running' after a crash/restart so the UI unsticks
export function failOrphanedRuns() {
  const result = sqlite
    .prepare(
      `UPDATE runs
       SET status = 'error',
           error = 'Interrupted by server restart',
           finished_at = datetime('now')
       WHERE status = 'running'`,
    )
    .run();

  if (result.changes > 0) {
    console.warn(
      `[WARN] [db] Marked ${result.changes} orphaned run(s) as error`,
    );
  }

  return result.changes;
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
  markApplied,
  insertRun,
  updateRun,
  getRunById,
  getRecentRuns,
  failOrphanedRuns,
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
  if (getSetting('llm_provider') !== null) {
    const provider = getSetting('llm_provider');
    if (provider === 'ollama' || provider === 'anthropic') {
      setSetting('llm_provider', 'openai');
    }
    for (const key of ['ollama_base_url', 'ollama_model', 'anthropic_api_key']) {
      sqlite.prepare('DELETE FROM settings WHERE key = ?').run(key);
    }
    const tasks = getSetting('llm_tasks');
    if (tasks && typeof tasks === 'object') {
      let changed = false;
      const next = {};
      for (const [task, cfg] of Object.entries(tasks)) {
        if (cfg && typeof cfg === 'object' && (cfg.provider === 'ollama' || cfg.provider === 'anthropic')) {
          next[task] = { ...cfg, provider: '' };
          changed = true;
        } else {
          next[task] = cfg;
        }
      }
      if (changed) setSetting('llm_tasks', next);
    }
    return;
  }

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
