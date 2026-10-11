# Detection and severity

An incident exists when user-visible harm (or imminent risk of it) exceeds
what the on-call can quietly absorb. Everything downstream — roles, comms,
statutory clocks — hangs off two early calls: *is this an incident?* and
*how severe?* Both calls should take minutes, from written definitions.

## Detection sources

- **SLO burn-rate pages** — the primary signal when observability is done
  well (`observability-development` owns their design).
- **Synthetic probes** — catch what internal metrics miss (DNS, certs, CDN,
  auth providers) from outside the trust boundary.
- **User and support reports** — weight these heavily: they arrive exactly
  where telemetry is blind. Wire an explicit support → on-call path with a
  low threshold; a support-ticket spike *is* a detection instrument.
- **Dependency status feeds** — vendor status pages and health endpoints;
  correlate before assuming the fault is yours (and before assuming it
  isn't).
- **Security signals** — anomalous auth, exfiltration patterns; run the
  same command structure, but route detection depth to
  `sentinel-development` and preserve evidence from the first minute.

If incidents are routinely detected by users rather than telemetry, that is
itself a postmortem finding — feed it back as instrumentation work.

## Declaring

- **Anyone can declare.** Declaration must be one cheap, rehearsed action:
  open the incident channel, state severity, name the IC.
- **Declare on strong suspicion, not confirmation.** The cost asymmetry is
  total: an over-declared incident is downgraded and closed in minutes; a
  late declaration means no timeline, no roles, a comms vacuum and three
  people independently restarting the same service.
- Declaration starts the clock — detection time is a postmortem datum and,
  in regulated sectors, a legal one.
- What declaration buys: a single place for state, an accountable
  decision-maker, a scribe, and the communication cadence rules.

## The severity matrix in depth

| Severity | Definition | Examples | Response posture |
|---|---|---|---|
| **SEV1** | Critical user journey down, or active data loss/corruption, or security breach in progress | Checkout fails for all users; primary DB corrupting writes; credential leak | Page now; IC + dedicated comms lead + scribe; exec notification; all-hands until mitigated; statutory clocks may start |
| **SEV2** | Major degradation or partial outage; no reasonable workaround | Latency 10× on a core flow; one region down; sign-ups failing | Page now; IC assigned; status page if user-visible; sustained response |
| **SEV3** | Minor impact, workaround exists, or a small user subset | Non-core report broken; degraded search ranking | Business hours; ticketed owner; no page |
| **SEV4** | Cosmetic or internal-only | Misaligned dashboard widget | Backlog |

Rules that keep the matrix honest:

- **Classify by user impact and trajectory**, never by which component
  broke or how hard the fix looks. A one-line fix to a down checkout is
  still SEV1.
- **Unknown defaults up.** "We don't know how bad it is" is a reason to
  raise severity, not to wait.
- **Severity is a routing decision, not a verdict.** Revisit it on the IC's
  cadence; downgrade only with evidence the impact is contained. Upgrades
  are free and instant.
- **One org-wide definition table.** Per-team severity dialects make
  cross-team escalation incoherent.

## Anti-patterns

- **Severity negotiation while users hurt** — classify from the written
  definitions, act, argue later in the postmortem.
- **Org-chart severity** — "an executive noticed" is not a severity
  criterion; impact is.
- **Waiting for the alert to confirm what support is already saying.**
- **Downgrading to avoid process** — if SEV2 process feels too heavy for
  real SEV2s, fix the process, don't misclassify.

## Statutory clocks (July 2026 — re-verify)

Some severities start legal timers the moment of *awareness*: EU NIS2
requires an early warning within 24 hours and an incident notification
within 72 hours for significant incidents in in-scope sectors; GDPR
requires notifying the supervisory authority within 72 hours of a personal
data breach. Mark in your severity definitions which levels trigger which
clocks, and who owns the filing — scope and detail belong to
`secure-development`.
