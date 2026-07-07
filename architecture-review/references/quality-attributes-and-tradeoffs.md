# Quality attributes and trade-offs

Architecture *is* the quality attributes: the functional behaviour could
usually be built a dozen ways; the structure is chosen for how it
performs, scales, changes, fails and runs. A review that never names the
attributes is reviewing aesthetics.

## The catalogue (working set)

Grouped by when the attribute is exercised. ISO/IEC 25010 (2023
revision) is the neutral taxonomy if a formal one is needed (July 2026 —
re-verify edition before citing); this working set is what reviews
actually use:

| Group | Attributes |
|---|---|
| Runtime | Performance (latency/throughput), scalability, availability, reliability, security, usability |
| Change | Modifiability/evolvability, testability, deployability, portability, extensibility |
| Operation | Operability, observability, recoverability, capacity/cost efficiency |
| Cross-cutting | Simplicity (the attribute that buys all the others), compliance/auditability |

Two truths the review enforces: **you can't maximise them all** (most
pairs trade off), and **unstated attributes are decided by accident**.

## Scenarios, not adjectives

An attribute claim is reviewable only as a **quality-attribute
scenario**: *source → stimulus → environment → artefact → expected
response → response measure*. In practice a compact sentence carrying a
number:

- "During the month-end batch (environment), a tenant admin uploads a
  50k-row file (stimulus); import completes within 5 minutes and the UI
  stays under 500 ms p95 (measure)."
- "A region loses the primary database (stimulus, failure mode); reads
  continue degraded, writes recover within 15 minutes, zero committed
  transactions lost (measure)."
- "A new developer (source) adds a payment provider (stimulus) touching
  ≤ 2 modules and shipping inside a sprint (measure — modifiability)."

The review's first act: get the top 3–5 scenarios stated, measurable
and **prioritised** by the people accountable for the product. If the
author can't rank them, that ranking session *is* the review's most
valuable output.

## Trade-off analysis

Every structural decision buys some attributes with others. The
review's job is making the exchange rate explicit:

| Choosing | Typically buys | Typically pays |
|---|---|---|
| Distribution (services) | Independent deploy/scale, team autonomy | Latency, partial failure, operational load, consistency |
| Strong consistency | Correct invariants | Availability under partition, latency, coupling |
| Asynchronous integration | Decoupling, absorbs load spikes | Eventual consistency, harder reasoning, duplicated delivery (`event-driven-development`) |
| Caching | Latency, cost | Staleness, invalidation complexity |
| Buy/SaaS over build | Time to market, undifferentiated heavy lifting | Lock-in, integration seams, roadmap dependence |
| Abstraction/indirection layers | Swappability, testability | Cognitive load, debugging distance, performance |
| Multi-region | Availability, locality | Cost, data-residency complexity, consistency design |

For each significant decision, ask: *which prioritised scenario does
this serve, and which does it tax?* A decision taxing a top-3 scenario
to serve an unranked one is a blocking finding.

## Sensitivity and trade-off points (ATAM vocabulary)

- **Sensitivity point** — one parameter materially controls an
  attribute: the queue's max depth, the cache TTL, the connection-pool
  size, the sync-call timeout. Log them; they're where tuning and
  incidents will happen, and each is a candidate fitness function
  (`fitness-functions.md`).
- **Trade-off point** — one decision is a sensitivity point for two or
  more attributes in opposite directions (replication factor:
  durability up, write latency and cost up). These deserve the
  most explicit sign-off, because they can't be tuned away later.

## Anti-patterns in the wild

- **Adjective-ware** — "highly scalable and resilient" with no number;
  send back for scenarios.
- **All attributes priority one** — a ranking with no losers is not a
  ranking.
- **Imported requirements** — "five nines" copied from a template when
  the business survives an hour of downtime; over-specified attributes
  buy real complexity with imaginary need (the simplest-thing gate cuts
  both ways).
- **Attribute laundering** — justifying a pet technology by the one
  attribute it helps, silent on the three it hurts.
