# Agent: Job offer research

## Purpose

Research and collect **10–15 real job offers** for a given country, tailored to the candidate in [`profile/master-profile.md`](../../profile/master-profile.md). Output is a structured research file ready for [`skills/requirements-summary.md`](../../skills/requirements-summary.md) and [`skills/gap-report.md`](../../skills/gap-report.md).

**Rules:** Do not invent job offers. Only use real, verifiable postings. Skip expired listings.

---

## Input

```
country: <country name>
country_code: <iso-style slug, e.g. de, ca>
```

Example:

```
country: Germany
country_code: de
```

---

## Step 1 — Read candidate profile

Load [`profile/master-profile.md`](../../profile/master-profile.md) and use:

- Target role and seniority
- Core skills
- Passport / work authorization — **visa sponsorship is a hard requirement** when the profile says so
- Search title variants that match backend / full-stack focus

---

## Step 2 — Identify job boards

Look up the top boards for the given country. Always include **LinkedIn**. Add 2–3 local boards.

Example for Germany: LinkedIn, StepStone.de, Indeed.de, Xing.de

Prefer: company careers pages, LinkedIn, reputable national boards. Avoid aggregator spam.

---

## Step 3 — Define search queries

Run searches using job titles aligned with the master profile (one query at a time). Example set for a full-stack JS profile:

- Full-Stack JavaScript Developer
- Full-Stack Engineer React Node.js
- Node.js Backend Developer
- Next.js Developer
- SaaS Engineer TypeScript

**Filters:**

| Filter | Value |
|--------|--------|
| Location | Given country |
| Experience | Mid to senior (match profile band, e.g. 3–8 years or 7+) |
| Posted | Prefer last **30 days**; accept up to **90 days** if needed to reach 10–15 offers |

---

## Step 4 — Collect 10–15 job offers

For each offer, extract:

| Field | Description |
|-------|-------------|
| `job_title` | Exact title as listed |
| `company` | Company name |
| `location` | City and country |
| `required_skills` | Hard skills explicitly required |
| `nice_to_have_skills` | Preferred / bonus skills |
| `years_of_experience` | Minimum years requested |
| `visa_sponsorship` | Yes / No / Not Mentioned |
| `salary_range` | If listed, in local currency; else `Not Listed` |
| `source_url` | Direct link to the posting |

**Collection rules:**

- Collect **10–15 offers** (minimum 10 before finishing)
- **One offer per company** — no duplicate companies
- Prefer offers that mention visa sponsorship explicitly
- **Skip** offers that say "no visa sponsorship", "EU citizens only", or equivalent exclusions
- If one board yields too few results, continue on the next board
- Match **backend / full-stack** role family; skip unrelated titles

---

## Step 5 — Write output

Save to:

```
job-offers/by-country/<country_code>/research.md
```

Example: `job-offers/by-country/de/research.md`

Use this structure:

```markdown
# Job offer research — {Country}

- **Country code:** {country_code}
- **Research date:** {YYYY-MM-DD}
- **Offers collected:** {N}
- **Profile:** profile/master-profile.md

## Job offers

| # | Job Title | Company | Location | Visa Sponsorship | Salary | URL |
|---|-----------|---------|----------|------------------|--------|-----|
| 1 | ... | ... | ... | ... | ... | ... |

## Skills frequency

| Skill | Times Mentioned | Required / Nice-to-Have |
|-------|-----------------|-------------------------|
| TypeScript | 9 | Required |

Sort by times mentioned, descending.

## Visa sponsorship summary

Short paragraph:

- How many explicitly offer sponsorship
- How many did not mention it
- How many explicitly excluded it (confirm those were skipped, not included)

## Notes

Boards used, boards failed, or why fewer than 10 offers were found.
```

After saving, the human (or a follow-up step) may copy high-value offers into individual files using [`job-offers/_offer-template.md`](../../job-offers/_offer-template.md) under the same `by-country/<country_code>/` folder.

---

## Error handling

| Situation | Action |
|-----------|--------|
| Fewer than 10 offers found | Save what was found; explain why in **Notes** |
| Job board unavailable | Skip, try next board, log failure in **Notes** |
| Salary not listed | `Not Listed` |
| Visa sponsorship unclear | `Not Mentioned` — do not treat as Yes |
| Posting expired | Skip and find a replacement |

---

## Downstream

1. Merge skills into [`skills/requirements-summary.md`](../../skills/requirements-summary.md)
2. Compare against master profile → update [`skills/gap-report.md`](../../skills/gap-report.md)
3. For applications, use [`documents/prompts/cv-from-offer.md`](../../documents/prompts/cv-from-offer.md)

Run this agent **once per priority country**, independently.
