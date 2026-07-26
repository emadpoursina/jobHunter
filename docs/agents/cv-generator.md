# Agent: CV Generator (v2)

## Purpose

Takes a filled **master profile** and a structured **job offer file**, then produces:

1. A **tailored CV** in Markdown — the CV itself, nothing else in that file.
2. A separate **Gaps Disclosure** — for the user's eyes only, never sent to an employer, listing exactly what was filled in and why.

This agent replaces the previous `docs/agents/cv-generator.md`. The core difference from v1: gaps against **required** skills are no longer just flagged — they are filled in the CV using **scoped, adjacency-based claims**, and every filled item is logged in the disclosure so the user can review, verify, or strip it before sending.

---

## Input

```
offer_file: <path to job offer markdown>
```

Example:

```
offer_file: phase2/offers/by-country/de/offer-<company>-<role-slug>.md
```

Always load the master profile from:

```
phase2/profile/master-profile.md
```

Optional overrides:

```
country_code: de          # for visa line (Blue Card, HSM, GTS, etc.)
review_only: false        # if true, do not write files — output in chat only
```

---

## Step 1 — Read inputs

Load `phase2/profile/master-profile.md` in full — this is the only source of *verified* fact.

Load the job offer file (create from `offers/_offer-template.md` if missing). Extract:

- Top 5 **required** skills
- Top 3 **nice-to-have** skills
- Seniority level (junior / mid / senior / lead)
- Primary focus (backend-heavy / full-stack / frontend-leaning)
- Company tone (startup casual / enterprise formal / scale-up balanced)
- ATS keywords — exact phrases from the posting

If the offer file lacks a skills table, extract skills from the job description before writing the CV.

---

## Step 2 — Map profile to job offer

For each top-5 required skill and top-3 nice-to-have, classify against the master profile:

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Candidate has it, verified in profile | Include prominently — Skills, Experience, or Projects |
| ⚠️ | Partial / marked Learning in profile | Honest framing — "currently deepening," never "proficient" |
| 🟡 | Missing, but **adjacent** to something verified | Eligible for scoped fill (see Step 3) — logged in disclosure |
| ❌ | Missing, **not adjacent** to anything in profile | Do not include in CV. List as a genuine gap in disclosure |

---

## Step 3 — Handle gaps (scoped fill)

This is the step that differs from a standard "never fabricate" agent — read it carefully and apply it conservatively.

**Adjacency test (must pass before filling anything):** a missing required skill may be filled in the CV *only if* the master profile shows real, verified experience in something functionally close to it. Adjacency means the same problem space, not just the same buzzword category.

Examples of valid adjacency:
- Deep Express.js experience → general "Node.js backend frameworks" or a specific sibling framework the job asks for, *if* the underlying concepts genuinely transfer (routing, middleware, REST design).
- Built CI pipelines with one tool → reasonable to phrase as general CI/CD familiarity if the job asks for a different but conceptually similar tool.
- Used one relational database deeply → reasonable to phrase as general SQL/relational-database competence.

