# Application pipeline (legacy)

> **Legacy / not maintained.** Live application funnel state lives in job-collector (`application_stage` on jobs in SQLite). This file is not synced from the DB and should not be used as the canonical tracker.

| ID | Date sent | Country | Company | Role | Source | Referral? | Stage | Next step | Feedback |
|----|-----------|---------|---------|------|--------|-----------|-------|-----------|----------|
| | | | | | cold / referral | | sent | | |

**Historical stages (reference only):** `draft` → `reviewed` → `sent` → `response` → `screening` → `interview` → `offer` / `rejected` / `withdrawn`
