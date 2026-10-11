---
name: incident-response
description: >-
  Running production incidents as a discipline: detection and severity
  classification (SEV levels, declare-early rules), the incident-command
  model (IC, ops, comms and scribe roles, handovers), triage with
  mitigation-before-diagnosis, stakeholder and status-page communication,
  escalation and on-call/paging hygiene, and blameless postmortems
  (timeline, contributing factors, tracked action items). Use whenever
  production is degraded or down, an alert storm or user-visible outage
  appears, or the task says "declare an incident", "sev1/sev2", "incident
  commander", "status page", "war room", "postmortem", "RCA", "on-call
  rotation" or "escalation policy". Triggers include: pages and SLO
  burn-rate alerts, "production is down", "customers are reporting",
  rollback-under-pressure decisions, writing or reviewing a postmortem, and
  designing or auditing on-call. PROACTIVELY activate the moment a session
  encounters live production impact — mitigate first, then diagnose.
---

# Incident Response

Running production incidents as an engineering discipline — from the first
alert to the last tracked postmortem action. This skill owns the *process*
that coordinates humans and decisions under pressure: declaration and
severity, the incident-command roles, mitigation-first triage,
communication, on-call and escalation design, and blameless learning
afterwards. The telemetry that detects incidents belongs to
`observability-development`; the diagnosis method belongs to
`systematic-debugging`; the document craft (runbooks, postmortem prose)
belongs to `technical-writing` (boundaries below).

Context (July 2026 — re-verify): the incident-command model here descends
from the emergency-services Incident Command System and is the industry
standard shape — Google SRE, PagerDuty and Atlassian all publish close
variants. Status-page tooling is commodity. Regulated sectors carry
statutory clocks: EU NIS2 expects an early warning within 24 hours of
awareness of a significant incident, and GDPR sets 72 hours for personal
data breaches (obligations and scope → `secure-development`).

## Non-negotiables

1. **Mitigate first, diagnose later.** Users experience duration × blast
   radius; root cause can wait, harm cannot. Restore service with the
   safest available lever, then investigate properly.
2. **Declare early, declare cheaply.** Anyone can declare; a wrongly
   declared incident is downgraded in minutes, a late one has no timeline,
   no roles and duplicated effort. If you're wondering whether it's an
   incident, it is.
3. **One incident commander at a time.** The IC coordinates — state,
   priorities, delegation, decisions — and **never debugs hands-on**. An IC
   deep in a terminal means nobody is running the incident.
4. **Communication is a role with a cadence.** Every update names the time
   of the next one, and that promise is kept even when the update is "no
   change". Silence reads as incompetence.
5. **Timestamps or it didn't happen.** A scribe keeps actions, decisions
   and observations in a dedicated incident channel — the postmortem
   timeline is built from this, not from memory.
6. **Don't make it worse.** Risk-assess every mitigation (reversible?
   tested? touches data?); snapshot state before destructive steps; state
   dangerous commands in-channel before running them.
7. **Blameless is structural, not a mood.** Postmortems name systems and
   conditions, never culprits — punished reporters stop reporting, and the
   next incident arrives unannounced.
8. **Action items are owned, dated and tracked** in the normal backlog.
   Three completed actions beat fifteen stale ones.
9. **Every page is urgent, user-visible, actionable and runbook-linked.**
   Anything else is a ticket or a deletion (alert design →
   `observability-development`).
10. **Practise before the real thing.** Tested runbooks, verified access,
    game days. The first time someone plays IC must not be a SEV1.

## Decision tables

| User impact right now | Severity | Response |
|---|---|---|
| Critical function down, or active data loss/corruption, many users | **SEV1** | Page immediately; IC + dedicated comms lead; exec notification; all-hands until mitigated |
| Major degradation or partial outage, no workaround | **SEV2** | Page immediately; IC assigned; status page if user-visible |
| Minor impact, workaround exists, or small user subset | **SEV3** | Business hours; ticketed owner; no page |
| Cosmetic, internal-only, no user harm | **SEV4** | Backlog |

Classify by impact and trajectory, not by component or effort to fix.
Unknown-but-alarming defaults **up**, not down.

| Situation | Reach for first |
|---|---|
| Started shortly after a deploy | **Roll back** — don't fix forward under pressure |
| The code path is behind a feature flag | **Flag off** |
| A dependency is down or slow | Failover, cached/degraded mode, queue-and-drain |
| Overload or traffic spike | Shed load, rate-limit, scale out, disable expensive features |
| Data corruption in progress | **Stop the writer first** — halt damage before repairing it |
| Unknown cause, process unhealthy | Restart is legitimate *after* capturing its state |

