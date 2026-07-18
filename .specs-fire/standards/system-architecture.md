# System Architecture

## Overview

jobHunter combines a Markdown-based job-search workflow (phases 0–3) with a local operator tool (`tools/job-collector`) that ingests job offers, structures them with an LLM, stores them in SQLite, and writes tailored CV drafts into the Phase 2 documents folder.

## System Context

Single-user personal system. The human operator drives research, review, and applications; agents/tools assist collection and drafting. No multi-tenant cloud deployment.

### Context Diagram

```
┌─────────────┐     scrape/manual      ┌──────────────────┐
│ Job boards  │ ─────────────────────► │  job-collector   │
│ LinkedIn/   │                        │  (Bun + Express  │
│ Indeed/...  │ ◄─── browser scripts ─ │   + React UI)    │
└─────────────┘                        └────────┬─────────┘
                                                │
                     LLM (Ollama/Anthropic) ◄───┤
                                                │
                     SQLite (data/jobs.db) ◄────┤
                                                │
                     repo Markdown  ◄───────────┘
                     (phase1/phase2/…)
```

### Users

- **Operator (Emad)**: Runs collectors, reviews parsed jobs, approves CVs, tracks applications
- **AI agents (Cursor / docs agents)**: Assist Phase 1 research and Phase 2 CV drafting under human review

### External Systems

- **LinkedIn / Indeed / careers pages**: Job sources
- **Ollama** (local) or **Anthropic API**: Parse offers and draft CVs
- **Playwright Chromium**: Browser automation for authenticated scrapers
- **Git repo filesystem**: Source of truth for profiles, offers, generated CVs, pipeline

## Architecture Pattern

**Pattern**: Modular monolith (local tool) + document-oriented workflow
**Rationale**: One operator, one machine; keep collector simple (Express + SQLite + React) while the career process lives as versioned Markdown.

## Component Architecture

### Components

#### Workflow docs (phases 0–3)

- **Purpose**: Capture research, profile, applications, skill gaps, metrics
- **Responsibilities**: Human-readable SSOT for career process; agent prompts in `docs/agents/`
- **Dependencies**: None (filesystem)

#### Collectors

- **Purpose**: Fetch raw job content from sources
- **Responsibilities**: LinkedIn/Indeed/manual collectors; registry of sources
- **Dependencies**: Playwright, Cheerio, queue

#### Pipeline

- **Purpose**: Transform raw offers into structured records and CV markdown
- **Responsibilities**: LLM parse, CV generation, write files into phase2 paths
- **Dependencies**: LLM client, repo file helpers, master profile

#### API server

- **Purpose**: Local control plane for jobs, settings, collect runs, Ollama health
- **Responsibilities**: REST routes, SQLite access, job queue, error mapping
- **Dependencies**: Express, bun:sqlite, pipeline, collectors

#### Frontend SPA

- **Purpose**: Operator dashboard for jobs, settings, CV preview, run controls
- **Responsibilities**: List/filter jobs, trigger collects, preview generated CVs
- **Dependencies**: React, Vite proxy to `/api`

### Component Diagram

```
frontend (Vite/React)
        │ HTTP /api
        ▼
server (Express) ──► queue ──► collectors
        │                │
        ├── db.js (SQLite)
        └── llm.js ──► Ollama / Anthropic
                │
                ▼
           pipeline (parse, cv, repoFiles)
                │
                ▼
        phase2/documents/generated/
```

## Data Flow

Offers enter via collectors or manual paste → optional LLM parse → SQLite job record → operator review → CV pipeline reads master profile + offer → markdown CV under `phase2/documents/generated/` → human review → application logged in `phase2/applications/`.

```
collect → parse(LLM) → store(SQLite) → review(UI) → generate CV → human approve → apply/track
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Bun | Server, package manager, SQLite |
| API | Express 5 | REST control plane |
| UI | React 18 + Vite 5 | Operator dashboard |
| DB | bun:sqlite | Local job/settings store |
| Scrape | Playwright + Cheerio | Source ingestion |
| LLM | Ollama / Anthropic | Parse + CV draft |
| Content | Markdown | Workflow SSOT |

## Non-Functional Requirements

### Performance

- **Collect concurrency**: Bounded via `p-queue` — avoid hammering job boards
- **UI**: Localhost only; sub-second API for list/detail is sufficient
- **LLM**: Soft latency; surface provider failures as 503 with clear codes

### Security

- Secrets only in `.env` / settings (never committed)
- Scrapers must not log session cookies
- CV and profile data stay local

### Scalability

Single-user local app — no horizontal scale. Prefer reliability and clear errors over throughput.

## Constraints

- Personal / non-commercial use of scrapers; respect site ToS and prefer manual flows when blocked
- Visa-sponsorship requirement shapes offer filtering and country priority
- AI output never sent without human review
- Master profile is factual SSOT — no invented experience

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Fast local DX; built-in SQLite |
| DB | SQLite file | Zero ops for single user |
| LLM default | Ollama | Local, low cost; Anthropic optional |
| Workflow storage | Markdown in git | Auditable career process |
| Autonomy (FIRE) | Balanced | Confirm on medium; validate on high |

---
*Generated by specs.md - fabriqa.ai FIRE Flow*
