# Runbooks and Operational Docs

A runbook is a how-to guide hardened for its actual reading conditions:
03:00, production degraded, executed by someone who is not the author,
under time pressure, possibly mid-incident. Every writing rule follows
from those conditions. Alert design and SLOs belong to
`observability-development`; this file owns the document the alert links
to.

## Runbook anatomy

1. **Title = the symptom or alert name**, verbatim — the operator arrives
   by searching the alert text. One runbook per alert/symptom.
2. **Impact and severity** — what users experience while this fires, and
   how urgent it truly is. This is what stops 03:00 over-reaction.
3. **Preconditions** — access and tools required (VPN, roles, CLIs),
   each with a one-line check command. Discovering a missing permission
   at step 6 of an incident is the runbook's failure, not the operator's.
4. **Triage** — 2–4 checks that classify the situation, each with the
   exact command and what the healthy vs unhealthy output looks like,
   ending in explicit branches: "If X → §Recover-A. Otherwise → §Escalate."
5. **Recovery steps** — the core (rules below).
6. **Verification** — how to confirm the system is actually healthy
   again, not just quiet.
7. **Rollback / abort** — what to do if a recovery step makes things
   worse; the point of no return marked explicitly.
8. **Escalation** — who to call, when to stop trying (a time-box:
   "if not resolved in 20 minutes, escalate"), and what to include in
   the handover.
9. **Links** — dashboard, related runbooks, service docs.
10. **Last tested** — date and by whom (see testing, below).

## Writing rules

- **Numbered imperative steps, one action each.** "3. Restart the worker
  pool:" followed by the command. Never "you'll probably want to check
  the queue depth around now".
- **Copy-paste commands with placeholders isolated.** Set variables once
  at the top (`export ENV=prod-eu`), then keep every subsequent command
  runnable as-is. A placeholder buried mid-command gets pasted
  unedited — at 03:00, guaranteed.
- **Verification after every mutating step.** State the check command and
  the expected output. An operator must never be three destructive steps
  deep without knowing whether step one worked.
- **Destructive commands stand alone and announce themselves.** Own step,
  plain-language statement of what is about to be irreversibly done, and
  the abort alternative. Never inline a `delete`/`failover`/`restore`
  inside a paragraph.
- **Decision points are explicit branches**, not prose ("If replication
  lag > 60s → step 9; otherwise → step 12"). An operator under stress
  follows arrows, not nuance.
- **No unexplained jargon, no tribal shorthand.** The reader may be the
  new joiner on their first on-call rotation.

## The alert→runbook contract

Every alert that can page a human links to a runbook, and every runbook
names the alert(s) that lead to it. An alert with no runbook is a demand
that the operator improvise under stress; a runbook no alert reaches is
dead weight that will silently rot. Enforce the link in alert review
(alert quality itself → `observability-development`).

## Testing runbooks

A runbook that has never been executed is a hypothesis. Discipline:

- **Execute on schedule** — walk each critical runbook against a real
  (staging or game-day) environment periodically; update the
  **Last tested** stamp only on a successful walk-through.
- **Execute on change** — infrastructure changes invalidate runbooks
  silently; re-walk the affected ones as part of the change.
- **The executor is not the author** — fresh eyes find the assumed
  context. The best test is the newest team member running it cold.
- **Fix in the moment** — whoever finds a broken step fixes it while the
  pain is fresh, same as onboarding docs.

## The wider operational doc set

- **Playbook vs runbook:** a runbook handles one known symptom
  mechanically; a playbook guides a *class* of situation (a security
  incident, a region failover) where judgement is required — more
  branches, more "assess", named roles. Same writing rules apply to the
  mechanical parts.
- **Service catalogue entry:** per service — owner/team, what it does,
  dependencies (up and down), dashboards, runbook index, escalation. One
  page, ruthlessly current; this is the page an incident starts from.
- **On-call handover:** a short, structured template — active issues,
  recent changes, things to watch — written by the outgoing, read aloud
  at handover.
- **Disaster recovery docs:** restore procedures are runbooks with the
  strictest testing rule of all — an untested restore procedure is a
  fiction with a heading (backup/restore practice → `sql-development`
  for databases, `linux-administration` for servers).

## Anti-patterns

- **The wall of context** — two screens of architecture before step 1.
  Link the explanation; the operator needs the steps.
- **Steps that assume the author's machine** — aliases, local scripts,
  ambient credentials.
- **"Investigate the issue"** as a step. That's the absence of a step.
- **Screenshot-driven runbooks** — UI walkthroughs rot fast and can't be
  copy-pasted; prefer CLI where one exists.
- **Stale runbooks kept "just in case"** — a runbook for a decommissioned
  path misdirects a live incident. Delete it; git remembers.
