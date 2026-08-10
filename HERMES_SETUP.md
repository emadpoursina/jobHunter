# Hermes Agent + jobHunter — Docker Setup Guide

This guide walks you through setting up Hermes Agent (running in Docker) as a persistent assistant for your migration workflow.

---

## What You're Setting Up

- **Hermes Agent:** Autonomous AI agent running inside a Docker container
- **Persistent Memory:** Skills, sessions, memories live in `~/.hermes/jobhunter` on your host (survives container restarts)
- **Project Context:** Your jobHunter repo is bind-mounted into the container; Hermes reads AGENTS.md at session start
- **Zero Local Install:** Nothing runs on bare metal; all agent runtime is containerized
- **Isolation:** This agent's state is scoped to `~/.hermes/jobhunter/`, so you can run other Hermes agents later with their own subdirectories

---

## Prerequisites

1. **Docker Desktop** (Mac/Windows) or Docker daemon + Docker Compose (Linux)
   - Verify: `docker --version && docker compose version`
2. **Your jobHunter repo** cloned locally (e.g., `~/code/jobHunter`)
3. **API key** for at least one LLM provider:
   - Nous Portal (bundled with Hermes), OpenRouter, Anthropic, OpenAI, etc.

---

## Step 1: Prepare Folders

Create the Hermes home directory for this agent:

```bash
mkdir -p ~/.hermes/jobhunter
```

This folder will hold:
- `.env` — your API keys (created during setup)
- `config.yaml` — Hermes configuration
- `sessions/` — conversation history
- `memories/` — persistent memory store
- `skills/` — learned procedures
- `logs/` — runtime logs

Later, you can create other agents with their own directories (e.g., `~/.hermes/coding`, `~/.hermes/research`, etc.) — each completely isolated.

---

## Step 2: Place Files in Your jobHunter Repo

Copy the files I just created into your jobHunter repo:

```bash
# Copy docker-compose.yml to the repo root
cp docker-compose.yml ~/code/jobHunter/

# Copy AGENTS.md to the repo root (already there if you use existing structure)
cp AGENTS.md ~/code/jobHunter/
```

Check that your repo now has:
```
jobHunter/
├── docker-compose.yml      # Just added
├── AGENTS.md               # Just added (or updated)
├── README.md               # Existing
├── docs/
│   └── agents/
│       ├── job-offer-research.md
│       ├── cv-generator.md
│       └── ...
└── phase1/, phase2/, phase3/   # Existing phases
```

---

## Step 3: One-Time Setup Wizard

Run the interactive setup wizard to create `~/.hermes/jobhunter/.env` with your API key:

```bash
mkdir -p ~/.hermes/jobhunter

docker run -it --rm \
  -v ~/.hermes/jobhunter:/opt/data \
  nousresearch/hermes-agent setup
```

This will:
1. Prompt you for an LLM provider (Nous Portal, OpenAI, Anthropic, etc.)
2. Ask for your API key(s)
3. Write everything to `~/.hermes/jobhunter/.env` (on your host, not in any image)
4. Optionally set up a chat platform (Telegram, Discord, email, etc.) — skip for now if you just want CLI

**Only do this once per agent.** The setup wizard writes to your host filesystem, so it persists across container recreations. Later, you'll run this again with a different path (e.g., `~/.hermes/coding:/opt/data`) for each new agent.

---

## Step 4: Start the Container

Navigate to your jobHunter repo and bring up the Docker container:

```bash
cd ~/code/jobHunter

docker compose up -d
```

