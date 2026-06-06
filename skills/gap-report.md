# Skill gap report

**Last updated:** 2026-06-06  
**Based on:** [`skill-map.md`](skill-map.md) (self-assessment) — refresh after Phase 1 job-offer research per country.

## Strong (market-aligned)

Skills you already have — demonstrate clearly on CV and in the flagship project:

- JavaScript (ES6+), TypeScript, HTML/CSS
- React, Next.js, React Native
- Node.js, Express, REST API design, RBAC
- PostgreSQL, MongoDB
- Docker, Docker Compose, Nginx, Linux
- ESLint, Prettier, Git workflow, error handling

## Weak (present but below market bar)

Solidify through the flagship project and call out explicitly on CV:

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

## Missing (learn via flagship project)

High priority for typical backend / full-stack roles abroad:

| Skill | Priority | Notes |
|-------|----------|-------|
| NestJS | P1 | Main backend framework gap |
| GraphQL (server + Apollo client) | P1 | Very common in full-stack listings |
| Redis | P1 | Caching, queues, rate limits |
| Jest + Supertest + coverage | P1 | Expected at 7+ years |
| GitHub Actions (CI/CD) | P1 | Standard hiring signal |
| AWS (EC2, RDS, S3, IAM, CloudWatch) | P1 | Core cloud literacy |
| AWS Lambda + API Gateway | P2 | Serverless slice |
| ECR + CD deploy | P2 | Complete pipeline story |
| BullMQ / message queues | P2 | Async processing |
| Rate limiting | P2 | Production API hygiene |
| WebSockets | P3 | Bonus differentiator |
| Kubernetes / Minikube | P3 | Stretch only |

## PostgreSQL track 2 (background)

Continue alongside building — see [`skill-map.md`](skill-map.md) §10:

- Use The Index, Luke
- *The Art of PostgreSQL*
- PostgreSQL docs Ch. 13, 14, 25
- *Designing Data-Intensive Applications* (1 chapter/week)

## From Phase 2 feedback

<!-- Fill after applications and interviews -->

-

## Linked learning items

See [`../learning/backlog.md`](../learning/backlog.md).

After Phase 1 agent research, merge market frequency from [`requirements-summary.md`](requirements-summary.md) and reprioritize if job ads disagree with this list.
