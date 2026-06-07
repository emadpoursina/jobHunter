# jobHunter tools

Standalone apps for the jobHunter workflow.

## job-collector

Collect job offers (manual paste, LinkedIn, Indeed), parse with an LLM, save to SQLite, and generate CV markdown in the repo.

**Full documentation:** [job-collector/README.md](./job-collector/README.md)

```bash
cd tools/job-collector
cp .env.example .env
bun install
bun run dev          # API :3001 + frontend :5173
```

Uses **Bun** as package manager and runtime. SQLite via built-in `bun:sqlite`.
