# jobHunter — Project Context for Hermes Agent

## What This Project Is

A structured workflow for finding, qualifying, and applying to **backend / full-stack JavaScript** roles with **migration via employer visa sponsorship**. Sessions use **one of five modes** (default = Operate). Folder names stay historical (`phase1/` …); they are not four equal parallel phases.

**Target role:** Backend / Node.js engineer (NestJS, full-stack JavaScript)  
**Experience:** 7+ years, mid–senior band  
**Migration path:** Employer visa sponsorship (Iranian passport)  
**Location:** Seeking roles in priority countries: Germany, Canada, Netherlands, Portugal, Ireland

---

## Operating Model — Five Session Modes

Pick **one primary mode per session**. Default = **Operate** (most sessions send applications). Folders are unchanged; the old "Phase 0–3" names are historical labels for these modes, not four equal parallel phases.

### Mode: Foundation — market + visa + gaps
- **Goal:** Understand market demand, visa feasibility, skill expectations
- **Folder:** `phase1/`
- **Tasks:**
 1. Choose 5 priority countries → `phase1/countries/`
 2. Collect 10–15 representative job offers per country → `phase1/job-offers/by-country/<code>/`
 3. Extract immigration context (work-permit route, language, sponsorship likelihood)
 4. Merge job offer skills into requirements corpus (`phase1/skills/requirements-summary.md`, supporting — not a source of truth)
 5. Compare your profile → gap report (`phase1/skills/gap-report.md`, source of truth for market-vs-you)
- **Agent Spec:** `docs/agents/job-offer-research.md`
- **When:** First pass is foundational; re-sample live offers every 2 weeks to track market shifts

### Mode: Operate — applications out (DEFAULT most sessions)
- **Goal:** One identity, every application human-reviewed before send
- **Folders:** `phase2/` + `tools/job-collector/`
- **Tasks:**
 1. Maintain master profile → `phase2/profile/master-profile.md` (source of truth for who you are; the only source of facts for CVs)
 2. Create offer file per target role → `phase2/offers/_offer-template.md` (copypaste the JD; never modify after submission)
 3. AI generates tailored CV → `phase2/documents/generated/` (AI draft, 100% human review of CV, cover letter, and follow-up before send — no exceptions)
 4. Submit and track funnel stage → job-collector (`application_stage` on jobs in SQLite — the source of truth for funnel stage)
 5. Log recruiter/interview feedback → `phase2/applications/feedback.md` (supporting — not a source of truth)
- **Legacy:** `phase2/applications/pipeline.md` — unused, do not sync or revive
- **Agent Spec:** `docs/agents/cv-generator.md`
- **When:** Ongoing; Foundation research informs which offers to target. Do not wait for all skill gaps to close before applying.

### Mode: Improve — close gaps + evidence
- **Goal:** Reduce gaps from Foundation and real Operate feedback while applications continue
- **Folder:** `phase3/`
- **Tasks:**
 1. Merge gap report + Operate feedback → prioritized backlog (`phase3/backlog.md`, source of truth for what to learn next)
 2. Execute learning: courses, certs, open source, portfolio projects, language study
 3. Add evidence to master profile
 4. Re-sample offers periodically to confirm gaps are closing
- **Supporting (not sources of truth):** `phase3/skill-map.md`, `phase3/flagship-project.md`
- **Agent Spec:** `docs/agents/project-profile-extractor.md`
- **When:** Runs in parallel with Operate; do NOT wait for all gaps to close before applying

### Mode: Access — warm intros / referrals
- **Goal:** Hidden market access, warm introductions. Access finds the door; Operate sends.
- **Folder:** `networking/`
- **Tasks:** Map diaspora communities, track local meetups, manage outreach
- **Outputs:** Contact list, referral log, warm-path applications (`networking/contacts.md` + `outreach-log.md`, supporting — not sources of truth)
- **When:** Ongoing, feeds into Operate applications

### Mode: Scoreboard — conversion by country
- **Goal:** Visibility into conversion rates per country
- **Folder:** `metrics/`
- **Tasks:** Track applications sent, response rate, interview rate, offer rate, pipeline time
- **File:** `metrics/by-country.md` (supporting — counts come from job-collector `application_stage`, not `pipeline.md`)
- **When:** Updated weekly; feeds back into Foundation effort allocation

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
├── networking/                        # Mode: Access
│   ├── README.md
│   ├── contacts.md
│   └── outreach-log.md
│
├── phase1/                            # Mode: Foundation — skill gap analysis
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
├── phase2/                            # Mode: Operate (default) — applications
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
├── phase3/                            # Mode: Improve — learning & gaps
│   ├── README.md
│   ├── skill-map.md                   # Full curriculum
│   ├── flagship-project.md            # Showcase project spec
│   ├── backlog.md                     # Prioritized tasks
│   └── [learning artifacts go here]
│
└── metrics/                           # Mode: Scoreboard
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

### Mode-Specific Guidance

Each mode directory has its own `AGENTS.md` (see "Per-Mode Context Files" below) that points Hermes at the corresponding automation spec:

