# Fitness functions

A review that ends in prose evaporates; the conditions get forgotten and
the boundaries erode one commit at a time. A **fitness function** is an
automated, objective check on an architectural characteristic — the
mechanism (from Building Evolutionary Architectures, Ford/Parsons/Kua)
that makes a review's load-bearing findings *enforceable* between
reviews.

## What qualifies

An automated test with a threshold, an owner and a home in the
pipeline — judging the *architecture*, not a feature. "The web layer
never imports the persistence layer" is one; "checkout works" is a
functional test; "the code is clean" is not testable and so not a
fitness function.

## Taxonomy (enough to choose)

- **Atomic** (one characteristic, one place — a dependency rule) vs
  **holistic** (characteristics in combination — latency *under*
  security controls, in a realistic environment).
- **Triggered** (runs in CI/CD per change) vs **continuous** (runs in
  production — SLO burn alerts, synthetic probes, scheduled chaos).
- **Static** (pass/fail against a fixed threshold) vs **dynamic**
  (threshold shifts with context, e.g. scale).

Prefer triggered + atomic where possible: cheapest, fastest feedback,
easiest to keep honest.

## Attribute → executable check

| Characteristic | Fitness function |
|---|---|
| Layering / dependency direction | Import/dependency rules in CI (ArchUnit-style tests, dependency-cruiser and equivalents per stack) |
| Module/context boundaries | Forbidden-import checks between bounded contexts in a modular monolith (`coupling-cohesion-and-boundaries.md`) |
| Contract compatibility | Schema-diff / breaking-change gates on OpenAPI, GraphQL schemas, event schemas (`api-development`, `graphql-development`, `event-driven-development`) |
| Latency / throughput budgets | Load-test stage with SLO thresholds as the pass/fail gate (`testing-development`) |
| Availability / error budget | SLOs with burn-rate alerts in production (`observability-development`) |
| Resilience claims | Scheduled chaos experiments verifying the failure walk's answers (`failure-modes-and-resilience.md`) |
| Coupling drift | Trend metrics on afferent/efferent coupling or component size, alerting on regression |
| Supply chain / images | Dependency and image scanning gates (`secure-development`, `devops-development`) |
| Cost | Budget alerts and per-deploy cost diffing on infra changes (`terraform-development`) |
| Freshness of views | Diagrams-as-text generated or validated in CI so drift fails a build (`c4-and-views.md`) |

## Writing one that survives

Each fitness function records: **characteristic** (link it to the
quality-attribute scenario it protects —
`quality-attributes-and-tradeoffs.md`), **check** (the executable
thing), **threshold** (a number, reviewed like code), **trigger** (which
pipeline/schedule), **owner**, and **what a failure blocks** (merge,
deploy, or pages someone). A check that fails and blocks nothing is
decoration.

Sensitivity points found in review are the natural seeds: the parameter
that controls an attribute is exactly the thing worth watching
mechanically.

## The review's two jobs here

1. **Encode outgoing findings.** Every approve-with-conditions item and
   every load-bearing constraint gets asked: *can this be a fitness
   function instead of a hope?* "Approved provided the API layer never
   grows direct database access" is a dependency rule, not a memo.
2. **Audit the incumbents.** For a health-check review of a live
   system: which fitness functions exist, when did each last fail, and
   were failures fixed or thresholds quietly loosened? A suite that
   never fails is either protecting nothing or being ignored — both are
   findings.

## Keep the suite honest

- **Few and load-bearing** beats exhaustive: guard the top scenarios
  and the one-way doors, not every preference. Every function is
  maintenance and build time; prune ones whose characteristic no longer
  ranks.
- Thresholds change through review (they encode architectural intent),
  not through a failing build being inconvenient.
- Don't launder style preferences into "architecture" — lint rules
  belong to the language skills; fitness functions guard structure and
  budgets.
