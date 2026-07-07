# Failure modes and resilience

The happy path is the least interesting thing about a design. Systems
spend their lives partially failing, and the structure decides whether
that's invisible, degraded or catastrophic. This walk is the part of the
review most often skipped and most often vindicated.

## The failure walk

Take the container view (`c4-and-views.md`) and interrogate **every
arrow** four ways:

| The dependency is… | The question |
|---|---|
| **Down** | What does the caller do — fail, degrade, queue? Who notices? |
| **Slow** | The dangerous one. Do timeouts exist and are they shorter than the caller's own budget? Or do threads/connections pile up until the caller dies too? |
| **Wrong** | Corrupt/stale/unexpected data — is it validated at the seam, and can bad data propagate into storage? |
| **Duplicated/reordered** | Retries and messaging make this normal — is the consumer idempotent? (`event-driven-development`) |

Then for **every box**: what state does it hold, what's lost if it dies
right now, how does a replacement catch up?

## Blast radius and single points of failure

- For each component: if it fails, **which user journeys stop?** Rank
  by radius; the widest-radius components deserve the strongest
  isolation and scrutiny.
- Hunt non-obvious SPOFs: the shared cache everything secretly needs,
  the auth service in front of every request, the one queue all events
  cross, the certificate/secret that expires, the singleton scheduler,
  the person who runs the deploy.
- Shared infrastructure couples failure domains: two "independent"
  services on one database instance fail as one
  (`coupling-cohesion-and-boundaries.md`, operational coupling).

## Cascading failure — the pattern to catch on paper

Most large outages are amplification, not the initial fault: a slow
dependency → callers exhaust connection pools → *their* callers time
out → retries multiply the load ("retry storm") → recovery is impossible
until traffic is shed. Review for the amplifiers:

- Retries without backoff, jitter and a **budget** (bounded attempts).
- Timeouts missing, or longer than the upstream caller's timeout.
- Unbounded queues — they turn overload into latency, then into an
  out-of-memory failure; queues need limits and a shedding policy.
- No back-pressure: producers that never hear "slow down".
- Synchronised behaviour: fleet-wide cache expiry, cron stampedes,
  thundering-herd reconnects after a blip.

## Stability patterns to look for (design-level)

Timeouts on every remote call; bounded retries with exponential backoff
and jitter, only on idempotent operations; circuit breakers around
flaky dependencies; bulkheads (per-dependency pools/quotas) so one
failure can't drain shared resources; load shedding and rate limits at
the front door; **designed degraded modes** — cached/stale reads,
feature switches, read-only mode — rather than accidental ones. The
review question is not "are these words present" but "which failure in
the walk does each one actually contain?"

## Data loss and recovery

- What are the **RPO/RTO** per data store — stated, not implied? Do the
  business scenarios agree (`quality-attributes-and-tradeoffs.md`)?
- Backups exist when **restores are exercised** — an untested backup is
  a hope. When did a restore last run, and how long did it take?
- Distinguish replication (protects against hardware loss) from backups
  (protect against corruption and mistakes, which replicate perfectly).
- For event-sourced or queue-centric designs: can state be rebuilt, and
  how long does replay take at current volume?

## Capacity and growth

- The 10× question: which component breaks first at 10× load, and is
  that failure graceful? (An answer of "no idea" is a finding; a
  sensitivity point — `quality-attributes-and-tradeoffs.md` — if known.)
- Hidden multipliers: fan-out per request, per-tenant background jobs,
  O(n²) chatter between instances.

## The pre-mortem

Before a large build: "it is twelve months later and this architecture
has failed — write the incident summary." Ten minutes of this from each
reviewer surfaces the fears nobody volunteers in critique mode; cluster
the answers and treat the clusters as findings to walk.

## Routing

Verifying these properties in production (SLOs, alerts, chaos
experiments as automated checks) → `fitness-functions.md` and
`observability-development`. Running the incident when one fires →
`incident-response`. Security failure modes (malice, not entropy) →
`secure-development` threat modelling.
