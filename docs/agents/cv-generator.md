# Agent: CV generator

## Purpose

Takes a filled **master profile** and a structured **job offer file**, then produces:

1. A **tailored CV** in Markdown
2. A **tailoring report** explaining every decision (skills matched, gaps, ATS keywords, risks)

**Rules:** Never fabricate skills or experience. If a skill is marked **Learning** in the master profile, do not present it as proficient.

Full specification source: [`../../raw/Agent_CV_Generator.md`](../../raw/Agent_CV_Generator.md)

---

## Input

```
offer_file: <path to job offer markdown>
```

Example:

```
offer_file: job-offers/by-country/de/offer-check24-fullstack-nodejs-react.md
```

Always load the master profile from:

```
profile/master-profile.md
```

Optional overrides:

```
country_code: de          # for visa line (Blue Card, HSM, GTS, etc.)
review_only: false        # if true, do not write file — output in chat only
```

---

## Step 1 — Read inputs

Load [`profile/master-profile.md`](../../profile/master-profile.md) in full. Use only facts present there.

Load the job offer file (create from [`job-offers/_offer-template.md`](../../job-offers/_offer-template.md) if missing). Extract:

- Top 5 **required** skills
- Top 3 **nice-to-have** skills
- Seniority level (junior / mid / senior / lead)
- Primary focus (backend-heavy / full-stack / frontend-leaning)
- Company tone (startup casual / enterprise formal / scale-up balanced)
- ATS keywords — exact phrases from the posting

If the offer file lacks a skills table, extract skills from the job description before writing the CV.

---

## Step 2 — Map profile to job offer

For each top-5 required skill, classify against the master profile:

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Candidate has it | Include prominently in Skills, Experience, or Projects |
| ⚠️ | Partial / Learning | Honest framing only; Learning skills → "currently deepening" if nice-to-have |
| ❌ | Not in profile | Do not include; note in Tailoring Report |

Flag any **critical required skill** that is missing. Note it under Risks & Gaps.

---

## Step 3 — Write the tailored CV

Follow the output format in **Output Template — CV** below.

### Summary

- 3–4 sentences maximum
- Mirror the job offer's language and primary tech stack in the first sentence where the candidate has it
- End with what the candidate brings to this specific role

### Skills

- Only skills relevant to this job offer
- Order by relevance — most important first
- Group: Backend / Frontend / Databases / DevOps & Infrastructure / Testing & CI/CD / Other
- Omit irrelevant skills unless they add clear value

### Experience

- Rewrite bullets to emphasise responsibilities matching the job offer
- Use the job offer's phrasing where it fits naturally (e.g. "microservices architecture")
- Quantify only where the master profile provides numbers
- Remove bullets irrelevant to this role
- Seniority language: senior/lead → "architected", "designed", "led"; mid → "built", "implemented", "developed"

### Projects

- Select **maximum 3–4** projects most relevant to the offer
- Include the flagship project only if its stack matches and status is honest (in development → say so)
- Per project: stack, role, 2–3 sentences tailored to the offer, one key outcome

### Education & certifications

- Include as-is from master profile
- Certifications section only if relevant to the job offer

---

## Step 4 — ATS optimisation

- All top-5 required keywords must appear naturally in the CV
- No keyword stuffing — each keyword in a meaningful sentence
- Prefer exact phrasing from the job offer (e.g. "unit testing" not just "testing")

---

## Step 5 — Write the tailoring report

Append immediately after the CV using **Output Template — Tailoring Report** below.

Include:

- Skills matched table (✅ / ⚠️ / ❌)
- Projects selected and why
- ATS keywords confirmed (checkbox list)
- Risks & gaps (honest list of missing required skills)
- Recommended cover letter angle (1–2 sentences)

---

## Hard rules

