# Prompt: Project → master profile

Two-step workflow: extract project facts in the **project repo**, then merge into jobHunter.

---

## Step 1 — Run in your project repo (extraction)

Open the project codebase in Cursor. Attach the agent spec from jobHunter: `@jobHunter/docs/agents/project-profile-extractor.md` (or paste that file if the repo is not in the same workspace).

Then paste:

```
You are the Project Profile Extractor for jobHunter.

Follow the attached project-profile-extractor.md agent spec (output must match master profile Section 5 project block format).

Context:
- Project root: [CURRENT REPO — or path]
- My role: [e.g. Sole developer]
- Live URL (if any): [URL or "none / private"]
- Duration (if you know it): [e.g. 2024 – Present]

Tasks:
1. Inspect README, dependencies, source, Docker/CI, and tests
2. Produce a Project Profile Block (exact field layout from the agent spec)
3. Append Skill evidence summary table
4. Add Evidence notes listing files that support each claim

Hard rules:
- Do not fabricate features, metrics, or tech stack items
- Implemented vs planned must be separated
- Unknown fields → "Unknown — verify with owner"
- Do not upgrade skill levels beyond what the code proves

Save output to phase2/documents/generated/ProjectProfile_<ProjectSlug>_<YYYY-MM-DD>.md
OR paste the full block in chat if this repo is not jobHunter.
```

Copy the **Project Profile Block** and **Skill evidence summary** for Step 2.

---

## Step 2 — Run in jobHunter (merge)

Paste in this repo with the extraction output:

```
You are merging a project into the jobHunter master profile.

Follow docs/agents/project-profile-extractor.md — Merge into master profile step.

Inputs:
1. Master profile: phase2/profile/master-profile.md
2. Project extraction output:
[PASTE Project Profile Block + Skill evidence summary]

Tasks:
1. Add or update the project in Section 5 (match existing project format and numbering)
2. Update Section 3 skill Notes where evidence supports it — do not mark Learning skills as Expert
3. Update Section 10 if the project is Live with a public URL
4. If this project duplicates an existing entry (same URL/repo), merge instead of duplicating

Hard rules:
- Never fabricate — only use extraction output and existing profile facts
- Preserve all unrelated sections unchanged
- After editing, list what changed in a short Merge Report (project added/updated, skills touched, portfolio updated)

Do not commit — user reviews first.
```

---

## Before you run Step 1

- [ ] Project repo is open (or attached) with enough context for the agent to read source
- [ ] You know your role and approximate dates
- [ ] Live/demo URLs are correct (or marked private)

---

## After merge — human review (required)

- [ ] Every contribution bullet is backed by Evidence notes
- [ ] Technologies list matches what is actually in the repo
- [ ] No Learning skills were bumped without proof
- [ ] No duplicate project entries
- [ ] URLs and Status are accurate

Sync skills separately if needed: [`../../phase3/skill-map.md`](../../phase3/skill-map.md)

---

## Output naming (Step 1, optional save in jobHunter)

```
phase2/documents/generated/ProjectProfile_<ProjectSlug>_<YYYY-MM-DD>.md
```

Examples:

- `ProjectProfile_RoustaTV_2026-06-06.md`
- `ProjectProfile_FlagshipSaaS_2026-06-06.md`

