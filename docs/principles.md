# Workflow principles

Decision log for jobHunter. Update when rules change.

## Operating model

Five session modes, one primary mode per session, default = **Operate**. Folders unchanged: Foundation → `phase1/`, Operate → `phase2/` + `tools/job-collector/`, Improve → `phase3/`, Access → `networking/`, Scoreboard → `metrics/`. "Phase 0–3" names below are historical folder labels for those modes, not four equal parallel phases.

Four sources of truth: who you are → `phase2/profile/master-profile.md`; market vs you → `phase1/skills/gap-report.md`; funnel stage → job-collector `application_stage` on jobs (SQLite); what to learn next → `phase3/backlog.md`. Everything else listed below (requirements summary, checklist, feedback log, skill map, flagship spec, by-country metrics, contacts/outreach log) is supporting, not a source of truth. `phase2/applications/pipeline.md` is legacy — do not sync or revive.

Hard rules: 100% human review of CV, cover letter, and follow-up before send (no exceptions); never modify offer files after submission — log learning in `phase2/applications/feedback.md`; do not wait for all skill gaps to close before applying; master profile is the only source of facts for CVs.

## Role & migration

- **Candidate:** Emad Poursina — full-stack JavaScript, 7+ years.
- **Target roles:** Backend / Node.js (NestJS); full-stack (React, Next.js, TypeScript).
- **Migration path:** Employer visa sponsorship required (Iranian passport).
- **Seniority:** Mid–senior; consistent across countries and search queries.
- **Upskilling vehicle:** One flagship project per [`../phase3/skill-map.md`](../phase3/skill-map.md).

## Sampling (Mode: Foundation)

- **Five priority countries** — maximum effort; still apply elsewhere at lower weight.
- **10–15 offers per priority country** — not 10 total across all countries.
- **Recency:** Prefer postings from the last ~90 days.
- **Sources:** Company careers pages, LinkedIn, reputable national boards.
- **Exclude:** Unrelated titles, intern/junior mismatch, duplicate reposts, unclear visa/sponsorship where that matters.
- **Agent:** Run [`agents/job-offer-research.md`](agents/job-offer-research.md) per country; output → `phase1/job-offers/by-country/<code>/research.md`.

## Immigration (Mode: Foundation)

For each priority country document:

- Typical visa route for software developers with a job offer
- Language requirements (official + practical)
- Whether employers commonly sponsor non-citizens
- Known blockers (local degree, local experience, salary thresholds)

## Applications (Mode: Operate, default)

- **Master profile first** — [`../phase2/profile/master-profile.md`](../phase2/profile/master-profile.md); scoped adjacency fills only, every fill logged in Gaps Disclosure.
- **AI drafts, human approves** — 100% review of CV + Gaps Disclosure before send. Agent: [`agents/cv-generator.md`](agents/cv-generator.md).
- **Phase 2 ∥ Phase 3 became Operate ∥ Improve** — apply while upskilling; do not block applications on gap closure.
- **Feedback loop** — rejection reasons and interview notes update `phase1/skills/gap-report.md` and `phase3/backlog.md`.

## Networking (Mode: Access)

- Run in parallel with Operate from day one. Access finds the door; Operate sends.
- Log every outreach and link referrals to the matching job in job-collector (`application_stage`).

## Metrics (Mode: Scoreboard)

- Review `metrics/by-country.md` weekly. Counts come from job-collector `application_stage`, not `phase2/applications/pipeline.md` (legacy).
- If response rate stays low for a priority country after sufficient volume, re-check offer fit, CV tailoring, or deprioritize country.
