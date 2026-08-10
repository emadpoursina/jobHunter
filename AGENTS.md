# jobHunter — Project Context for Hermes Agent

## What This Project Is

A structured workflow for finding, qualifying, and applying to **backend / full-stack JavaScript** roles with **migration via employer visa sponsorship**. The repo is organized into phases that run in parallel, with agent-driven automation at key steps.

**Target role:** Backend / Node.js engineer (NestJS, full-stack JavaScript)  
**Experience:** 7+ years, mid–senior band  
**Migration path:** Employer visa sponsorship (Iranian passport)  
**Location:** Seeking roles in priority countries: Germany, Canada, Netherlands, Portugal, Ireland

---

## The Four-Phase Loop

All phases run in parallel once Phase 1 baseline is complete. Phase 2 and Phase 3 especially overlap.

### Phase 0 — Networking & Referrals
- **Goal:** Hidden market access, warm introductions
- **Tasks:** Map diaspora communities, track local meetups, manage outreach
- **Outputs:** Contact list, referral log, warm-path applications
- **Folder:** `networking/`
- **When:** Ongoing, feeds into Phase 2 applications

### Phase 1 — Research & Skill Gap Analysis
- **Goal:** Understand market demand, visa feasibility, skill expectations
- **Tasks:** 
  1. Choose 5 priority countries → `phase1/countries/`
  2. Collect 10–15 representative job offers per country → `phase1/job-offers/by-country/<code>/`
  3. Extract immigration context (work-permit route, language, sponsorship likelihood)
  4. Merge job offer skills into requirements corpus
  5. Compare your profile → gap report
- **Key File:** `phase1/skills/gap-report.md` (source of truth for market demands)
- **Outputs:** Country files, offer research corpus, skill gap report
- **Agent Spec:** `docs/agents/job-offer-research.md`
- **When:** First pass is foundational; re-sample live offers every 2 weeks to track market shifts

### Phase 2 — Profile, Tailored Applications & Pipeline
- **Goal:** One identity, every application human-reviewed before send
- **Tasks:**
  1. Maintain master profile → `phase2/profile/master-profile.md` (source of truth for who you are)
  2. Create offer file per target role → `phase2/offers/_offer-template.md` (copypaste the JD)
  3. AI generates tailored CV → `phase2/documents/generated/` (AI draft, 100% human review before send)
  4. Submit and track pipeline state → job-collector (`application_stage` on jobs in SQLite)
  5. Log recruiter/interview feedback → `phase2/applications/feedback.md`
- **Key Files:**
  - `phase2/profile/master-profile.md` — single source of truth, updated as skills ship
  - `phase2/offers/<role-name>.md` — one per live job posting
  - `phase2/documents/generated/CV_<Company>_<Role>_<Date>.md` — AI-generated tailored output
  - job-collector — live funnel: sent → screening → interview → offer/rejection (`application_stage`)
  - `phase2/applications/pipeline.md` — legacy; not maintained (no DB sync)
- **Agent Spec:** `docs/agents/cv-generator.md`
- **When:** Ongoing; Phase 1 research informs which offers to target

### Phase 3 — Close Skill Gaps (Parallel with Phase 2)
- **Goal:** Reduce gaps from Phase 1 and real interview feedback while applications continue
- **Tasks:**
  1. Merge Phase 1 gap report + Phase 2 feedback → prioritized backlog
  2. Execute learning: courses, certs, open source, portfolio projects, language study
  3. Add evidence to master profile
  4. Re-sample offers periodically to confirm gaps are closing
- **Key Files:**
  - `phase3/skill-map.md` — full curriculum; maps to flagship project
  - `phase3/flagship-project.md` — one showcase project that hits all critical gaps
  - `phase3/backlog.md` — prioritized learning tasks
- **Agent Spec:** `docs/agents/project-profile-extractor.md`
- **When:** Start in parallel with Phase 2; do NOT wait for all gaps to close before applying

### Cross-Cutting: Metrics
- **Goal:** Visibility into conversion rates per country
- **Tasks:** Track applications sent, response rate, interview rate, offer rate, pipeline time
- **File:** `metrics/by-country.md`
- **When:** Updated weekly; feeds back into Phase 1 effort allocation

---

## Repository Structure