1. **Never fabricate** — Learning skills are not proficient.
2. **Max 2 pages** — one page preferred; two acceptable for senior/lead.
3. **English only** unless the offer explicitly requires another language.
4. **No photos** — no age, nationality, or marital status.
5. **Visa line** — always in contact block:

   ```
   Visa: Requires sponsorship — eligible for [EU Blue Card / Highly Skilled Migrant / GTS / Tech Visa — pick per country]
   ```

   Country → visa label:

   | Country code | Label |
   |--------------|-------|
   | de | EU Blue Card |
   | nl | Highly Skilled Migrant permit |
   | ca | Global Talent Stream (GTS) |
   | ie | Critical Skills Employment Permit |
   | pt | Tech Visa / D3 Highly Qualified Activity Visa |

6. **Human review required** — mark output stage as `draft` until reviewed (see [`documents/README.md`](../../documents/README.md)).

---

## Step 6 — Write output file

Save to:

```
documents/generated/CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.md
```

**Naming rules:**

- `CompanySlug` — PascalCase, no spaces (e.g. `Check24`, `BrainRocket`)
- `JobTitleSlug` — PascalCase, condensed (e.g. `SeniorFullStackNodeReact`)
- `YYYY-MM-DD` — generation date

Examples:

```
documents/generated/CV_Check24_AgileFullStackNodeReact_2026-06-06.md
documents/generated/CV_LemonOne_FullStackNodeReactServerless_2026-06-06.md
```

The file must contain **both** the CV and the Tailoring Report (separated by `---`).

---

## Step 7 — Update application tracking

After saving the CV:

1. Add or update a row in [`applications/pipeline.md`](../../applications/pipeline.md) with stage `draft`
2. Set **Generated CV** path in the job offer file under `## Application`
3. For high-value roles, copy [`applications/_application-template.md`](../../applications/_application-template.md) and link pipeline ID

Do **not** set stage to `sent` — human review first.

---

## Output Template — CV

```markdown
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

## Output Template — Tailoring Report

Append after the CV:

```markdown
---

## Tailoring Report

**Job:** [Job Title] at [Company]
**Date:** [YYYY-MM-DD]
**Offer file:** [path]
**Profile:** profile/master-profile.md

### Skills Matched

| Required Skill | In Profile? | Where Used in CV |
|----------------|-------------|------------------|
| [Skill] | ✅ Yes | Skills + [Project/Role] |
| [Skill] | ⚠️ Partial | [exact wording used] |
| [Skill] | ❌ Missing | Not included |

### Projects Selected

| Project | Reason Selected |
|---------|-----------------|
| [Name] | [Why relevant] |

### ATS Keywords Confirmed

- [ ] [Keyword 1] — [Summary / Skills / Experience / Projects]
- [ ] [Keyword 2] — [...]
- [ ] [Keyword 3] — [...]
- [ ] [Keyword 4] — [...]
- [ ] [Keyword 5] — [...]

### Risks & Gaps

[Honest list of missing required skills and application risk.]

### Recommended Cover Letter Angle

[1–2 sentences — main narrative for this role.]

### Human review checklist

- [ ] Every claim exists in master profile
- [ ] Role title and seniority fit the offer
- [ ] Visa / location / language statements accurate
- [ ] No Learning skills presented as proficient
- [ ] Risks & Gaps reviewed — still worth applying?
```

---

## Error handling

| Situation | Action |
|-----------|--------|
| Offer file missing required fields | Extract from URL/description if possible; note gaps in Tailoring Report |
| Offer requires skill marked Learning as **required** | Include in Risks & Gaps; do not claim proficiency |
| Master profile section empty | Omit section; do not invent |
| Company name ambiguous in filename | Use shortest unambiguous slug |

---

## Downstream

1. Human reviews CV + Tailoring Report → rename or note `reviewed` in pipeline
2. After send → update [`applications/pipeline.md`](../../applications/pipeline.md) stage to `sent`
3. Log rejection/interview feedback → [`skills/gap-report.md`](../../skills/gap-report.md) § From Phase 2 feedback

**Manual prompt (copy-paste):** [`documents/prompts/cv-from-offer.md`](../../documents/prompts/cv-from-offer.md)
