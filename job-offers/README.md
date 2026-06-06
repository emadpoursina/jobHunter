# Job offers

Corpus for Phase 1 skill analysis and Phase 2 applications.

## Agent-assisted research

Use [`docs/agents/job-offer-research.md`](../docs/agents/job-offer-research.md) to collect **10–15 real offers per country**. The agent writes:

```
by-country/<country_code>/research.md
```

Then add individual offer files with [`_offer-template.md`](_offer-template.md) when you apply or need full detail. Example: [`by-country/de/offer-check24-agile-fullstack-nodejs-react.md`](by-country/de/offer-check24-agile-fullstack-nodejs-react.md).

## Generate a tailored CV

1. Create or fill an offer file under `by-country/<code>/`
2. Run [`docs/agents/cv-generator.md`](../docs/agents/cv-generator.md)
3. Output → `documents/generated/CV_<Company>_<JobTitle>_<Date>.md`

## Layout

```
by-country/
  de/
    research.md    # agent output — summary table + skills frequency
    offer-*.md     # optional per-offer files from _offer-template.md
  ca/
    ...
```

Create one subfolder per country under [`by-country/`](by-country/).

## Representative offer checklist

- [ ] Backend or full-stack (backend-heavy) title
- [ ] Matches your seniority band
- [ ] Posted within ~90 days
- [ ] Credible source (company site, LinkedIn, national board)
- [ ] Requirements block copied or linked
