# Agent: Project profile extractor

## Purpose

Run **inside a project repository** (or with full project context). Inspect the codebase, README, deploy config, and git history, then produce a structured **Project Profile Block** that matches Section 5 of [`profile/master-profile.md`](../../profile/master-profile.md).

A second step in jobHunter merges that block into the master profile and updates related sections (skills, portfolio) when appropriate.

**Rules:** Never fabricate features, metrics, or technologies. Distinguish **implemented** vs **planned**. If something is unclear, mark it `Unknown — verify with owner` rather than guessing.

---

## Input

```
project_root: <path to project repo or folder>
project_name: <optional override if not obvious from repo>
your_role: <optional, e.g. Sole developer, Contributor>
```

Always load the target schema from:

```
profile/master-profile.md   # Section 5 — Projects (jobHunter repo)
```

---

## Step 1 — Discover project facts

Inspect, in order of reliability:

1. **README**, `package.json`, `composer.json`, Docker/CI configs, env examples
2. **Source tree** — `src/`, `apps/`, `packages/`, API routes, models, auth, tests
3. **Deploy artifacts** — Dockerfile, `docker-compose`, GitHub Actions, AWS/Terraform, nginx configs
4. **Git** — first/last meaningful commit dates (for duration, if not documented elsewhere)
5. **Live URLs** — only if explicitly documented or verifiable; otherwise `Not available`

Record only what you can evidence from the repo or user-provided context.

---

## Step 2 — Classify status and role

| Field | Values |
|-------|--------|
| **Status** | `Live` \| `Private / Internal` \| `In development` \| `Archived` |
| **Role** | e.g. Sole developer, Technical lead, Contributor — use what the user stated or README implies |
| **Type** | Short label: Social Platform, SaaS, CRM, API service, etc. |

---

## Step 3 — Extract contributions

List **your** contributions as bullet points (past tense, concrete):

- Architecture decisions you can see in code (e.g. REST versioning, RBAC, queue workers)
- Features implemented (not roadmap items)
- DevOps/testing work if present

Do **not** list library names alone as contributions. Tie each bullet to behavior or outcome.

Optional **Scale / metrics** block — only if documented (users, requests/day, dataset size, test coverage %). Never invent numbers.

---

## Step 4 — List technologies honestly

From dependencies and config, list stacks actually used in this project.

Split if helpful:

- **Implemented:** in `package.json`, lockfile, or deployed services
- **Planned / stub only:** mentioned in README or TODO but no implementation — do not list under main Technologies; put under `Planned (not yet implemented):`

---

## Step 5 — Output Project Profile Block

Use this exact field layout (matches master profile):

```markdown
### Project Profile Block — <Project Name>

\`\`\`
Name:           <name>
URL:            <url or "Not available">
Status:         <Live | Private / Internal | In development | Archived>
Type:           <short type>
Role:           <your role>
Duration:       <YYYY – YYYY or YYYY – Present | Unknown>

What it does:
<2–4 sentences — product purpose, audience, main workflows>

Your contributions:
- <concrete bullet>
- <concrete bullet>
- <3–8 bullets typical>

Technologies:
<comma-separated list — implemented only>

Scale / metrics:     <optional — omit line if none verified>
GitHub / repo:         <url if applicable>
Planned (not yet implemented):  <optional — omit if none>
\`\`\`

Evidence notes:
- <file or path that supports each major claim, 3–6 bullets>
```

---

## Step 6 — Skill evidence summary (for master profile sync)

After the block, append a short table for jobHunter merge:

| Skill | Evidence in this project | Suggested level change |
|-------|--------------------------|------------------------|
| e.g. PostgreSQL | Prisma schema + migrations in `prisma/` | Supports Advanced — add project name to skill-map Notes |
| e.g. NestJS | Only in README TODO | No change — still Learning |

Only suggest level changes when implementation clearly exceeds what master profile already claims.

---

## Step 7 — Save output (optional)

If running inside jobHunter repo:

```
documents/generated/ProjectProfile_<ProjectSlug>_<YYYY-MM-DD>.md
```

Otherwise output in chat for the user to paste into jobHunter.

---

## Merge into master profile (jobHunter step)

Run [`documents/prompts/project-to-profile.md`](../../documents/prompts/project-to-profile.md) **merge invocation** with:

1. `profile/master-profile.md`
2. The Project Profile Block from this agent

The merge agent must:

1. Add a new `### Project N:` entry in Section 5 (or update existing if same name/URL)
2. Renumber projects if needed
3. Update Section 3 skill **Notes** when new project evidence supports an existing skill (do not upgrade **Learning** to Expert without clear production use)
4. Update Section 10 portfolio URLs if Status is `Live`
5. Not duplicate projects already listed under a different name — merge or ask in Evidence notes

**Human review required** before treating the master profile as final.
