# Job offers — research corpus (Phase 1)

Representative offers for **skill gap analysis** — not the live application files (those live in [`../../phase2/offers/`](../../phase2/offers/)).

## Agent-assisted research

Use [`docs/agents/job-offer-research.md`](../../docs/agents/job-offer-research.md) to collect **10–15 real offers per country**. The agent writes:

```
by-country/<country_code>/research.md
```

## Layout

```
by-country/
  de/
    research.md    # agent output — summary table + skills frequency
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

## Applying to a role

Copy a live offer into Phase 2: [`../../phase2/offers/_offer-template.md`](../../phase2/offers/_offer-template.md) → `../../phase2/offers/by-country/<code>/offer-*.md`, then run the [CV generator](../../docs/agents/cv-generator.md).
