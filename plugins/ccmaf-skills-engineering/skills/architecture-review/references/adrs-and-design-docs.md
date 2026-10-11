# Reviewing ADRs and design docs

This reference judges the **decision content** of architecture decision
records and design documents. Their structure, anatomy and prose belong
to `technical-writing` — if the document is missing sections or is
unreadable, route there; if the sections exist but the decisions inside
are weak, this is the checklist.

## The ADR quality bar

An ADR is reviewable when every line of this holds:

- **A decision is actually made.** "We will use X" — not "we should
  consider X" or a survey of options with no commitment. Status is
  explicit (proposed/accepted/superseded).
- **The context states real forces**: the constraints, scenarios and
  facts in play at the time — enough that a reader in two years
  understands why this was sensible *then*.
- **Alternatives are honestly weighed.** At least one credible
  alternative, described strongly enough that a fair person might pick
  it (steel-manned, not strawmanned), with the reasons it lost. "Do
  nothing" usually belongs on the list.
- **Consequences include the negatives.** Every real decision costs
  something (`quality-attributes-and-tradeoffs.md`); an ADR listing
  only benefits hasn't found its trade-off yet — send it back.
- **The door is labelled**: one-way (expensive to reverse — data
  models, wire formats, ID schemes, auth boundaries, vendor lock-ins,
  module topology) or two-way (revisitable cheaply). One-way doors get
  proportionally deeper review; a two-way door with a fair rationale
  should be approved briskly — don't gold-plate reversible decisions.
- **Verifiable claims are grounded.** Benchmarks, quotas, pricing and
  compatibility claims carry sources and dates (fast-moving facts need
  a re-verify note); consequential unverified claims are findings —
  demand the evidence (`read-the-damn-docs` discipline applies to
  decision inputs too).

Common ADR anti-patterns: the **retrofitted ADR** (recording a decision
long since built — acceptable as an honest historical record, useless
as review; mark which it is); **ADR sprawl** (ceremony around trivial,
reversible choices — the gate is significance); **the eternal
"proposed"** (decisions in limbo that the team follows anyway);
**superseding by silence** (new ADR contradicts an old one without
linking or updating its status — the log is now lying).

## Design docs — the completeness gates

A design doc is *reviewable* when it contains, in some form:

1. The problem and the drivers — prioritised, measurable scenarios
   (`quality-attributes-and-tradeoffs.md`).
2. Constraints (team, budget, deadlines, estate, compliance).
3. The proposed design with views at the right level
   (`c4-and-views.md`).
4. Alternatives considered, with the trade-offs that decided it.
5. A failure story (`failure-modes-and-resilience.md`).
6. Rollout: migration path, increments, rollback (executing a
   modernisation → `legacy-modernisation`).
7. Open questions, stated as such — hidden unknowns are worse than
   listed ones.

**The send-back rule:** if the gates aren't met, the review's output is
a precise list of what's missing — not a guessed review of the
fragment. Reviewing an incomplete doc rewards under-specification and
produces findings the next draft invalidates. Send-backs are fast,
kind, and name exactly what unblocks the review.

## Comment craft for design findings

The mechanics mirror code review (`code-review-development` owns the
craft; it transfers whole):

- **Risks as scenarios**: "if the tenant count passes ~200, the
  per-tenant scheduler saturates the pool and onboarding stalls" — not
  "I don't like the scheduler".
- **Severity + blocking status on every finding**, blockers first. A
  design review that lists twelve unranked concerns has failed the
  author.
- **Questions before objections** where intent is unclear — "what
  keeps X and Y consistent?" often dissolves or sharpens the finding.
- **Name the non-risks**: what you probed and found sound is signal for
  the next reviewer and fair credit to the author.
- **Verdict, always**: approve / approve-with-conditions (each
  condition with an owner and, where possible, a fitness function —
  `fitness-functions.md`) / revise-approach (with the specific gate
  that failed). Perfection is not the bar; carrying the stated
  scenarios with known, accepted risks is.

## After the review

Decisions made or changed *in* the review become ADRs themselves —
that's the review's paper trail. Update superseded records' status,
link forward, and file the review record (`review-method.md`) beside
the design so the next reviewer inherits the reasoning, not just the
verdict.
