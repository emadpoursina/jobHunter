# Complete skill map — flagship project reference

> **Emad Poursina** · Full-stack JavaScript engineer  
> **Purpose:** Design a flagship project that touches every skill below during development.

Every skill should appear in the project — architecture, codebase, infrastructure, or pipeline.

| Symbol | Meaning |
|--------|---------|
| ✅ | Have it — demonstrate properly in the project |
| ⚠️ | Partial — solidify and make explicit |
| ❌ | New — learn by building, not reading first |

---

## 1. Languages & core

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| JavaScript (ES6+) | ✅ | async/await, destructuring, modules |
| TypeScript | ✅ | Strict mode; type DTOs, API responses, DB models |
| HTML / CSS | ✅ | Semantic HTML, responsive layout |

---

## 2. Frontend

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| React | ✅ | Functional components, hooks |
| Next.js | ✅ | App Router, SSR, SSG, API routes, middleware |
| Redux / state management | ⚠️ | Redux Toolkit or Zustand for auth / session |
| GraphQL (client) | ❌ | Apollo Client against your GraphQL API |
| React Native | ✅ | Optional mobile companion app |

---

## 3. Backend

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| Node.js | ✅ | Runtime for backend services |
| Express | ✅ | Baseline or comparison service |
| NestJS | ❌ | Main backend — modules, controllers, providers, guards |
| REST API design | ✅ | Clean endpoints, status codes, `/api/v1/` versioning |
| GraphQL (server) | ❌ | NestJS + Apollo Server (schema-first or code-first) |
| Authentication — JWT | ⚠️ | Access + refresh token rotation |
| Authentication — OAuth2 | ⚠️ | Google or GitHub via Passport.js |
| Role-based access control | ✅ | NestJS guards + roles decorator |
| Microservices | ⚠️ | 2–3 services (auth, API, notifications) via REST or queue |
| WebSockets / real-time | ❌ | Live notifications via Socket.io or NestJS gateways |

---

## 4. Databases

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| PostgreSQL | ✅ | Main DB — indexes, transactions, joins, views |
| PostgreSQL — indexing | ⚠️ | Use The Index, Luke; measure query performance |
| PostgreSQL — advanced queries | ⚠️ | Window functions, CTEs, EXPLAIN ANALYZE, pooling |
| MongoDB | ✅ | Polyglot persistence (logs, activity feed, content) |
| Redis | ❌ | Sessions, rate limiting, Bull/BullMQ queues, pub/sub |
| ORM / query builder | ⚠️ | Prisma or TypeORM; understand migrations |

---

## 5. DevOps & infrastructure

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| Docker | ✅ | Dockerfile per service |
| Docker Compose | ✅ | Local stack: app + postgres + redis + mongo |
| Nginx | ✅ | Reverse proxy and static files |
| Linux | ✅ | EC2, shell scripts |
| AWS — EC2 | ❌ | Deploy backend services |
| AWS — S3 | ❌ | Uploads, static assets, Next.js output |
| AWS — RDS | ❌ | Production PostgreSQL |
| AWS — Lambda | ❌ | Serverless trigger (e.g. image resize, email) |
| AWS — API Gateway | ❌ | Front Lambda |
| AWS — IAM | ❌ | Least-privilege roles and policies |
| AWS — CloudWatch | ❌ | Logging and basic monitoring |
| Kubernetes | ❌ | Stretch: Minikube deploy |

---

## 6. Testing

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| Jest — unit | ❌ | Service layer and utilities |
| Jest — integration | ❌ | Supertest + Jest for API endpoints |
| Jest — mocking | ❌ | Mock DB, external APIs, Redis |
| Test coverage | ❌ | `jest --coverage`, aim 70%+ backend |
| React Testing Library | ❌ | Key component tests (bonus) |

---

## 7. CI/CD & automation

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| GitHub Actions | ❌ | Main CI/CD platform |
| CI pipeline | ❌ | Push: lint → TypeScript → Jest |
| CD pipeline | ❌ | Merge main: build → ECR → deploy EC2/Lambda |
| Environment secrets | ❌ | AWS keys, DB creds, JWT in GitHub Secrets |
| Docker image registry | ❌ | Push to AWS ECR |

---

## 8. Architecture & system design

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| Microservices architecture | ⚠️ | 2–3 services with clear boundaries |
| API design (REST + GraphQL) | ✅ | Both in same project |
| System architecture diagram | ⚠️ | draw.io or Excalidraw |
| Message queues (BullMQ) | ❌ | Async jobs (e.g. welcome email) |
| Rate limiting | ❌ | Redis or NestJS middleware |
| Environment config | ⚠️ | NestJS ConfigModule or validated dotenv |

---

## 9. Code quality & practices

| Skill | Status | How to use in project |
|-------|--------|------------------------|
| ESLint + Prettier | ✅ | Strict rules from day one |
| Git branching strategy | ✅ | Feature branches, PRs, conventional commits |
| Code reviews (self) | ✅ | Serious PR descriptions and diffs |
| API documentation | ⚠️ | Swagger / OpenAPI (NestJS built-in) |
| Error handling | ✅ | Central NestJS error handler, typed responses |
| Logging | ⚠️ | Winston or Pino → CloudWatch |

---

## 10. PostgreSQL deep dive (background pace)

| Topic | Status | Resource |
|-------|--------|----------|
| Indexing & query optimization | ⚠️ | [Use The Index, Luke](https://use-the-index-luke.com/) |
| Advanced SQL (window functions, CTEs) | ⚠️ | *The Art of PostgreSQL* |
| Transactions & concurrency (Ch. 13) | ⚠️ | PostgreSQL docs |
| Performance & query planning (Ch. 14) | ⚠️ | PostgreSQL docs |
| Backup & recovery (Ch. 25) | ⚠️ | PostgreSQL docs |
| Distributed systems theory | ⚠️ | *Designing Data-Intensive Applications* (1 ch/week) |

---

## Skills by project layer

| Layer | Skills covered |
|-------|----------------|
| **Frontend (Next.js)** | Next.js, React, TypeScript, Redux/Zustand, Apollo, RTL |
| **Backend (NestJS)** | NestJS, REST, GraphQL, JWT, OAuth2, RBAC, WebSockets, rate limiting, Swagger |
| **Database** | PostgreSQL (advanced), MongoDB, Redis, Prisma/TypeORM, migrations |
| **Infra (local)** | Docker, Compose, Nginx |
| **Infra (cloud)** | EC2, RDS, S3, Lambda, API Gateway, IAM, CloudWatch, ECR |
| **Testing** | Jest, Supertest, coverage |
| **Pipeline** | GitHub Actions CI/CD, deploy to AWS |
| **Architecture** | Microservices, BullMQ, system diagram |

Linked from [`backlog.md`](backlog.md) and [`../phase1/skills/gap-report.md`](../phase1/skills/gap-report.md).