This will:
1. Pull the latest `nousresearch/hermes-agent` image (if not cached)
2. Start the container in the background with `restart: unless-stopped`
3. Mount `~/.hermes/jobhunter` (this agent's brain) and your repo (`/workspace/jobHunter`) into the container
4. Expose the gateway API on `localhost:8642` (optional; not needed for CLI)

Verify the container is running:

```bash
docker ps | grep hermes-jobhunter
```

You should see `hermes-jobhunter` running. Check logs:

```bash
docker compose logs -f
```

---

## Step 5: Open a Session Against Your Repo

Open an interactive Hermes chat session **scoped to your jobHunter folder** so it auto-discovers `AGENTS.md`:

```bash
docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes
```

This will:
1. Drop you into a Hermes CLI chat
2. Set the working directory to `/workspace/jobHunter` (your mounted repo)
3. Trigger Hermes to read `AGENTS.md` from the repo root at session start
4. Load per-phase `AGENTS.md` files as you navigate into `phase1/`, `phase2/`, `phase3/`

You should see a `>` prompt. Type a message:

```
> Hello, I'm starting my job migration search. What phases should I focus on first?
```

Hermes will respond with context from `AGENTS.md`. If you see that response, everything is wired correctly.

---

## Step 6: Create Per-Phase Context Files

For Hermes to auto-discover phase-specific guidance, create three small `AGENTS.md` files inside each phase folder. Use the templates from the root `AGENTS.md` (under "Per-Phase Context Files"):

**`phase1/AGENTS.md`:**
```markdown
# Phase 1 — Research & Skill Gap

When working in this folder, follow the spec at: `docs/agents/job-offer-research.md`

**Outputs go to:**
- `job-offers/by-country/<country-code>/research.md` — collected offers
- `skills/requirements-summary.md` — merged requirements
- `skills/gap-report.md` — your gaps vs. market

**Key recurring task:** Re-sample 10–15 live offers per priority country every 2 weeks.
```

**`phase2/AGENTS.md`:**
```markdown
# Phase 2 — Profile & Applications

When working in this folder, follow the spec at: `docs/agents/cv-generator.md`

**Key files:**
- `profile/master-profile.md` — single source of truth
- `offers/` — one `.md` file per JD (use `_offer-template.md` as template)
- `documents/generated/` — AI-generated CVs (100% human review before send)
- job-collector — live funnel status (`application_stage`: sent → screening → interview → offer/rejection)
- `applications/pipeline.md` — legacy; not maintained

**Before every send:** 100% human review of generated CV. No exceptions.
```

**`phase3/AGENTS.md`:**
```markdown
# Phase 3 — Close Skill Gaps

When working in this folder, follow the spec at: `docs/agents/project-profile-extractor.md`

**Key files:**
- `skill-map.md` — full curriculum
- `flagship-project.md` — one showcase project
- `backlog.md` — prioritized learning tasks

**Parallel with Phase 2:** Do NOT wait for all gaps to close before applying.
```

Commit these to git:

```bash
git add phase1/AGENTS.md phase2/AGENTS.md phase3/AGENTS.md
git commit -m "Add per-phase context files for Hermes Agent"
```

---

## Step 7 (Optional): Convert Automation Specs into Hermes Skills

Your `docs/agents/*.md` files are already written as automation specs. To make Hermes remember and reuse them as skills, start a Hermes session and ask:

```
> Create a skill from docs/agents/cv-generator.md

(Hermes will read the file, extract the procedure, and save it as a reusable skill)
```

Repeat for `job-offer-research.md` and `project-profile-extractor.md`. Once created, Hermes will recognize triggers like "generate a CV" and run the learned skill instead of re-reading the whole file.

Skills are stored in `~/.hermes/skills/` and persist across sessions.

---

## Step 8: Try a Command

From your Hermes CLI session (still running from Step 5), try:

```
> Read phase1/skills/gap-report.md and summarize the current skill gaps vs. market demand
```

Hermes will:
1. Navigate to the phase1 folder
2. Auto-discover and load `phase1/AGENTS.md` context
3. Read `gap-report.md`
4. Summarize findings with awareness of the Phase 1 workflow

If this works, Hermes is fully wired.

---

## Daily Workflow

### Applying to a New Role

```bash
# 1. Open a Hermes session
docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes

# Inside the Hermes CLI:
> I want to apply to [Company] for [Role]. Here's the JD:
> [paste job description]

# Hermes can:
# - Create phase2/offers/<Company>_<Role>_<Date>.md with the JD
# - Generate a tailored CV using the cv-generator spec
# - Output to phase2/documents/generated/
# - Update application_stage in job-collector (e.g. sent)
```

### Re-Sampling Live Offers (Every 2 Weeks)

```bash
# Inside Hermes CLI:
> Re-sample live offers for Germany and Canada using the job-offer-research spec

# Hermes will:
# - Search job boards for recent offers
# - Extract skills from each posting
# - Update phase1/job-offers/by-country/de/research.md and phase1/job-offers/by-country/ca/research.md
# - Summarize new market patterns
```

### Updating Master Profile

```bash
# Inside Hermes CLI:
> I just completed [Skill]. Update master-profile.md with evidence and proof

# Hermes will:
# - Read phase2/profile/master-profile.md
# - Add the skill with dates, proof links, projects
# - Update phase3/backlog.md to mark the task as done
```

---

## Monitoring & Maintenance

### Check Container Health

```bash
# Logs from the running container
docker compose logs -f

# Resource usage
docker stats hermes-jobhunter

# Verify volumes are mounted correctly
docker inspect hermes-jobhunter | grep -A 10 Mounts
```

### Upgrade Hermes

When a new version of Hermes Agent is released:

```bash
cd ~/code/jobHunter

docker compose pull
docker compose up -d
```

Your `~/.hermes` (memory, skills, sessions) and repo remain untouched. Configuration migrations happen automatically.

### Backup Your Memory

This agent's persistent state lives in `~/.hermes/jobhunter/`. Periodically back it up:

```bash
tar -czf ~/hermes-jobhunter-backup-$(date +%Y%m%d).tar.gz ~/.hermes/jobhunter
```

Your repo is already in git, so that's fine. (Later, you'll backup other agents the same way: `~/.hermes/coding`, `~/.hermes/research`, etc.)