```
jobHunter/
├── README.md                          # Architecture overview & workflow
├── AGENTS.md                          # This file — agent conventions
├── .cursor/                           # Cursor IDE rules (coexists with Hermes)
│
├── docs/
│   ├── principles.md                  # Decision log & workflow rules
│   └── agents/
│       ├── README.md
│       ├── job-offer-research.md      # Phase 1 automation spec
│       ├── cv-generator.md            # Phase 2 automation spec
│       └── project-profile-extractor.md
│
├── networking/                        # Phase 0
│   ├── README.md
│   ├── contacts.md
│   └── outreach-log.md
│
├── phase1/                            # Phase 1 — skill gap analysis
│   ├── README.md
│   ├── checklist.md                   # Country selection & execution status
│   ├── countries/                     # Priority countries + visa notes
│   ├── job-offers/                    # Research corpus
│   │   └── by-country/
│   │       ├── de/research.md         # Germany offers
│   │       ├── ca/research.md         # Canada offers
│   │       └── ...
│   └── skills/
│       ├── requirements-summary.md    # Merged across offers
│       └── gap-report.md              # Your gaps vs. market
│
├── phase2/                            # Phase 2 — applications
│   ├── README.md
│   ├── profile/
│   │   └── master-profile.md          # Single source of truth
│   ├── offers/                        # Live JD files per role
│   │   ├── _offer-template.md
│   │   ├── Company_Role_2026-08.md
│   │   └── ...
│   ├── documents/
│   │   └── generated/                 # AI-generated CVs
│   │       ├── CV_Company_Role_2026-08-10.md
│   │       └── ...
│   └── applications/
│       ├── pipeline.md                # Legacy (unused; live tracker is job-collector)
│       └── feedback.md                # Recruiter notes
│
├── phase3/                            # Phase 3 — learning & gaps
│   ├── README.md
│   ├── skill-map.md                   # Full curriculum
│   ├── flagship-project.md            # Showcase project spec
│   ├── backlog.md                     # Prioritized tasks
│   └── [learning artifacts go here]
│
└── metrics/                           # Cross-cutting
    ├── README.md
    └── by-country.md                  # Conversion rates
```

---

## Working with Hermes

### When Starting a Session

Always start Hermes **inside the jobHunter folder** so it loads this AGENTS.md at the top of context. From inside the container:

```bash
docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes
```

This ensures context discovery walks the folder tree and loads per-phase AGENTS.md files as you work.

### Phase-Specific Guidance

Each phase directory should have its own `AGENTS.md` (see "Per-Phase Context Files" below) that points Hermes at the corresponding automation spec:

- **In `phase1/`:** Point to `docs/agents/job-offer-research.md` — research, extract skills, update gap report
- **In `phase2/`:** Point to `docs/agents/cv-generator.md` — generate tailored CVs, track pipeline
- **In `phase3/`:** Point to `docs/agents/project-profile-extractor.md` — update master profile as skills close

When Hermes reads files inside phase1/, phase2/, or phase3/, it will auto-discover and load the per-phase AGENTS.md. You don't need to repeat context each session.

### Per-Phase Context Files

Create these three files (templates below); Hermes will discover them automatically:

**`phase1/AGENTS.md`:**
```markdown
# Phase 1 — Research & Skill Gap

When working in this folder, follow the spec at:
- `docs/agents/job-offer-research.md`

**Outputs go to:**
- `job-offers/by-country/<country-code>/research.md` — collected offers
- `skills/requirements-summary.md` — merged requirements
- `skills/gap-report.md` — your gaps vs. market

**Key recurring task:** Re-sample 10–15 live offers per priority country every 2 weeks.
```

**`phase2/AGENTS.md`:**
```markdown
# Phase 2 — Profile & Applications

When working in this folder, follow the spec at:
- `docs/agents/cv-generator.md`

**Key files:**
- `profile/master-profile.md` — single source of truth, update as Phase 3 closes gaps
- `offers/` — create one `.md` file per JD (use `_offer-template.md` as template)
- `documents/generated/` — AI-generated tailored CVs go here, review 100% before sending
- job-collector — live application funnel (`application_stage` on jobs)
- `applications/pipeline.md` — legacy; not maintained

**Before every send:** 100% human review of generated CV. No exceptions.
```

**`phase3/AGENTS.md`:**
```markdown
# Phase 3 — Close Skill Gaps

When working in this folder, follow the spec at:
- `docs/agents/project-profile-extractor.md`

**Key files:**
- `skill-map.md` — full curriculum; aligns with `flagship-project.md`
- `flagship-project.md` — one showcase that hits all critical gaps
- `backlog.md` — prioritized learning tasks; update as Phase 2 feedback arrives

**Parallel with Phase 2:** Do NOT wait for all gaps to close before applying. 
Re-prioritize backlog weekly based on Phase 2 interview feedback.
```

