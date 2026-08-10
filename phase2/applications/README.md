# Applications

**Canonical tracker:** [job-collector](../../tools/job-collector/) — application funnel lives on each job as `application_stage` in SQLite (`not_started` → `draft` → `reviewed` → `sent` → `screening` → `interview` → `offer` / `rejected` / `withdrawn`).

[`pipeline.md`](pipeline.md) is **legacy / not maintained**. There is no auto-sync from the DB; do not treat it as the live system.

Copy [`_application-template.md`](_application-template.md) for detailed notes on high-value opportunities when useful.

**Generate CV:** [`docs/agents/cv-generator.md`](../../docs/agents/cv-generator.md) → output in `../documents/generated/`. Human review required before send.

Feed rejection and interview feedback into [`../../phase1/skills/gap-report.md`](../../phase1/skills/gap-report.md).
