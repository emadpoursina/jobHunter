import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { makeSlug } from '../collectors/base.js';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '.');
const OFFERS_DIR = process.env.OFFERS_DIR ?? 'phase2/offers/by-country';
const CV_OUTPUT_DIR = process.env.CV_OUTPUT_DIR ?? 'phase2/documents/generated';

// Resolve a path relative to the jobHunter repo root
export function repoPath(...parts) {
  return resolve(REPO_ROOT, ...parts);
}

// Read a repo file by relative path; returns null when missing
export async function readRepoFile(relativePath) {
  const fullPath = repoPath(relativePath);

  try {
    return await readFile(fullPath, 'utf8');
  } catch {
    return null;
  }
}

// Write a parsed offer to the repo and return its relative path
export async function writeOfferMd(job) {
  const countryCode = (pick(job, 'countryCode', 'country_code') ?? 'XX').toUpperCase();
  const company = pick(job, 'company') ?? 'Unknown';
  const title = pick(job, 'title') ?? 'Unknown';
  const collectedAt = formatDate(pick(job, 'createdAt', 'created_at') ?? new Date());
  const slug = makeSlug(company, title, collectedAt);
  const relativeDir = `${OFFERS_DIR}/${countryCode}`;
  const relativePath = await resolveUniqueOfferPath(relativeDir, slug);
  const fullPath = repoPath(relativePath);
  const content = formatOfferMarkdown(job, collectedAt);

  await mkdir(repoPath(relativeDir), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
  console.log(`[INFO] [repoFiles] Wrote offer file ${fullPath}`);

  return relativePath;
}

// Write generated CV markdown and return its relative path (overwrites on collision)
export async function writeCvMd(job, cvText) {
  const company = pick(job, 'company') ?? 'Unknown';
  const title = pick(job, 'title') ?? 'Unknown';
  const generatedAt = formatDate(new Date());
  const filename = `CV_${toPascalSlug(company)}_${toPascalSlug(title)}_${generatedAt}.md`;
  const relativePath = `${CV_OUTPUT_DIR}/${filename}`;
  const fullPath = repoPath(relativePath);

  await mkdir(repoPath(CV_OUTPUT_DIR), { recursive: true });
  await writeFile(fullPath, cvText, 'utf8');
  console.log(`[INFO] [repoFiles] Wrote CV file ${fullPath}`);

  return relativePath;
}

// Pick the first defined value from a job record using camelCase or snake_case keys
function pick(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] !== undefined && job?.[key] !== null) {
      return job[key];
    }
  }

  return undefined;
}

// Normalize list fields that may be stored as JSON strings or arrays
function asStringList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  return [];
}

// Format a date value as YYYY-MM-DD
function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

// Build PascalCase slug segments for CV filenames
function toPascalSlug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'Unknown';
}

// Find an unused offer filename, appending -2, -3, ... when the base slug exists
async function resolveUniqueOfferPath(relativeDir, slug) {
  let relativePath = `${relativeDir}/${slug}.md`;
  let suffix = 2;

  while (await fileExists(repoPath(relativePath))) {
    relativePath = `${relativeDir}/${slug}-${suffix}.md`;
    suffix += 1;
  }

  return relativePath;
}

// Check whether a file already exists on disk
async function fileExists(fullPath) {
  try {
    await access(fullPath);
    return true;
  } catch {
    return false;
  }
}

// Render offer markdown using the repo frontmatter and section layout
function formatOfferMarkdown(job, collectedAt) {
  const source = pick(job, 'source') ?? 'manual';
  const sourceUrl = pick(job, 'sourceUrl', 'source_url') ?? 'manual';
  const title = pick(job, 'title') ?? 'Unknown';
  const company = pick(job, 'company') ?? 'Unknown';
  const location = pick(job, 'location') ?? 'Unknown';
  const employmentType = pick(job, 'employmentType', 'employment_type') ?? 'Unknown';
  const salary = pick(job, 'salary') ?? 'Not listed';
  const visaSponsorship = pick(job, 'visaSponsorship', 'visa_sponsorship') ?? 'Not mentioned';
  const matchScore = Number(pick(job, 'matchScore', 'match_score') ?? 0);
  const requiredSkills = asStringList(pick(job, 'requiredSkills', 'required_skills'));
  const niceToHave = asStringList(pick(job, 'niceToHave', 'nice_to_have'));
  const responsibilities = asStringList(pick(job, 'responsibilities'));

  return `---
date_collected: ${collectedAt}
source: ${source}
source_url: ${sourceUrl}
status: new
match_score: ${matchScore}
---

# ${title} — ${company}

## Meta
| Field | Value |
|-------|-------|
| Company | ${company} |
| Role | ${title} |
| Location | ${location} |
| Type | ${employmentType} |
| Salary | ${salary} |
| Visa sponsorship | ${visaSponsorship} |
| Match score | ${matchScore}% |

## Required skills
${bulletList(requiredSkills)}

## Nice to have
${bulletList(niceToHave)}

## Key responsibilities
${bulletList(responsibilities)}
`;
}

// Render a markdown bullet list, using a placeholder when empty
function bulletList(items) {
  if (!items.length) return '- None listed';

  return items.map((item) => `- ${item}`).join('\n');
}