---

## Conventions

### Phase 1 — Research
- **Offer corpus rule:** Backend/full-stack roles, same seniority band, posted within ~90 days
- **Sources:** Company careers pages, LinkedIn, national job boards (not spam aggregators)
- **Per country:** 10–15 offers minimum to spot skill patterns
- **Frequency:** Initial sampling → then re-sample live offers every 2 weeks

### Phase 2 — Applications
- **Master profile:** The source of truth; you manually review and approve all changes
- **Generated CVs:** AI draft → 100% human review before send (no exceptions)
- **Offer files:** Create one `.md` per live JD; copy-paste the posting and metadata
- **Pipeline tracking:** One line per application; update status as it moves (sent → screening → interview → offer/rejection)
- **Feedback log:** Recruiter notes, interview themes, rejection reasons → feeds Phase 3 prioritization

### Phase 3 — Learning
- **Flagship project:** One real, deployable project that demonstrates all critical gaps
- **Evidence:** Add completed skills + proof (GitHub, certificate, project link) to master profile
- **Re-sampling:** After each major milestone (gap closed, skill shipped), re-sample Phase 1 offers to confirm market expectations have shifted

### Metrics
- **Tracked:** Applications sent, response rate, interview rate, offer rate, pipeline time-to-outcome
- **Per country:** Separate row in `metrics/by-country.md` so you can shift effort if one region underperforms
- **Updated:** Weekly; feeds back into Phase 1 and Phase 3 prioritization

---

## Important Notes

- **Never modify offer files after they're submitted.** Use `phase2/applications/feedback.md` to log what you learned instead.
- **Master profile is the single source of truth.** Keep it current as you ship skills. Phase 2 CV generator reads it for every tailored generation.
- **Phase 1 research is iterative.** Every two weeks, re-sample live offers per priority country; do not rely on month-old data.
- **100% human review before send.** This includes AI-generated CVs, cover letters, and follow-ups. No exceptions.
- **Feedback loop:** Phase 2 rejections and interview notes inform Phase 3 prioritization and Phase 1 re-sampling.

---

## Agent Automation Entry Points

Three core automation specs (in `docs/agents/`):

1. **`job-offer-research.md`** — Collects 10–15 offers per country, extracts skills
2. **`cv-generator.md`** — Reads master profile + offer file, generates tailored CV
3. **`project-profile-extractor.md`** — Updates master profile as skills are completed

Each is a Hermes Skill candidate. Ask Hermes to "create a skill from docs/agents/cv-generator.md" and it will remember the procedure for next time you say "generate a CV for this offer."

---

## Session Workflow

**Typical session when applying to a role:**

1. Open Hermes session (cd into repo, exec docker command above)
2. Copy the JD into `phase2/offers/<Company_Role_Date>.md`
3. Ask Hermes: "Generate a tailored CV using docs/agents/cv-generator.md"
4. Review the generated CV in `phase2/documents/generated/` (100% human approval)
5. Update application funnel stage in job-collector (`application_stage`, e.g. `sent`)
6. When you get feedback, log it in `phase2/applications/feedback.md`
7. Let the feedback inform Phase 3 backlog prioritization

**Typical recurring task (every 2 weeks):**

1. Ask Hermes: "Re-sample live offers per priority country using docs/agents/job-offer-research.md"
2. Update `phase1/skills/gap-report.md` with any new market patterns
3. Let new patterns inform Phase 3 backlog re-prioritization

---

## Files NOT to Modify

- This file (`AGENTS.md`) — edit only if project structure fundamentally changes
- `docs/agents/*.md` — these are automation specs; treat as read-only unless the procedure actually changes
- Per-phase `AGENTS.md` files (once created) — these are context discovery hints, not working files

---

## Questions for Hermes

When you're stuck or need guidance, ask Hermes:

- "Which skills appear most in the last phase1 research?" → reads gap-report.md, requirements-summary.md
- "Generate a tailored CV for [offer-file]" → runs cv-generator spec
- "Update master profile based on what's in phase3/backlog.md" → merges completed items into profile
- "What's the current pipeline status?" → reads job-collector jobs / `application_stage`, reports statistics
- "Re-sample live offers for Germany and summarize new skill patterns" → runs job-offer-research spec

---

## See Also

- `README.md` — Architecture overview and project intro
- `docs/principles.md` — Decision log and workflow rules
- `docs/agents/README.md` — Index of automation specs