- **In `phase1/` (Mode: Foundation):** Point to `docs/agents/job-offer-research.md` — research, extract skills, update gap report
- **In `phase2/` (Mode: Operate, default):** Point to `docs/agents/cv-generator.md` — generate tailored CVs, track funnel in job-collector
- **In `phase3/` (Mode: Improve):** Point to `docs/agents/project-profile-extractor.md` — update master profile as skills close
- **In `networking/` (Mode: Access):** Warm intros feed Operate; link referrals to the matching job in job-collector (`application_stage`)
- **In `metrics/` (Mode: Scoreboard):** Counts come from job-collector `application_stage`, not `pipeline.md`

When Hermes reads files inside these folders, it will auto-discover and load the per-mode AGENTS.md. You don't need to repeat context each session.

### Per-Mode Context Files

Create these three files (templates below); Hermes will discover them automatically:

**`phase1/AGENTS.md`:**
```markdown
# Mode: Foundation — Research & Skill Gap

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
# Mode: Operate — Profile & Applications (default)

When working in this folder, follow the spec at:
- `docs/agents/cv-generator.md`

**Key files:**
- `profile/master-profile.md` — single source of truth for who you are; the only source of facts for CVs. Update as Improve closes gaps
- `offers/` — create one `.md` file per JD (use `_offer-template.md` as template)
- `documents/generated/` — AI-generated tailored CVs go here, review 100% before sending
- job-collector — live application funnel (`application_stage` on jobs)
- `applications/pipeline.md` — legacy; not maintained

**Before every send:** 100% human review of CV, cover letter, and follow-up. No exceptions.
```

**`phase3/AGENTS.md`:**
```markdown
# Mode: Improve — Close Skill Gaps

When working in this folder, follow the spec at:
- `docs/agents/project-profile-extractor.md`

**Key files:**
- `skill-map.md` — full curriculum; aligns with `flagship-project.md`
- `flagship-project.md` — one showcase that hits all critical gaps
- `backlog.md` — prioritized learning tasks; update as Phase 2 feedback arrives

**Parallel with Operate:** Do NOT wait for all gaps to close before applying. 
Re-prioritize backlog weekly based on Phase 2 interview feedback.
```

---

## Conventions

### Mode: Foundation — Research
- **Offer corpus rule:** Backend/full-stack roles, same seniority band, posted within ~90 days
- **Sources:** Company careers pages, LinkedIn, national job boards (not spam aggregators)
- **Per country:** 10–15 offers minimum to spot skill patterns
- **Frequency:** Initial sampling → then re-sample live offers every 2 weeks

### Mode: Operate — Applications (default)
- **Master profile:** The source of truth; you manually review and approve all changes
- **Generated CVs:** AI draft → 100% human review of CV, cover letter, and follow-up before send (no exceptions)
- **Offer files:** Create one `.md` per live JD; copy-paste the posting and metadata
- **Funnel tracking:** Job-collector `application_stage` is the source of truth (sent → screening → interview → offer/rejection)
- **Feedback log:** Recruiter notes, interview themes, rejection reasons → feeds Phase 3 prioritization

### Mode: Improve — Learning
- **Flagship project:** One real, deployable project that demonstrates all critical gaps
- **Evidence:** Add completed skills + proof (GitHub, certificate, project link) to master profile
- **Re-sampling:** After each major milestone (gap closed, skill shipped), re-sample Phase 1 offers to confirm market expectations have shifted

### Mode: Scoreboard — Metrics
- **Tracked:** Applications sent, response rate, interview rate, offer rate, pipeline time-to-outcome
- **Per country:** Separate row in `metrics/by-country.md` so you can shift effort if one region underperforms
- **Updated:** Weekly; feeds back into Phase 1 and Phase 3 prioritization

---

## Important Notes

- **Never modify offer files after they're submitted.** Use `phase2/applications/feedback.md` to log what you learned instead.
- **Master profile is the single source of truth.** Keep it current as you ship skills. Phase 2 CV generator reads it for every tailored generation.
- **Phase 1 research is iterative.** Every two weeks, re-sample live offers per priority country; do not rely on month-old data.
- **100% human review before send.** This includes AI-generated CVs, cover letters, and follow-ups. No exceptions.
- **Feedback loop:** Operate rejections and interview notes inform Improve prioritization and Foundation re-sampling.

---

## Agent Automation Entry Points

Three core automation specs (in `docs/agents/`):

1. **`job-offer-research.md`** — Collects 10–15 offers per country, extracts skills
2. **`cv-generator.md`** — Reads master profile + offer file, generates tailored CV
3. **`project-profile-extractor.md`** — Updates master profile as skills are completed

Each is a Hermes Skill candidate. Ask Hermes to "create a skill from docs/agents/cv-generator.md" and it will remember the procedure for next time you say "generate a CV for this offer."

---

## Session Workflow

**Typical session when applying to a role (Mode: Operate — one primary mode per session, default Operate):**

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

- This file (`AGENTS.md`) — edit only if project structure fundamentally changes (P0 operating-model lock was an authorized exception)
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
