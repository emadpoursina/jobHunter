# Documents

| Path | Purpose |
|------|---------|
| [`prompts/cv-from-offer.md`](prompts/cv-from-offer.md) | Copy-paste invocation for the CV generator agent |
| [`prompts/project-to-profile.md`](prompts/project-to-profile.md) | Extract a project in its repo, then merge into master profile |
| [`generated/`](generated/) | Generated CVs, tailoring reports, project profile extractions |

## CV generation workflow

1. Fill or verify [`../profile/master-profile.md`](../profile/master-profile.md)
2. Create offer file from [`../offers/_offer-template.md`](../offers/_offer-template.md)
3. Run agent: [`docs/agents/cv-generator.md`](../../docs/agents/cv-generator.md)
4. Output saved to `generated/CV_<Company>_<JobTitle>_<Date>.md`
5. **Human review required** — check Tailoring Report → Risks & Gaps before send

**Rule:** 100% human review before any CV is sent. Only store reviewed versions in `generated/`.

## Output file naming

```
CV_<CompanySlug>_<JobTitleSlug>_<YYYY-MM-DD>.md
```

Each file contains the tailored CV **and** the tailoring report.
