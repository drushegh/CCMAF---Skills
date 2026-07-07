# The review method

Scenario-based review, distilled from the ATAM lineage into a shape that
works async-first and fits an afternoon, not a week. The core move never
changes: **run concrete scenarios through the proposed structure and
watch where it bends.**

## Inputs — the price of admission

- The design doc or ADR set (completeness gates →
  `adrs-and-design-docs.md`).
- Views at the right level — at minimum context and container
  (`c4-and-views.md`).
- The **prioritised quality-attribute scenarios** (top 3–5,
  measurable — `quality-attributes-and-tradeoffs.md`).
- Constraints: budget, team shape and skills, deadlines, compliance,
  existing estate.
- For a live system: fitness-function results, dependency graph,
  incident history, key telemetry.

Missing inputs are findings, not gaps to fill by guessing. The
send-back is a service to the author: "not reviewable yet — here is
exactly what's missing."

## Roles

- **Reviewer(s)**: not the design's author — the author defends, a
  fresh set of eyes judges (same separation as code review).
- **The author**: present and answering; the review is a dialogue, not
  an ambush.
- **An operator voice**: someone who will run the system. Designs
  approved without one systematically under-weight operability.
- Keep it small — two or three reviewers beat ten; more than that turns
  judgement into theatre.

## The walk

1. **Author presents drivers, then the design** (15 minutes, not 60):
   business goals, the prioritised scenarios, the shape of the
   solution, the alternatives rejected.
2. **Reviewer restates it back** until the author agrees the reviewer
   has it right. Cheap insurance against noise findings.
3. **Scenario walk** — for each priority scenario, trace it through the
   views: which components touch it, where the data goes, what the
   latency/consistency budget is. Then the failure variant
   (`failure-modes-and-resilience.md`), then the growth variant.
4. **Probe** with the question catalogue (below), logging three kinds
   of point as you go — **risks** (scenario-phrased, severity-labelled),
   **sensitivity points** (one parameter controls an attribute) and
   **trade-off points** (one decision moves two attributes in opposite
   directions).
5. **Verdict** — approve / approve-with-conditions / revise-approach,
   plus who owns each condition and by when.

## The question catalogue

Probing questions that earn their keep (extend per domain):

- What is the simplest design that meets these scenarios, and why is
  this not it?
- Which decisions here are one-way doors, and were the alternatives
  actually costed?
- What happens when *this* dependency is slow — not down, slow?
- Who owns this data? Who else writes it? What breaks when the schema
  changes?
- What must be true of the team/org for this structure to work
  (Conway)?
- How do we observe this in production — what tells us it's failing
  before users do?
- What's the rollout and rollback story — can we ship this
  incrementally?
- What in this design would we regret at 10× load or 10× team size?
- What would make us retire this design, and would we notice?

## Output — the review record

Keep it to a page or two of Markdown, in the repo next to the design:

- Context: what was reviewed, at what stage, by whom, when.
- Scenarios walked and the result of each.
- Findings table: severity | risk (as a scenario) | affected seam |
  recommendation.
- Non-risks: what was probed and found sound.
- Sensitivity and trade-off points worth remembering.
- Verdict + conditions with owners, ADRs raised, fitness functions to
  add (`fitness-functions.md`).

## Async vs workshop

Default async: reviewers read and comment on the doc in their own time;
one short session resolves only the contested points. Reserve the full
workshop for genuinely novel or high-blast-radius designs. Time-box
either way — an unbounded review is how one-option proposals get
approved by exhaustion.

Findings phrasing and blocking/non-blocking labels follow the code
review discipline (`code-review-development`) — the artefact differs,
the comment craft doesn't.