Examples that fail adjacency (must NOT be filled, goes to ❌ / genuine gap instead):
- A required skill in a completely different domain (e.g. profile has no cloud experience at all, job requires AWS — this is not adjacent to anything, don't fill it).
- A specific certification, language, or credential the profile doesn't mention at all.
- Years-of-experience thresholds the actual timeline can't support.

**How to write a filled (🟡) item in the CV:** phrase it at the confidence level the adjacency actually supports — general/working familiarity, not "expert" or "led." Never assign it a fabricated project, metric, or story that doesn't exist in the profile. The fill is a *framing* of real adjacent experience, not an invented anecdote.

**Every 🟡 fill and every ❌ gap gets logged in the Gaps Disclosure (Step 5) — no exceptions, regardless of how minor.**

---

## Step 4 — Write the tailored CV

The CV file contains **only the CV** — no disclosure, no tailoring notes, nothing else.

### Summary
- 3–4 sentences maximum
- Mirror the job offer's language and primary tech stack in the first sentence where the candidate has it (✅ or well-supported 🟡)
- End with what the candidate brings to this specific role

### Skills
- Only skills relevant to this job offer, ✅ and eligible 🟡 fills included
- Order by relevance — most important first
- Group: Backend / Frontend / Databases / DevOps & Infrastructure / Testing & CI/CD / Other
- Omit irrelevant skills unless they add clear value

### Experience
- Rewrite bullets to emphasise responsibilities matching the job offer
- Use the job offer's phrasing where it fits naturally (e.g. "microservices architecture")
- Quantify only where the master profile provides real numbers — never invent a metric
- Remove bullets irrelevant to this role
- Seniority language: senior/lead → "architected," "designed," "led"; mid → "built," "implemented," "developed"

### Projects
- Maximum 3–4 projects most relevant to the offer
- Include the flagship project only if its stack matches and status is honest (in development → say so)
- Per project: stack, role, 2–3 sentences tailored to the offer, one key outcome

### Education & certifications
- Include as-is from master profile
- Certifications section only if relevant to the job offer

### ATS optimisation
- All top-5 required keywords must appear naturally somewhere in the CV
- No keyword stuffing — each keyword in a meaningful sentence
- Prefer exact phrasing from the job offer (e.g. "unit testing" not just "testing")

---

## Step 5 — Write the Gaps Disclosure (separate file, for the user only)

Never merged into the CV file. This exists purely so the user knows exactly what was framed generously before they send anything.

Contents:
- Every 🟡 fill: the skill, the real adjacent experience it was built from, and the exact phrasing used in the CV
- Every ❌ gap: the skill, and that it was left out entirely
- ATS keyword confirmation (checkbox list — which keywords landed where)
- Recommended cover letter angle (1–2 sentences) — for the user's own use, no cover letter is generated by this agent

---

## Hard rules

1. **Scoped fill only** — a 🟡 fill must pass the adjacency test in Step 3. If it doesn't clearly pass, it's a ❌ gap, not a fill.
2. **No invented anecdotes, projects, or metrics** — a fill can reframe real experience more generously; it can never manufacture a project, employer, number, or story that isn't in the master profile.
3. **Every fill is logged** — no silent embellishment. If it's in the CV and wasn't a clean ✅, it's in the disclosure.
4. **Max 2 pages** — one page preferred for under ~10 years of experience; two pages acceptable for senior/lead roles or 10+ years. This is the standard convention — no need to override it.
5. **English only** unless the offer explicitly requires another language.
6. **No photos, age, nationality, or marital status.**
7. **Visa line stays** in the contact block, using the existing per-country label table:

   ```
   Visa: Requires sponsorship — eligible for [EU Blue Card / Highly Skilled Migrant / GTS / Tech Visa — pick per country]
   ```

   | Country code | Label |
   |---|---|
   | de | EU Blue Card |
   | nl | Highly Skilled Migrant permit |
   | ca | Global Talent Stream (GTS) |
   | ie | Critical Skills Employment Permit |
   | pt | Tech Visa / D3 Highly Qualified Activity Visa |

8. **Human review required before sending** — every generated CV starts at pipeline stage `draft`. The Gaps Disclosure must be read before submission; this agent does not decide what's safe to send, the user does.
9. **CV only** — no cover letter is generated by this agent.

---

## Output Template — CV

```
# [Full Name]
[Target Job Title — matched to job offer]

[Email] | [Phone/WhatsApp] | [LinkedIn] | [GitHub]
Location: Iran — open to relocation to [Country]
Visa: Requires sponsorship — eligible for [visa label per country]

---

## Summary

[3–4 sentences tailored to this job offer and company.]

---

## Skills

**Backend:** [ordered by relevance]
**Frontend:** [ordered by relevance]
**Databases:** [ordered by relevance]
**DevOps & Infrastructure:** [ordered by relevance]
**Testing & CI/CD:** [ordered by relevance]

---

## Experience

### [Job Title] — [Company] — Remote | [Start] – [End]
- [Most relevant bullet first]
- [Tailored bullet]
- [Tailored bullet]

### [Job Title] — Freelance — Remote | [Start] – Present
- [Tailored bullet]
- [Tailored bullet]

---

## Projects

### [Project Name] — [URL or "Private"]
*[Stack: technologies]*

[2–3 sentences: what it does, your role, one outcome — tailored to job offer]

---

## Education

**Associate Degree, Computer Engineering**
Yazd University — Yazd, Iran | 2019 – 2023

---

## Languages

Farsi (Native) · English (Fluent) · German (A1 — learning)

---

## Certifications & Courses

[Only if relevant to job offer]
```

---

## Output Template — Gaps Disclosure (separate file)

```
## Gaps Disclosure — [Job Title] at [Company]

**Date:** [YYYY-MM-DD]
**Offer file:** [path]
**CV file:** [path]

### Scoped Fills (🟡) — used in the CV

| Required Skill | Real Adjacent Experience (from profile) | Phrasing Used in CV |
|---|---|---|
| [Skill] | [what's actually verified] | [exact wording] |

### Genuine Gaps (❌) — left out of the CV entirely

| Required Skill | Note |
|---|---|
| [Skill] | Not in profile, no adjacent experience — left out |

### ATS Keywords Confirmed

- [ ] [Keyword 1] — [Summary / Skills / Experience / Projects]
- [ ] [Keyword 2] — [...]
- [ ] [Keyword 3] — [...]

### Recommended Cover Letter Angle

[1–2 sentences — main narrative for this role, for your own use.]

### Before you send

- [ ] Read every 🟡 fill above and confirm you're comfortable defending it if asked in an interview
- [ ] Role title and seniority fit the offer
- [ ] Visa / location / language statements accurate
```

---

## File output

Save the CV to:

```
phase2/documents/generated/CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.md
```

Save the disclosure alongside it, same slug, clearly separate file:

```
phase2/documents/generated/CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.gaps.md
```

**Naming rules:**
- `CompanySlug` — PascalCase, no spaces (e.g. `Check24`, `BrainRocket`)
- `JobTitleSlug` — PascalCase, condensed (e.g. `SeniorFullStackNodeReact`)
- `YYYY-MM-DD` — generation date

---

## Step 6 — Update application tracking

After saving both files:

1. Add or update a row in `phase2/applications/pipeline.md` with stage `draft`
2. Set **Generated CV** path in the job offer file under `## Application`
3. For high-value roles, copy `applications/_application-template.md` and link the pipeline ID

Do **not** set stage to `sent` — human review of the Gaps Disclosure comes first.

---

## Error handling

| Situation | Action |
|---|---|
| Offer file missing required fields | Extract from URL/description if possible; note gaps in Disclosure |
| Offer requires a skill marked Learning as **required** | Treat as ⚠️, not 🟡 — never claim proficiency for something the profile itself flags as still-learning |
| Master profile section empty | Omit section; do not invent |
| Company name ambiguous in filename | Use shortest unambiguous slug |
| A skill fails the adjacency test | Classify as ❌, not 🟡 — when genuinely unsure, default to ❌ |

---

## Downstream

1. User reads CV + Gaps Disclosure → renames or marks `reviewed` in pipeline
2. After send → update `applications/pipeline.md` stage to `sent`
3. Log rejection/interview feedback → `phase1/skills/gap-report.md` § From Phase 2 feedback
