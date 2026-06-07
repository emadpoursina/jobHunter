# Skill gap report

**Last updated:** 2026-06-06  
**Based on:** 40 job offers across Germany, Netherlands, Canada, Portugal + [`skill-map.md`](../../phase3/skill-map.md) self-assessment

Phase 1 research: [`checklist.md`](../checklist.md)  
Market frequency: [`requirements-summary.md`](requirements-summary.md)

---

## Strong (market-aligned)

Skills present in target job ads and on your profile — demonstrate clearly on CV and flagship project:

| Strength | Market demand (of 40 offers) | Your advantage |
|---|---|---|
| Node.js + React + TypeScript | 34–40/40 | Core stack — perfect match |
| Next.js | 20/40 | You have it; many candidates don't |
| PostgreSQL + MongoDB | 19–23/40 | Both covered — rare combination |
| Docker + Linux + Nginx | 22/40 | DevOps foundations solid |
| React Native | 11/40 | Differentiator for mobile-capable teams |
| REST API design | 28/40 | Direct match |
| Technical leadership | All markets | 4 years as Tech Lead — senior differentiator |
| English fluency | 35/40 | Required across all sampled countries |

---

## Critical gaps (high frequency + not on resume)

These appear in 20+ out of 40 offers. Highest priority before scaling applications.

| Skill | Frequency | Why critical |
|---|---|---|
| **AWS (EC2, S3, Lambda, IAM)** | 22/40 | Required in majority of offers, not just nice-to-have. Docker is a foundation but platform skills are expected separately. |
| **Unit & integration testing (Jest)** | 20/40 | Consistently required across all 4 countries. Absence on resume is a visible gap in interviews. |
| **CI/CD (GitHub Actions / GitLab CI)** | 20/40 | Required in half of all offers. Interviewers expect practical experience, not awareness. |

---

## Medium gaps (10–19/40 offers)

| Skill | Frequency | Notes |
|---|---|---|
| GraphQL | 15/40 | Mostly nice-to-have today, trending toward required |
| Redux / state management | 15/40 | Likely from React projects — add to resume if used |
| Microservices architecture | 17/40 | REST + Docker partially covers; reframe on CV |
| Authentication (JWT / OAuth2) | 13/40 | RBAC on Rousta TV partially covers — make explicit |
| Redis / caching | 12/40 | Not on resume; moderate effort to learn |

---

## Low priority gaps (<10/40 or nice-to-have only)

| Skill | Frequency | Notes |
|---|---|---|
| Kubernetes | 10/40 | Almost always nice-to-have; Docker covers most needs at your level |
| NestJS | 8/40 | Node.js + Express transfers well; 1–2 weeks to pick up |
| Elasticsearch | 8/40 | Niche enough to learn on the job |

---

## Weak (present but below market bar)

From [`skill-map.md`](skill-map.md) — solidify through flagship project:

| Skill | Gap | Action |
|-------|-----|--------|
| Redux / Zustand | Partial | Global state in flagship app |
| JWT auth | Partial | Access + refresh rotation in NestJS |
| OAuth2 | Partial | Google or GitHub login |
| Microservices | Partial | Split into 2–3 bounded services |
| PostgreSQL indexing & advanced SQL | Deepening | Indexes, CTEs, EXPLAIN ANALYZE |
| Prisma / TypeORM | Partial | Migrations in flagship project |
| Swagger / OpenAPI | Partial | NestJS Swagger module |
| Structured logging | Partial | Pino/Winston → CloudWatch |
| Environment config | Partial | Validated ConfigModule |
| System design diagram | Partial | Architecture doc for flagship |

---

## Recommended learning priority (market-validated)

```
Priority 1 — AWS core services         (22/40 gap)
Priority 2 — Testing with Jest           (20/40 gap)
Priority 3 — CI/CD with GitHub Actions   (20/40 gap)
Priority 4 — GraphQL                     (15/40 gap)
Priority 5 — Redis                       (12/40 gap)
Priority 6 — NestJS                      (8/40 gap)
```

See [`../../phase3/backlog.md`](../../phase3/backlog.md) for execution waves.

---

## Quick resume fixes (no learning required)

- [ ] Add **Redux / state management** if used in any React projects
- [ ] Add **JWT / authentication** — Rousta TV had role-based access control
- [ ] Reframe **Docker + Nginx + Linux** as **containerized deployments / microservices-ready architecture**
- [ ] Add **Agile / Scrum** — Tech Lead role almost certainly involved this
- [ ] Add **CI/CD** if any pipeline tools used informally (GitHub Actions, Bitbucket Pipelines)

---

## From Phase 2 feedback

<!-- Fill after applications and interviews -->

-

## Linked learning items

See [`../../phase3/backlog.md`](../../phase3/backlog.md).

After Ireland research (10 more offers), refresh [`requirements-summary.md`](requirements-summary.md) and reprioritize if needed.
