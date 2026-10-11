# On-call and escalation

On-call is the standing capability that turns detection into response.
Designed well, it is a sustainable rotation with a quiet pager and a clear
escalation path; designed badly, it is a burnout engine that trains people
to ignore alerts — and the incident process inherits whichever you built.

## Rotation design

- **Sustainable rotations need roughly 4–6+ people.** Below that, the
  maths guarantees fatigue; either grow the pool (train more people,
  merge related services) or reduce what pages.
- **Primary/secondary** structure by default: primary responds, secondary
  is the automatic escalation target and covers gaps.
- **Follow-the-sun** where teams span time zones; otherwise be honest
  about night coverage — a "24/7" rotation staffed by one exhausted
  engineer is a fiction that fails during the incident that matters.
- Shift length: a week is common; noisy services warrant shorter shifts.
  Overrides (swaps, cover) must be one cheap, logged action.
- New joiners ramp: **shadow** (paired, observing) → **reverse-shadow**
  (leading, with backup) → solo. Nobody's first page should be solo.

## Paging hygiene

- The bar for a page: **urgent + user-visible (or error-budget-
  threatening) + actionable + runbook-linked.** Anything failing a test is
  a ticket — or a deletion. Alert *design* belongs to
  `observability-development`; on-call owns the feedback loop.
- **Review every page weekly.** Each one ends in exactly one of: real
  incident (fine), runbook improved, alert tuned, alert deleted. A page
  that produced a shrug twice is noise, and noise trains the on-call to
  sleep through the real one.
- Track **page load per person per shift**. When the median exceeds your
  written threshold (a common choice: more than ~2 pages per shift, or
  any night page pattern), reliability work jumps the queue — the pager
  is a prioritised backlog of what to fix next.

## Escalation

- **Escalating is free and encouraged.** "I need help" fifteen minutes in
  is a professional act; struggling alone for two hours is an incident
  extender. Make this explicit in the on-call charter — culture beats
  policy here.
- **Automatic escalation as backstop:** an unacknowledged page escalates
  on a timeout (primary → secondary → wider). If auto-escalation fires
  regularly, fix acknowledgement habits or rotation load, not the timeout.
- The **escalation policy is written per service**: who is next, how to
  reach them, which vendors/TAMs can be woken and under what contract
  terms. Discovering the escalation path during a SEV1 is too late.
- Cross-team engagement goes through *their on-call*, paged through the
  system — not through whoever you happen to know. The IC owns cross-team
  resourcing during declared incidents (`roles-and-command.md`).

## Readiness

- **Before your shift:** verify access end to end — VPN, production
  credentials, dashboards, paging app on and audible; read the handoff
  notes; know what is risky this week (planned deploys, migrations,
  traffic events).
- **Shift handover** is explicit: open incidents, recent pages and their
  outcomes, watch items. Silent handovers drop exactly the context the
  03:00 page needs.
- **Runbooks are tested**, linked from their alerts, and executable under
  stress (numbered steps, copy-pasteable commands — content craft →
  `technical-writing`). A runbook nobody has executed since the system
  changed is a trap.
- **Game days** exercise the humans, not just the systems: practise
  declaring, running the IC loop, comms cadence and handovers on a
  simulated incident. Chaos-engineering tooling for fault injection is a
  decision-level adjunct (July 2026 — the practice is mainstream, the
  tooling churns; re-verify current options before adopting).

## Sustainability

- Compensate on-call explicitly — unpaid pager duty is deferred attrition.
- Track interrupt load and night pages per person; rebalance before people
  break, not after.
- The standing prize: every quiet shift is the product of last quarter's
  page reviews and postmortem actions. Guard that loop — it is the whole
  system working.