## High-frequency pitfalls

- **"Five more minutes of debugging"** while a known-safe rollback sits
  unused — diagnosis before mitigation, inverted priorities.
- **The IC in a terminal** — coordination stops; workstreams collide.
- **Everyone investigating the same hypothesis** in one call; the IC's job
  is parallel, non-overlapping workstreams.
- **Status page silent for hours**, or stuck on "investigating" — the
  cadence contract broken exactly when trust matters most.
- **Speculating on root cause in public comms**, naming vendors in the
  heat, or promising ETAs engineering never gave.
- **Severity haggling while users hurt** — classify from the written
  definitions, act, revisit later.
- **Fix-forward under pressure** when a rollback exists — a new change on
  top of a broken system, reviewed by adrenaline.
- **Restarting away the evidence** — the wedged process held the thread
  dump; now the incident is unexplainable (and if it's a security
  incident, evidence handling matters doubly → `sentinel-development`).
- **The postmortem as blame theatre** or as a document nobody reads —
  action items with no owner, "be more careful" as a remediation.
- **The hero rotation** — the same person always paged, escalation seen as
  weakness; unsustainable and a single point of failure.

## Workflow (the incident lifecycle)

1. **Detect** — page, SLO burn alert, user reports. Confirm impact is real
   (dashboard *and* one manual check of the user path).
2. **Declare** — open the incident channel, set severity from the table,
   name the IC. Note the time.
3. **Staff the roles** — IC, ops lead(s), comms lead, scribe; one person
   may wear several hats *explicitly* on small teams.
4. **Triage** — blast radius, trajectory, and above all *what changed*
   (deploys, flags, config, data, dependencies, certs, quotas).
5. **Mitigate** — pick the safest lever from the menu; risk-assess;
   snapshot before destructive steps; preserve forensics when cheap.
6. **Communicate on cadence** — internal rolling summary + status page;
   next-update time always stated.
7. **Verify recovery** — watch the SLI recover (not just the alert clear),
   check the user path, hold in "monitoring" until stable.
8. **Stand down** — explicit in-channel; thank responders; schedule the
   postmortem while memory is fresh.
9. **Postmortem** — blameless; timeline from the scribe log; contributing
   factors, not a single root cause; owned and dated action items.
10. **Follow through** — action items tracked to completion; recurring
    patterns feed reliability priorities and on-call review.

## Reference index

Load on demand:

- `references/detection-and-severity.md` — detection sources, declaration rules, the severity matrix in depth, statutory clocks
- `references/roles-and-command.md` — IC/ops/comms/scribe duties, handovers, channel hygiene, executives in the room
- `references/triage-and-mitigation.md` — the first five minutes, what-changed triage, the mitigation menu with risk notes, verifying recovery
- `references/communication-and-status-pages.md` — cadence contracts, internal vs external comms, status-page discipline, templates
- `references/postmortems-and-learning.md` — blameless discipline, timeline construction, contributing factors vs five-whys, action-item follow-through
- `references/oncall-and-escalation.md` — rotation design, paging hygiene, escalation policy, readiness and game days, sustainability

## Boundaries

- **Telemetry, SLOs and alert design** — what pages fire and why →
  `observability-development`; this skill consumes its alerts and feeds
  back page-quality reviews.
- **The diagnosis method** once mitigated (or when diagnosis *is* the
  mitigation path) — reproduce, isolate, hypothesise, verify →
  `systematic-debugging`.
- **Runbook and postmortem document craft** — anatomy, executable-under-
  stress rules, prose → `technical-writing`; this skill owns the process
  those documents serve and what the postmortem must establish.
- **Server-level mechanics** during response (systemd, resource
  saturation) → `linux-administration`; **cluster rollback/scale
  mechanics** → `kubernetes-development`; **pipeline and deployment
  mechanics** → `devops-development`; **revert mechanics** →
  `git-workflow`.
- **Security incidents** — SIEM detection, SOAR playbooks →
  `sentinel-development`; breach-notification obligations (NIS2, GDPR) →
  `secure-development`. This skill's command structure still applies;
  evidence preservation becomes non-negotiable.
- **Schema-safe rollbacks** (expand–contract) → `sql-development`.
- **Post-incident architectural remediation review** →
  `architecture-review`.
