# Hermes Agent + jobHunter — Quick Reference

Copy and paste these commands as needed.

---

## Startup & Teardown

### First Time Only: Setup Wizard

```bash
mkdir -p ~/.hermes/jobhunter
docker run -it --rm -v ~/.hermes/jobhunter:/opt/data nousresearch/hermes-agent setup
```

### Start the Container (Every Session)

```bash
cd ~/code/jobHunter
docker compose up -d
```

### Open a Hermes CLI Session

```bash
docker exec -it -w /workspace/jobHunter hermes /opt/hermes/.venv/bin/hermes
```

### Stop the Container

```bash
cd ~/code/jobHunter
docker compose down
```

### View Logs

```bash
docker compose logs -f
```

---

## Inside Hermes CLI Sessions

These are commands you type after opening a Hermes session (see "Open a Hermes CLI Session" above).

### Ask About Your Status

```
> What's in my current application pipeline? Read phase2/applications/pipeline.md and summarize.

> What skill gaps does the market want? Read phase1/skills/gap-report.md and analyze.

> What's my current learning backlog? Read phase3/backlog.md and prioritize by market demand.
```

### Apply to a New Role

```
> Create phase2/offers/[Company]_[Role]_$(date +%Y-%m-%d).md and paste this job posting into it:
> [paste JD here]

> Generate a tailored CV for [Company]_[Role] using the cv-generator spec from docs/agents/cv-generator.md

> Review the generated CV and let me know if anything looks wrong.
```

### Re-Sample Job Market (Every 2 Weeks)

```
> Re-sample live job offers for Germany and Canada using docs/agents/job-offer-research.md. 
> Update phase1/job-offers/by-country/ with the new offers.
> Summarize any new skill patterns.
```

### Update Master Profile

```
> I just completed [Skill/Course/Project]. 
> Update phase2/profile/master-profile.md with evidence and links.
> Mark the task as done in phase3/backlog.md.
```

### Log Interview Feedback

```
> I had an interview at [Company]. Here's the feedback:
> [paste feedback]
> Log this in phase2/applications/feedback.md and suggest Phase 3 backlog updates.
```

### Create a Skill from a Spec

```
> Create a skill from docs/agents/cv-generator.md

> Create a skill from docs/agents/job-offer-research.md
```

(After this, you can just say "generate a CV" and Hermes will remember the procedure.)

---

## Container Management

### Check if Hermes is Running

```bash
docker ps | grep hermes
```

### Restart the Container

```bash
docker compose restart
```

### Remove the Container (Keeps ~/.hermes/jobhunter & Repo)

```bash
docker compose down
docker compose up -d
```

### See Resource Usage

```bash
docker stats hermes
```

### SSH into the Container (Debugging)

```bash
docker exec -it hermes bash
```

---

## Updating Hermes

### Pull the Latest Image

```bash
docker compose pull
docker compose up -d
```

Your `~/.hermes/jobhunter` and repo are safe. Config migrations happen automatically.

---

## Backup & Restore

### Backup Hermes Memory

```bash
tar -czf ~/hermes-jobhunter-backup-$(date +%Y%m%d).tar.gz ~/.hermes/jobhunter
```

### Restore from Backup

```bash
tar -xzf ~/hermes-jobhunter-backup-YYYYMMDD.tar.gz -C ~/
docker compose restart
```

---

## Dashboard (Optional)

### Enable the Dashboard

Edit `docker-compose.yml`:

```yaml
environment:
  - HERMES_DASHBOARD=1
```

Then:

```bash
docker compose up -d
```

### Access the Dashboard

Visit `http://localhost:9119` in your browser.

---

## Troubleshooting

### Container Won't Start

```bash
docker compose logs
```

Check for missing `.env` — run the setup wizard (first section above).

### Permission Denied on ~/.hermes/jobhunter

```bash
chmod -R 755 ~/.hermes/jobhunter
```

### Hermes Says "No Audio Devices"

Expected inside Docker. Use Telegram/Discord for voice if needed.

### Hermes Doesn't Load AGENTS.md

Verify working directory when opening the session:

```bash
docker exec -it -w /workspace/jobHunter hermes /opt/hermes/.venv/bin/hermes
                      ^^^^^^^^^^^^ must be set
```

### Clean Slate (Delete All Hermes State for This Agent)

⚠️ This deletes your memory and skills for this agent. Only do this if you want to start over:

```bash
rm -rf ~/.hermes/jobhunter
mkdir -p ~/.hermes/jobhunter
docker compose down
docker run -it --rm -v ~/.hermes/jobhunter:/opt/data nousresearch/hermes-agent setup
docker compose up -d
```

(Other agents at `~/.hermes/coding`, `~/.hermes/research`, etc. are unaffected.)

---

## Pro Tips

1. **Copy/Paste Job Descriptions:** When applying, just copy the JD into Hermes. It'll extract the key parts automatically.

2. **Batch Feedback:** Instead of logging each rejection one-by-one, collect 5–10 pieces of feedback and ask Hermes to analyze patterns.

3. **Weekly Check-In:** Every Friday, ask Hermes: "Summarize this week's applications, rejections, and interviews. What should Phase 3 focus on next week?"

4. **Re-Sample on Schedule:** Set a calendar reminder every 2 weeks to re-sample live offers. Market demands shift fast.

5. **Master Profile is Sacred:** Keep it accurate. Every tailored CV depends on it.

---

## Common Mistakes to Avoid

❌ **Don't:** Start a Hermes session without `-w /workspace/jobHunter`. It won't load your AGENTS.md.

❌ **Don't:** Send an application without 100% human review of the generated CV.

❌ **Don't:** Let old job offers sit in phase1/. Re-sample every 2 weeks; stale data misleads skill-gap analysis.

❌ **Don't:** Skip Phase 3. Closing gaps in parallel with applications (not sequentially) gets you offers faster.

❌ **Don't:** Modify generated CVs before sending and commit them. The AI version is disposable; review it, approve it, send it.

---

## Getting Help

- **Hermes itself:** Ask "what should I do next?" inside a session. It reads AGENTS.md and knows the workflow.
- **Docs:** See `AGENTS.md` (project overview) and `HERMES_SETUP.md` (detailed setup).
- **Hermes Documentation:** https://hermes-agent.nousresearch.com/docs/
- **jobHunter README:** `README.md` in your repo.
