# Prompt: CV from job offer

Run the [CV generator agent](../../docs/agents/cv-generator.md) with the inputs below.

---

## Invocation (Cursor / AI)

```
You are the CV Generator Agent for jobHunter.

Follow docs/agents/cv-generator.md exactly.

Inputs:
1. Master profile: phase2/profile/master-profile.md
2. Job offer: [PASTE OFFER FILE PATH, e.g. phase2/offers/by-country/de/offer-<company>-<role-slug>.md]

Produce:
1. Tailored CV only (nothing else in that file)
2. Gaps Disclosure (separate .gaps.md file)

Hard rules:
- Scoped fill only for adjacent missing skills (🟡) — log every fill
- No invented projects, metrics, or anecdotes
- Skills marked "Learning" in the profile are NOT proficient (⚠️, never 🟡)
- Save CV to phase2/documents/generated/CV_[Company]_[JobTitle]_[YYYY-MM-DD].md
- Save disclosure to phase2/documents/generated/CV_[Company]_[JobTitle]_[YYYY-MM-DD].gaps.md
- Update phase2/applications/pipeline.md with stage: draft
- Update the job offer file Application section with the generated CV path
```

---

## Before you run

1. Master profile is filled → [`../profile/master-profile.md`](../profile/master-profile.md)
2. Job offer file exists → copy [`../../offers/_offer-template.md`](../../offers/_offer-template.md) to `../../offers/by-country/<code>/offer-<company>-<role-slug>.md`
3. Paste full job description and fill Required / Nice-to-have skills tables

---

## After generation — human review (required)

Read the **Gaps Disclosure** first — every 🟡 fill and every ❌ gap.

- [ ] Every 🟡 fill is defensible in an interview
- [ ] Role title and seniority fit the offer
- [ ] Visa / location / language statements accurate
- [ ] No Learning skills presented as proficient
- [ ] Genuine gaps acceptable — proceed, strip fills, or skip this offer

Only move pipeline stage to `reviewed` → `sent` after you approve.

**Rule:** 100% human review before any CV is sent. Store only reviewed versions in [`generated/`](../generated/).

---

## Output naming

```
phase2/documents/generated/CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.md
phase2/documents/generated/CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.gaps.md
```

Examples:

- `CV_Check24_AgileFullStackNodeReact_2026-06-06.md`
- `CV_Check24_AgileFullStackNodeReact_2026-06-06.gaps.md`
