# Flagship project

One portfolio system that closes the gaps in [`../skills/skill-map.md`](../skills/skill-map.md) by building, not course-hopping.

## Status

| Field | Value |
|-------|--------|
| **Name** | <!-- e.g. SaaS dashboard, devtool, marketplace --> |
| **Repo** | |
| **Started** | |
| **Public demo** | |

## Scope by layer

Use the **Skills by project layer** table in the skill map. Minimum viable flagship should cover:

1. **Next.js frontend** — auth UI, Apollo Client, Zustand/Redux
2. **NestJS backend** — REST + GraphQL, JWT/OAuth2, RBAC, Swagger
3. **Data** — PostgreSQL (Prisma), MongoDB for one bounded use case, Redis
4. **Local infra** — Docker Compose (app, postgres, redis, mongo), Nginx
5. **Tests** — Jest unit + Supertest integration, 70%+ backend coverage
6. **AWS** — RDS, EC2 or Lambda, S3, IAM, CloudWatch
7. **CI/CD** — GitHub Actions → ECR → deploy

## Architecture diagram

<!-- Link to diagram file or embed path once created -->

## Progress checklist

Track against [`backlog.md`](backlog.md). Mark waves complete as layers ship.

- [ ] Wave 1 — NestJS + Prisma + auth
- [ ] Wave 2 — GraphQL + Redis + queues
- [ ] Wave 3 — Jest + coverage
- [ ] Wave 4 — AWS deploy
- [ ] Wave 5 — CI/CD + microservices split + diagram
