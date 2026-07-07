---
name: architecture-review
description: >-
  Reviewing SYSTEM and software architecture — designs, proposals, ADRs,
  RFCs, C4 diagrams and running estates — as a discipline distinct from
  code review: quality-attribute and trade-off analysis, one-way-door
  hunting, coupling/cohesion and boundary judgement, failure-mode
  walking (blast radius, degraded modes, cascading failure), the
  simplest-thing gate, fitness functions, and judging ADR/design-doc
  decision quality. Use whenever asked to review
  an architecture, design doc, RFC, ADR or system diagram, evaluate a
  proposed design or technology choice, run a design gate before a build,
  assess an existing system's structure, or answer "will this design
  hold". Triggers include "review this design/architecture", "does this
  approach scale", "microservices vs monolith", "one-way door",
  "architecture health check", C4/container diagrams, and pre-build
  design sign-off. PROACTIVELY activate before approving any system
  design. Owns judging the design; reviewing the code diff stays with
  code-review-development.
---

# Architecture Review

How to review the design of a *system* the way a senior architect would —
as distinct from reviewing a code change. Code review asks "does this
change improve the codebase's health?"; architecture review asks **"will
this structure carry the stated requirements, what does it cost us
later, and how does it fail?"**. The reviewed artefact is a design doc,
an ADR, a set of diagrams, or a running estate — and the verdict shapes
months of work, so the review earns more rigour than taste.

The method here is distilled from scenario-based review practice (the
ATAM lineage), the C4 model, and evolutionary-architecture fitness
functions — all vendor- and stack-neutral. It applies at three moments:
the **design gate** before building, the **single decision** (an ADR),
and the **periodic health check** of what's actually deployed.

## Non-negotiables

