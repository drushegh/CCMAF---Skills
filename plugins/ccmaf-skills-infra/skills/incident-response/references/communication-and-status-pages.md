# Communication and status pages

During an outage, users and stakeholders fill silence with worst-case
assumptions. Communication is therefore a dedicated role with a contract,
not something engineers do between commands — and it is judged on cadence
and honesty, not on having answers.

## The cadence contract

- **Every update names the time of the next update, and that promise is
  kept** — even when the content is "no change; still investigating; next
  update 14:30".
- Typical defaults (write yours down before the incident): SEV1 — external
  every 30 minutes, internal every 15; SEV2 — external hourly, internal
  every 30. The comms lead owns the timer.
- Missing one promised update costs more trust than an hour of honest "no
  change" messages.

## Internal communication

The rolling summary (pinned in the incident channel, refreshed on the IC
loop) has a fixed shape:

- **Impact** — who/what is affected, in user terms, with numbers where
  known.
- **Status** — leading hypothesis and current severity.
- **Actions in flight** — each workstream, one line.
- **Next update at** — the timestamp.

Stakeholders get their own channel fed by the comms lead. Executive
summaries are three sentences: impact, trajectory, what would help
(usually: "nothing — stand by; next update at HH:MM"). Executives asking
questions in the ops channel are gently redirected — see the roles
reference.

## Status-page discipline

- **Post early.** "Investigating reports of errors on sign-in" within
  minutes beats a perfect statement an hour late — users are already
  seeing the failure; the only question is whether you look aware of it.
- **Write in user impact terms, plain language.** "Some customers cannot
  complete checkout", not "elevated 5xx on the payments-gateway service".
- **Never**: blame (including naming vendors mid-incident), speculative
  root cause, ETAs engineering hasn't committed to, or minimising language
  ("minor issue") while users are down.
- Follow the standard state machine: **Investigating → Identified →
  Monitoring → Resolved.** Each transition is an update; scheduled
  maintenance is a separate track, never mixed into incidents.
- The **Resolved** message is brief and factual: impact window, what was
  affected, and — where policy allows — a commitment to a public
  postmortem summary.

## Templates

Keep these in the runbook so nobody drafts from scratch at 03:00. Adapt
the bracketed parts; keep the shape.

> **Investigating** — We are investigating reports of [user-visible
> symptom] affecting [scope]. We will post an update by [time].

> **Identified** — We have identified the cause of [symptom] and are
> working on a fix. [Workaround, if any.] Next update by [time].

> **Monitoring** — A fix has been applied and [metric/symptom] is
> recovering. We are monitoring before declaring resolution. Next update
> by [time].

> **Resolved** — Between [start] and [end] UTC, [scope] experienced
> [symptom]. The issue is resolved. We will publish a review of this
> incident [where/when].

## The support loop

Support is both a detection instrument and a comms channel:

- Feed support the current public line and any workaround the moment they
  change — support agents improvising answers create contradictory
  stories.
- Take symptom reports *back* from support during the incident; new
  symptom clusters are triage data (`triage-and-mitigation.md`).

## After the incident

The comms lead closes the loop: final stakeholder summary, status page
resolved message, and the public postmortem where one is promised. The
postmortem's *content* discipline is `postmortems-and-learning.md`; the
document craft — structure, audience, prose — routes to
`technical-writing`.
