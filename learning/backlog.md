# Learning backlog

Prioritized from [`../skills/skill-map.md`](../skills/skill-map.md). Primary vehicle: **one flagship project** that covers all layers (see skill map).

**Status:** `todo` | `doing` | `done` | `dropped`

When `done`, add evidence to [`../profile/master-profile.md`](../profile/master-profile.md) and [`../skills/gap-report.md`](../skills/gap-report.md).

---

## Wave 1 — Foundation (backend core)

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | NestJS | skill-map ❌ | Main API service with modules, guards, providers | todo | |
| P1 | Prisma + PostgreSQL migrations | skill-map ⚠️ | ORM for main relational data | todo | |
| P1 | JWT + refresh tokens | skill-map ⚠️ | Full auth flow in NestJS | todo | |
| P1 | OAuth2 (Google or GitHub) | skill-map ⚠️ | Passport strategy | todo | |
| P1 | Swagger / OpenAPI | skill-map ⚠️ | Document REST endpoints | todo | |

---

## Wave 2 — Full-stack breadth

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | GraphQL server (NestJS + Apollo) | skill-map ❌ | Schema + resolvers alongside REST | todo | |
| P1 | Apollo Client (Next.js) | skill-map ❌ | Frontend queries against GraphQL | todo | |
| P1 | Redis | skill-map ❌ | Sessions, cache, or rate-limit store | todo | |
| P2 | Redux Toolkit or Zustand | skill-map ⚠️ | Auth/session state in Next.js | todo | |
| P2 | BullMQ + Redis | skill-map ❌ | Async job (e.g. post-registration email) | todo | |
| P2 | Rate limiting | skill-map ❌ | Middleware + Redis | todo | |
| P3 | WebSockets / NestJS gateways | skill-map ❌ | Live notifications feature | todo | |

---

## Wave 3 — Testing & quality

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | Jest unit tests | skill-map ❌ | Service layer coverage | todo | |
| P1 | Jest + Supertest integration | skill-map ❌ | API endpoint tests | todo | |
| P1 | Mocking (DB, Redis, APIs) | skill-map ❌ | Isolated unit tests | todo | |
| P1 | Coverage ≥ 70% backend | skill-map ❌ | `jest --coverage` in CI | todo | |
| P3 | React Testing Library | skill-map ❌ | Key Next.js components | todo | |

---

## Wave 4 — AWS & deployment

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | AWS IAM (least privilege) | skill-map ❌ | Roles for EC2, RDS, S3, Lambda | todo | |
| P1 | AWS RDS (PostgreSQL) | skill-map ❌ | Production DB | todo | |
| P1 | AWS EC2 | skill-map ❌ | Deploy NestJS service(s) | todo | |
| P1 | AWS S3 | skill-map ❌ | File uploads or static assets | todo | |
| P1 | CloudWatch logging | skill-map ❌ | Pino/Winston → CloudWatch | todo | |
| P2 | Lambda + API Gateway | skill-map ❌ | One serverless function | todo | |
| P2 | ECR + deploy | skill-map ❌ | Container registry + EC2 pull | todo | |

---

## Wave 5 — CI/CD & architecture

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | GitHub Actions CI | skill-map ❌ | Lint → tsc → Jest on push | todo | |
| P1 | GitHub Actions CD | skill-map ❌ | Build image → ECR → deploy on main | todo | |
| P1 | GitHub Secrets | skill-map ❌ | AWS + DB + JWT secrets | todo | |
| P2 | Microservices split | skill-map ⚠️ | Auth + API + notification services | todo | |
| P2 | System architecture diagram | skill-map ⚠️ | draw.io / Excalidraw in repo | todo | |
| P3 | Kubernetes / Minikube | skill-map ❌ | Stretch deploy | todo | |

---

## Track 2 — PostgreSQL (background pace)

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P2 | Indexing & query optimization | skill-map ⚠️ | Use The Index, Luke + indexes in project | todo | |
| P2 | Window functions & CTEs | skill-map ⚠️ | *The Art of PostgreSQL* exercises | todo | |
| P3 | DDIA reading | skill-map ⚠️ | 1 chapter/week | todo | |

---

## From Phase 1 / Phase 2

Market-validated from 40 offers (DE, NL, CA, PT) — see [`../skills/gap-report.md`](../skills/gap-report.md):

| Priority | Skill / topic | Source | Action | Status | Evidence link |
|----------|---------------|--------|--------|--------|---------------|
| P1 | AWS core (EC2, S3, Lambda, IAM) | Phase 1 — 22/40 offers | Wave 4 flagship deploy | todo | |
| P1 | Jest unit + integration tests | Phase 1 — 20/40 offers | Wave 3 coverage in CI | todo | |
| P1 | GitHub Actions CI/CD | Phase 1 — 20/40 offers | Wave 5 pipeline | todo | |
| P2 | GraphQL | Phase 1 — 15/40 offers | Wave 2 Apollo stack | todo | |
| P2 | Redis | Phase 1 — 12/40 offers | Wave 2 cache/sessions | todo | |