1. **Review against named quality attributes, not taste.** No design is
   good in the abstract — it is fit *for something*. Force the "for
   what" into the open first: the top 3–5 quality attributes as
   concrete, measurable scenarios ("200 concurrent tenants at p95 <
   300 ms", not "scalable"). Adjectives are not requirements
   (`references/quality-attributes-and-tradeoffs.md`).
2. **Trade-offs must be explicit.** There are no best solutions in
   architecture, only trade-offs. A proposal with one option, no
   rejected alternatives and no stated costs is not reviewable — the
   first finding is "show the alternatives and what this choice pays
   for what it buys".
3. **Spend review budget on the one-way doors.** Scrutiny in proportion
   to reversibility: data models, wire formats, public contracts, ID
   schemes, auth boundaries, build-vs-buy and module topology get the
   deep look; reversible choices get a light touch and a "two-way door"
   label (`references/adrs-and-design-docs.md`).
4. **Ask "how does it fail", not just "does it work".** Every arrow in
   the diagram is a failure point. Walk the failure modes: blast
   radius, degraded mode, recovery path, data loss. A design with no
   failure story is incomplete, whatever its happy path looks like
   (`references/failure-modes-and-resilience.md`).
5. **Judge the seams.** Coupling, cohesion and data ownership at the
   boundaries carry the design; a distributed system with entangled
   boundaries is a distributed monolith — all of the operational cost,
   none of the autonomy
   (`references/coupling-cohesion-and-boundaries.md`).
6. **Apply the simplest-thing gate.** Ask what the simplest architecture
   satisfying the *actual* scenarios is; every increment of complexity
   must buy a named quality attribute. Speculative microservices,
   event sourcing or multi-region for imagined scale is a finding, not
   foresight.
7. **Findings are risks phrased as scenarios, with severity.** "If X
   happens, Y fails, because Z" — locatable, arguable, testable. Label
   blocking vs advisory exactly as code review labels comments; a wall
   of unweighted concerns fails the author.
8. **End with a verdict and encode the keepers.** Approve /
   approve-with-conditions / revise — then record decisions as ADRs and
   convert load-bearing constraints into fitness functions so the
   review outlives the meeting (`references/fitness-functions.md`).
9. **Ground in the real system.** For an existing estate, diagrams
   drift: verify claims against the repository, dependency graph and
   telemetry before trusting them. Review what runs, not what's drawn.

## What kind of review is this?

| Occasion | Shape |
|---|---|
| New system / major feature, pre-build | Full design gate: scenarios → views → trade-offs → failure walk → verdict |
| A single significant decision | ADR review: alternatives honestly weighed, consequences owned, door labelled (`references/adrs-and-design-docs.md`) |
| Periodic health check of a live estate | Drift-focused: fitness-function results, boundary erosion, dependency audit, scenario re-run |
| Before a large/risky build starts | Pre-mortem: failure-mode walk only — "it's a year later and this failed; why?" |
| Technology / vendor selection | Scenario-scored comparison against the same quality attributes |
| After an incident | Targeted re-review of the implicated seams (running the incident itself → `incident-response`) |

## High-frequency pitfalls

- **Reviewing the diagram, not the system** — accepting boxes and
  arrows that no longer match the code; missing legends and mixed
  abstraction levels hiding the real structure
  (`references/c4-and-views.md`).
- **Adjective-ware** — "robust, scalable, future-proof" with no
  scenario or number behind any of it.
- **The one-option proposal** — alternatives absent or strawmanned so
  the pet design wins.
- **Litigating taste while missing the killer** — an hour on framework
  preference, no minutes on the unbounded queue between two services.
- **Ivory-tower verdicts** — reviewing without the people who operate
  the system, or approving designs the reviewer never has to run.
- **Best-practice cargo-culting** — prescribing microservices,
  event-driven or multi-cloud because they're canonical, when a modular
  monolith meets every stated scenario.
- **Fighting Conway's law** — approving an architecture whose seams cut
  across team ownership; the org chart will win.
- **Blocking on perfection** — approve when the design carries the
  requirements and the risks are known and accepted, not when it's
  flawless (code review's standard, transplanted).

## Workflow

1. **Demand a reviewable input.** Design doc or ADR, views/diagrams at
   the right level, prioritised quality-attribute scenarios,
   constraints. Missing pieces are the first findings — send back for
   completion rather than guessing
   (`references/adrs-and-design-docs.md`).
2. **Understand before judging.** Restate the design and its drivers
   back to the author; misunderstood designs produce noise findings.
3. **Walk the scenarios.** Run each priority scenario through the
   design — happy path, then failure, then growth (10× load, new
   tenant, new region) (`references/review-method.md`).
4. **Probe the seams.** Boundaries, coupling, data ownership,
   synchronous chains, shared persistence.
5. **Hunt the one-way doors** — each deliberate, justified and
   labelled; run the simplest-thing gate on the complexity budget.
6. **Walk the failure modes** — every arrow: slow, down, wrong,
   duplicated; blast radius and recovery
   (`references/failure-modes-and-resilience.md`).
7. **Write findings as scenario-phrased risks with severity**, plus
   explicit non-risks (what you checked and found sound — it saves the
   next review).
8. **Deliver the verdict and encode it**: approve/conditions/revise,
   ADRs for decisions made, fitness functions for constraints worth
   automating, owners and dates for conditions.

## Reference index

Load on demand:

- `references/review-method.md` — the scenario-based review end to end:
  inputs, roles, the walk, probing questions, outputs and verdicts,
  async vs workshop formats
- `references/quality-attributes-and-tradeoffs.md` — the -ilities
  catalogue, concrete quality-attribute scenarios, prioritisation,
  trade-off and sensitivity points
- `references/c4-and-views.md` — C4 levels and what each answers, what
  makes a diagram reviewable, supplementary views, catching diagram
  drift
- `references/coupling-cohesion-and-boundaries.md` — judging seams:
  coupling dimensions, data ownership, bounded contexts, the
  distributed-monolith symptom list, Conway alignment
- `references/failure-modes-and-resilience.md` — the failure walk:
  blast radius, cascading failure, stability patterns to look for,
  capacity and data-loss questions, the pre-mortem
- `references/fitness-functions.md` — encoding review outcomes as
  automated checks: taxonomy, examples per attribute, writing and
  auditing them
- `references/adrs-and-design-docs.md` — judging decision records and
  design docs: the ADR quality bar, completeness gates, the send-back
  rule, comment craft for design findings

## Boundaries

- **Reviewing the code change itself** → `code-review-development` —
  the after-the-merge-request mirror of this skill; its
  severity/blocking rubric and comment craft apply here unchanged.
- **Producing the design or plan** → `visual-plan` (grounded
  implementation plans) and the project's architect role; this skill
  judges what they produce.
- **Authoring ADRs and design docs** (structure, anatomy, prose) →
  `technical-writing`; this skill reviews the *decision quality* inside
  them. **Prose style** → `uncanny`.
- **Authoring/exporting the diagrams** → `drawio-development`.
- **Security architecture depth** — threat modelling, STRIDE, trust
  boundaries → `secure-development`; this skill flags the seam and
  routes.
- **Operability depth** — SLOs, instrumentation, alerting →
  `observability-development`; **incident process and postmortems** →
  `incident-response` (their findings are review input).
- **Domain-deep review** of a specific layer → the owning skill:
  `api-development` (HTTP contracts), `graphql-development` (graph
  design), `event-driven-development` (messaging semantics),
  `sql-development` (data), `identity-development` (auth flows),
  `kubernetes-development`/`containers-development`/
  `terraform-development` (platform and infra),
  `web-performance-development` (browser performance budgets).
- **Executing a modernisation** the review recommends →
  `legacy-modernisation`.
