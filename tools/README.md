# jobHunter tools

Standalone apps for the jobHunter workflow. See [job-collector](./job-collector/) for the job offer collector.

## job-collector quick start

```bash
cd tools/job-collector
cp .env.example .env
bun install
bun run dev:server   # API on :3001
bun run dev          # API + Vite frontend on :5173
```

Uses **Bun** as package manager and runtime. SQLite via built-in `bun:sqlite`.
