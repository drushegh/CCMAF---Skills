# SLIs, SLOs and error budgets

An SLO turns "is the service reliable?" into a number both engineering and
the business can act on. Without one, alerting is vibes and reliability work
never gets prioritised until an outage does it.

## SLIs — what to measure

An SLI is a **ratio of good events to valid events**, measured as close to
the user as you can get (load balancer / edge beats in-process; in-process
beats the dependency's own view):

| SLI type | Definition | Example |
|---|---|---|
| Availability | non-5xx responses / valid requests | 99.95% of requests succeed |
| Latency | responses faster than T / valid requests | 99% of requests complete < 300 ms |
| Quality/correctness | responses served from the full (non-degraded) path | 99.9% served fresh, not from stale cache |
| Freshness (pipelines) | records processed within T of arrival | 99% of events processed < 5 min |

Notes that keep SLIs honest:

- Express latency as a **proportion under a threshold**, not "p99 < X" —
  the ratio form composes into an error budget; the percentile form doesn't.
- Define **valid**: exclude health checks and bot noise deliberately, and
  say so. Excluding "requests during the incident" is cheating.
- SLIs follow **user journeys** (checkout works) more than microservices —
  one user-facing SLO can cover several internal services.

## SLOs — the target

- Set from **history and user need**, not aspiration. If the service did
  99.2% last quarter, a 99.9% SLO is fiction that produces permanent
  alarms.
- **100% is the wrong target.** Each extra nine costs roughly 10× and users
  behind flaky networks can't tell the difference. The gap to 100% is the
  budget you deliberately spend on change.
- An SLO is a **window + target**: "99.9% over a rolling 30 days." Rolling
  windows beat calendar months for alerting (no monthly amnesia).

## Error budgets

Budget = 1 − SLO. At 99.9% over 30 days: 0.1% ≈ **43 minutes** of full
downtime, or the equivalent spread as partial failure.

The budget is a *policy instrument* — agree in advance what happens when it
runs out (typical: feature freezes in favour of reliability work, riskier
deploys stop, postmortem actions jump the queue). An SLO with no consequence
attached is a dashboard decoration.

## Burn rate — how to alert on an SLO

Burn rate = how fast you consume budget, as a multiple of the sustainable
rate (burn 1 = exactly the whole budget over the window).

Alert on **fast burn** (page) and **slow burn** (ticket), each with a long
window for accuracy plus a short window so the alert resets once the problem
stops. The standard multiwindow setup for a 30-day SLO (Google SRE Workbook
numbers — re-verify against your window if different):

| Burn rate | Long / short window | Budget consumed at trigger | Response |
|---|---|---|---|
| 14.4× | 1 h / 5 m | 2% in 1 hour | **Page** |
| 6× | 6 h / 30 m | 5% in 6 hours | **Page** |
| 1× | 3 d / 6 h | 10% in 3 days | Ticket |

Both windows must exceed the threshold to fire. This structure is why
SLO-based alerting out-performs threshold alerting: it pages exactly when
the budget is genuinely threatened, at severity proportional to burn.

## Implementation notes

- Compute SLIs from **counters/histograms via recording rules** (or the
  backend's SLO feature), not ad-hoc dashboard queries — alerts and reports
  must agree with each other.
- Sampled traces are the wrong substrate for SLIs; use metrics or complete
  logs.
- Start with **one or two SLOs per user journey**. Twenty SLOs on day one
  means none of them matter.
- Review quarterly: tighten targets that never burn, loosen or re-scope the
  ones that page weekly without user complaints.