### Pause or Stop Hermes

To stop the container (e.g., to free resources):

```bash
docker compose down
```

To pause and resume later:

```bash
docker compose stop    # Pause without destroying
docker compose start   # Resume
```

---

## Customization

### Change Resource Limits

Edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 6G    # Increase if you run browser tools
      cpus: "3.0"   # Increase if slow
```

Then:

```bash
docker compose up -d   # Re-create with new limits
```

### Mount Additional Folders

If you want Hermes to access other directories (e.g., a docs folder outside the repo):

```yaml
volumes:
  - ~/.hermes/jobhunter:/opt/data
  - ${PWD}:/workspace/jobHunter
  - ~/docs:/workspace/docs              # Additional mount
```

### Enable the Dashboard (Web UI)

To view Hermes's memory, sessions, and logs via a web interface:

```bash
# Edit docker-compose.yml to add:
environment:
  - HERMES_DASHBOARD=1

# Then:
docker compose up -d
```

Visit `http://localhost:9119` (may require auth depending on your config).

### Connect Telegram or Discord (Optional)

Hermes can listen on Telegram, Discord, Slack, etc., so you can send it tasks over chat while the container runs. See [Hermes messaging docs](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/) for setup.

---

## Troubleshooting

### "docker: command not found"

Install Docker Desktop or Docker Engine for your OS: https://docs.docker.com/get-docker/

### Container exits immediately

```bash
docker compose logs
```

Check for missing `.env` — run the setup wizard again (Step 3).

### "Permission denied" when accessing ~/.hermes/jobhunter

```bash
chmod -R 755 ~/.hermes/jobhunter
```

### Hermes says "Running inside Docker container -- no audio devices"

This is expected. Voice mode works, but you won't get local audio playback. Use Telegram/Discord integration if you want voice interaction.

### Hermes doesn't see AGENTS.md

Make sure you ran the session with the correct working directory:

```bash
docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes
                      ^^^^^^^^^^^^^^ this must be set
```

If it's not, Hermes loads context from `~/.hermes` instead of your repo.

---

## Next Steps

1. **Read `AGENTS.md`** in your jobHunter repo to understand the workflow
2. **Start a Hermes session** and ask about Phase 1 (research) to begin
3. **Create per-phase `AGENTS.md` files** so phase-specific guidance auto-loads
4. **Create skills** from `docs/agents/*.md` specs so Hermes remembers procedures
5. **Schedule recurring tasks** (optional; use `hermes cron` for weekly re-samples)

Good luck with your migration! 🎯

---

## See Also

- [Hermes Agent Documentation](https://hermes-agent.nousresearch.com/docs/)
- [Hermes Docker Guide](https://hermes-agent.nousresearch.com/docs/user-guide/docker)
- [jobHunter README.md](./README.md)
- [Project AGENTS.md](./AGENTS.md)
