# Opus 5 as orchestrator

Opus 5's multi-agent behaviour is strong: it coordinates teams of subagents
well, writer-verifier patterns are effective, and cases of agents
overwriting each other's work are rare. The discipline is therefore not
*how* to delegate but **whether** — it delegates more readily than prior
models, and delegation multiplies cost and wall-clock when applied to work
that did not need it.

## The delegation gate

Delegate only when **all four** hold:

1. **Large** — not finishable in a handful of tool calls.
2. **Genuinely independent** — no ordering dependency on another track, and
   no shared file the tracks would both write.
3. **Parallelisable** — running the tracks concurrently is the actual win.
4. **Not self-re-reading** — do not spawn an agent to re-read and confirm
   what you just produced. Same context, same priors, cost multiplier
   attached. Read the distinction below before applying this to *all*
   review.

Canonical yes: a wide multi-file investigation across unrelated subsystems.
Canonical no: "read these three files and summarise", "confirm the fix
works", "review what I just wrote".

## Self-re-reading is not independent review

Rule 4 is routinely over-read into "never have anything reviewed". Two
different patterns hide behind the word *verify*:

| Pattern | What it adds | Verdict |
|---|---|---|
| A subagent re-reads your output against the same context to confirm it | Little — it shares your priors and your blind spots | Skip |
| A party with a **different prior** reviews the work, or two parties cross-review each other's conclusions | Findings one perspective structurally cannot reach | Keep where stakes justify it |

The second is not self-verification and rule 4 does not forbid it. Observed:
in a two-seat cross-review, one seat **withdrew a position it had argued at
length** after reading the other's answer — an outcome no amount of
self-checking produces, because the disagreement was the mechanism.

It is still delegation, so it still owes the other three gate conditions:
size, independence, parallelisability. Use it on consequential forks, not on
routine output.

**Governance rules are a separate axis.** Where a process requires that the
author of a claim is not its acceptance gate, that is a rule about
*authority* — who is allowed to sign off — not a claim that the model cannot
check itself. This skill does not override it, and satisfying it is not
over-verification.

**If one agent can complete the task, use one.** Keep spawn counts low, and
prefer a deterministic cap in the harness over an instruction where cost
control genuinely has to hold — an instruction is advisory, a cap is not.

## Effort for subagents

`low` is explicitly suited to subagents. A fan-out of ten agents at `xhigh`
is the most expensive shape available and rarely the most accurate one.
Reserve higher effort for the stages that need judgement — a final
synthesis, an adversarial check on a contested finding — and run mechanical
stages (grep-and-report, per-file transforms, extraction) low.

Effort is per request, so mixed-effort fleets are free to construct: cheap
finders, expensive judge. See `effort-and-thinking.md`.

## Brief the whole task up front

Opus 5 performs best on agentic coding when **given the complete task
specification up front and left to run**. It completes full tasks rather
than leaving stubs or placeholders, so the expensive failure is an
underspecified brief, not an over-long one — a missing constraint surfaces
after a whole feature is built the wrong way.

This cuts against drip-feeding instructions turn by turn. Front-load intent,
acceptance criteria, scope boundaries and known constraints; then let it
run. (Spec shape → `llm-development`, `references/prompt-engineering.md`;
plan-as-approval-gate → `visual-plan`.)

## Use the context window instead of fragmenting

The context window is 1M tokens — both default and maximum — and instruction
following, tool calling and reasoning stay consistent throughout it. Two
consequences for orchestration:

- **Splitting work across agents purely to save context is often
  unnecessary.** Delegate for independence and parallelism, not because a
  task "won't fit".
- Where a subagent *is* right, the classic reason still applies: keep
  sub-task detail out of the main loop and return only the conclusion.

## Review and bug-finding passes

Opus 5 finds real bugs at a high rate per pass, with most additional
findings being real issues rather than false positives, and accuracy holds
at lower effort. That supports a **two-pass shape**: a fast cheap pass at
review time, a thorough pass later.

**Do not put the filter in the finder's prompt.** "Only report high-severity
issues" or "be conservative" is followed literally and suppresses genuine
findings. Ask for everything, then filter in a separate pass — a
severity-ranking stage, a dedup, or a judge — where the filter is visible
and tunable rather than baked into recall.

## Narration in a long orchestration

Per-message output in agentic sessions runs long by default, and the model
announces what it is about to do. Over a multi-hour orchestration that
accumulates into a wall of updates the user will not read. Set the cadence
explicitly at the start (`prompt-blocks.md`): one sentence before the first
tool call, updates only on a real finding or a change of direction, and an
outcome-first close.

## Vision and visual verification

Vision is strong on charts, documents, diagrams, and UI/frontend
replication, and it is **strongest when the model has tools to iteratively
analyse, crop and visually verify its work**. Tool use is a more
cost-effective lever here than raising effort. Prompt-side vision
workarounds tuned for older models should be re-validated — many are now
dead weight. (The render → view → critique loop → `ui-verification`.)

## Office and document output

Opus 5 generates complex multi-sheet spreadsheets with non-trivial formulas
and well-structured slide decks. These follow instructions about house style
— supply the specific styles or templates it should follow rather than
expecting a default that matches your organisation. Pair with the
deliverable-length calibration in `prompt-blocks.md`; generated documents
run long unless told otherwise.

## Pacing a long run

Usage-window budgeting, checkpointing between waves and resuming after a
reset are a separate discipline → `stay-within-limits`. Effort choice is the
per-request cost lever; that skill owns the across-session one.
