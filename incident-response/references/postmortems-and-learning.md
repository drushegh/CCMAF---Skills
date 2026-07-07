# Postmortems and learning

A postmortem converts the cost already paid in an incident into future
prevention, faster detection and faster mitigation. It is an engineering
artefact, not a court proceeding — and its quality is measured by what
changes afterwards, not by how thorough the document looks.

## Blameless, structurally

- **Why:** people who are punished for surfacing failure stop surfacing
  it. The next incident then arrives with no context, no honest timeline
  and no early warning. Blamelessness is an incentive design, not
  politeness.
- **What it is not:** an accountability dodge. Accountability lives in
  owning action items and improving the system — not in naming who typed
  the command.
- **The language test:** replace "X pushed a bad config" with "the config
  path allowed an invalid value to reach production without validation".
  If a sentence only works with a person as its subject, the analysis
  stopped too early — a differently-staffed team would hit the same trap.
- Assume everyone acted reasonably on the information they had. The
  interesting question is why the system made the wrong action look right.

## Building the timeline

- Sources, in order of reliability: the scribe log, deploy/flag/config
  events, telemetry, chat history, then memory (last, and labelled as
  such). Timestamps in UTC.
- Mark the key instants: **impact start** (from telemetry — not when a
  human noticed), **detection**, **declaration**, **engagement**,
  **mitigation**, **resolution**.
- Derive detection and mitigation intervals honestly from those marks. A
  flattering timeline that starts at detection rather than impact start
  hides exactly the gap most worth fixing.

## Contributing factors, not "the" root cause

Complex systems fail through combinations — a latent defect, a missing
guard, an alerting blind spot and an unlucky trigger, together. Enumerate
the **contributing factors** and also what *kept the system safe until
now* (controls that worked shrink the panic and mark what to preserve).

**The five-whys trap:** a single linear why-chain forces one causal path,
tends to terminate at a human ("why? because X didn't check"), and stops
wherever the facilitator stops feeling curious. Ask branching questions
instead, per factor:

- What made this failure *possible*?
- What made it *likely*?
- What would have *caught it earlier*?
- Where else does this pattern exist right now?

## Action items

- Every action item has an **owner, a due date, and a ticket in the normal
  backlog** — a postmortem-local list is where actions go to die.
- Classify each: **prevent** (remove the failure mode), **detect faster**
  (instrumentation, alerts), **mitigate faster** (runbooks, flags, tested
  rollback), **process** (comms, escalation).
- Follow-through beats volume: three completed items beat fifteen stale
  ones. Review open postmortem actions on a standing cadence (monthly is
  typical) with the same seriousness as feature work.
- Smell test: "add more alerts" and "be more careful" are non-actions.
  Alert additions route through SLO-based design
  (`observability-development`); carefulness routes to a guard the system
  enforces.

## The review

- The draft is written by people who were in the incident, circulated
  async, then discussed in a short meeting — SEV1/2 always; lower
  severities when the failure mode is novel.
- The meeting exists to test the analysis (are these really the factors?
  are the actions the right ones?), not to re-litigate decisions made
  under pressure with information nobody had.
- **Near misses get postmortems too.** "We got lucky" is a finding — luck
  is not a control, and near misses are cheaper lessons than incidents.
- Share widely internally; publish a sanitised external version where
  trust warrants it. Document structure and prose craft →
  `technical-writing`.

## Programme-level signals

Track across postmortems: time-to-detect and time-to-mitigate
distributions per severity, page counts per service, action-item
completion rate, and repeat-factor patterns. These feed reliability
priorities. One caution: never weaponise per-team MTTR league tables —
the moment the metric is a target, timelines get gamed and the learning
stops.
