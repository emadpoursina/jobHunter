# jobHunter — Automated Job Pipeline: Project Overview

## Purpose

This document is the entry point for Cursor. Read this first, then follow the
references to the other spec files before writing any code.

## What this project is

An automated job-hunting pipeline for a single user (Emad Poursina, Full-Stack
JavaScript Engineer seeking relocation to Germany). It:

1. Collects job offers from multiple sources (LinkedIn, Indeed, manual paste)
2. Parses and standardises each offer into a known schema
3. Generates a tailored CV in Markdown for each offer
4. Stores everything in SQLite and writes output files into the existing
   `jobHunter` repo folder structure

The user already has a working `jobHunter` repo with Markdown documents
(profile, agents, job offers, generated CVs). This backend must integrate with
that repo — reading from and writing to the same folders — without breaking the
existing file conventions.

## Document index

| File | What it covers |
|------|---------------|
| `00-overview.md` | This file — read first |
| `01-architecture.md` | Folder structure, layer responsibilities, data flow |
| `02-database.md` | SQLite schema, all tables, field types, constraints |
| `03-api.md` | Every Express route — method, path, request, response, errors |
| `04-collectors.md` | Collector plugin interface + LinkedIn, Indeed, Manual implementations |
| `05-pipeline.md` | Parser and CV generator modules — prompts, input/output contracts |
| `06-llm-router.md` | Unified LLM module — Ollama and Anthropic support |
| `07-frontend.md` | React/Vite frontend — pages, components, API calls |
| `08-repo-integration.md` | How the backend reads/writes the existing jobHunter repo files |
| `09-conventions.md` | Naming, error handling, logging, environment variables |
| `10-implementation-order.md` | Step-by-step build order for Cursor to follow |

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Developer already knows React |
| API | Node.js + Express 5 | Simple, no framework overhead, supports long-running jobs |
| Database | SQLite via `better-sqlite3` | Zero-config, single file, sufficient for one user |
| Scraping | Playwright (headless Chromium) | Handles JS-rendered job sites |
| LLM | Ollama (local) or Anthropic API | Configurable via env var |
| File I/O | Node.js `fs/promises` | Reads/writes repo Markdown files |
| Queue | In-process queue using `p-queue` | No Redis needed for single user |

## Non-goals

- Multi-user support
- Authentication / sessions
- Deployment to a remote server (runs locally only)
- Real-time scraping of sites that block bots aggressively (LinkedIn has rate
  limits — the collector uses conservative delays and falls back gracefully)

## Repo co-existence rule

The backend lives **inside** the existing `jobHunter` repo as new top-level
folders. It must never modify or delete existing Markdown files — only append
new ones. The existing folder structure from the repo README is preserved exactly.

## Environment

- Node.js >= 20
- Runs on macOS / Linux (the developer's machine)
- `.env` file at repo root for all secrets and config
- `npm run dev` starts both frontend (Vite on port 5173) and backend (Express
  on port 3001) via `concurrently`
