# Strangler Fig and Incremental Replacement

The strangler fig (named by Martin Fowler, 2004, after the fig that
grows around a host tree until the host is gone) replaces a system
piecemeal: put an interception layer in front, route one slice of
functionality at a time to a new implementation, and retire the old
system incrementally — with the whole estate working throughout. It is
the default strategy for "working system, wrong platform", because it
converts one huge irreversible bet into many small reversible ones.

## Prerequisites

- **An interceptable boundary.** HTTP: a reverse proxy, gateway or
  router in front. Messaging: the topic/queue itself is the boundary.
  In-process: a facade you introduce first. No boundary, no strangler —
  creating one is step zero.
- **Sliceable functionality** — routes, use-cases, message types or
  modules that can move one at a time, each with its data story.
- **A retirement plan with an owner.** Progress is measured in old code
  *deleted*, not new code written. Without an owner and a measure, you
  get the eternal strangler (below).

## The loop

For each slice: build the new implementation → route a controlled share
of real traffic to it (flag, cohort or percentage) → verify against the
old (parallel run, below) → cut over fully → **delete the old path and
its routing rule**. The delete is part of the slice, not a someday.

## Branch by abstraction

The in-process counterpart, for swapping a component you can't intercept
externally (a library, a data layer, an engine):

1. Introduce an abstraction over the old component; move callers onto
   it (mechanical → codemod).
2. Build the new implementation behind the same abstraction, in main,
   dark.
3. Flip callers by feature flag — per environment, per cohort, then
   everywhere.
4. Remove the old implementation, and the abstraction too if it earned
   no other keep.

Everything integrates continuously in main; no long-lived migration
branch drifts away from reality (branch strategy → `git-workflow`).

## Flags and cutover

Migration flags are operational switches: the flag *is* the rollback,
so it must be flippable at runtime without a deploy, and monitored.
Flag hygiene is part of the retirement plan — a finished migration
leaves no flag behind. Sequence cutovers so each step is compatible
with both states of the flag (the code-side analogue of expand–contract;
the schema side belongs to `sql-development`).

## Parallel run (shadow verification)

The strongest verification legacy work has: run old and new on the same
real inputs, compare outputs, act only on the old until the diff is
clean.

- **Shadow reads:** duplicate real requests to the new path; diff
  responses (after scrubbing legitimate variance — ids, timestamps);
  log mismatches with full context. Serve from the old.
- **Writes need care:** never double-write to shared state casually —
  shadow writes go to a separate store, or are verified by dual-write +
  reconciliation with one system authoritative. Dual-write without a
  reconciliation job is how datasets quietly fork; backfill + compare
  before any cutover of the source of truth.
- **Triage every mismatch** before increasing traffic: new-code bug
  (fix), old-code bug (decide — see characterisation rules), or benign
  variance (scrub it). Unexplained mismatch = cutover blocked.
- Budget for it: a parallel run doubles load on shared dependencies.

## Rollback design

Per slice, before cutover, write down: the way back (flag off, route
back, revert commit, restore), how long the way back remains valid
(data written in the new shape may not be readable by the old), and the
**point of no return** — the contract step after which rollback becomes
roll-forward. Steps after the point of no return get the strictest
verification. If a slice has no viable rollback, make it smaller until
it does.

## Sequencing slices

Start with a slice that is **low-risk but real** — real traffic, real
data, small blast radius — to prove the pipeline (routing, flags,
parallel-run tooling, telemetry). Then prioritise by where change
pressure is: slices the business needs to modify next deliver
modernisation and feature work together, which is what keeps the
migration funded. Leave the stable, untouched core for last — it may
outlive the migration happily.

## The eternal strangler

The pattern's characteristic failure: both systems alive for years, every
change made twice, the "temporary" routing layer now load-bearing
infrastructure. Causes: no retirement owner, progress measured by new
code, slices that never delete the old path, feature freeze breaking the
business's patience. Defences: the delete-is-part-of-the-slice rule, a
visible old-code burndown, and time-boxing — a strangler with no
deletions in a quarter is a stalled strangler, and stalling is a decision
someone should be making consciously.

## When a rewrite is actually right

Rarely, and only when the strangler's prerequisites genuinely fail:
the scope is small and isolated enough to rebuild inside one delivery
cycle; behaviour is fully specified by tests or a spec you trust
(or the old system is so broken that behaviour-preservation is
explicitly not a goal); the platform is truly dead (unbuildable
toolchain, unlicensable runtime); and the old system can be frozen for
the duration. All four, honestly assessed — and even then, ship the
rewrite behind the same interception-and-parallel-run discipline. A
rewrite justified by "the code is ugly" is the second-system trap with
better marketing; record the decision either way as an ADR
(→ `technical-writing`).
