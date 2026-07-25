---
name: opus-5-calibration
description: >-
  Operate Claude Opus 5 well — the model whose failure mode is excess, not
  deficiency. Covers the behaviours it does not self-regulate (response
  length, progress narration, written-deliverable length, task scope,
  subagent delegation), the legacy instructions that now backfire on it
  ("add a verification step", "double-check", "only report high-severity",
  "do not think"), effort as the primary cost lever (default `high`;
  `low`/`medium` liberally; `xhigh` when demanding), and the
  thinking-disabled artifacts (tool calls emitted as text, leaked internal
  tags). Use in both directions: when Opus 5 is doing the work — especially
  as an orchestrator deciding whether to delegate — and when writing a
  system prompt, CLAUDE.md, subagent prompt or harness targeting it.
  Triggers: `claude-opus-5`, `output_config`/effort, disabling thinking,
  "too verbose", "it did more than I asked", "too many subagents",
  migrating prompts from Opus 4.7/4.8. General prompt engineering, evals
  and harness design → llm-development.
metadata:
  author: Damien (distils Anthropic's "Prompting Claude Opus 5", "Effort" and
    "What's new in Claude Opus 5" documentation, retrieved 2026-07-25)
  version: 1.0.0
---

# Opus 5 Calibration

Most model-specific prompting guidance tells you what to add to compensate
for a weakness. Opus 5 inverts that. It completes whole tasks rather than
leaving stubs, verifies its own work unprompted, and catches its own
mistakes — so its characteristic failure mode is **excess, not deficiency**:
longer answers, more narration, wider scope, more delegation, more
re-checking than the task earned.

**Calibrating Opus 5 is subtraction first, then explicit dials.** Delete the
instructions written for weaker models — they compound with behaviour the
model already has — then set the handful of behaviours it genuinely does not
self-regulate. Prompts written for Opus 4.8 work well out of the box; the
patterns below are the ones that most often still need tuning.

## Two modes

- **Operating** — Opus 5 is doing the work now. The dials below are
  self-applied: choose scope, narration and delegation deliberately rather
  than by default lean.
- **Authoring** — writing a system prompt, `CLAUDE.md`, subagent prompt or
  harness that targets Opus 5. The same dials, expressed as instructions
  (paste-ready blocks in `references/prompt-blocks.md`).

**Do not stack duplicate instructions.** If the harness already encodes a
rule, restating it in a skill or project file compounds rather than
reinforces — the over-verification failure below is exactly that mechanism.

## Subtract first

Instructions that helped on earlier models and now cost tokens or quality:

| Legacy instruction | What it does on Opus 5 | Instead |
|---|---|---|
| "Include a final verification step for any non-trivial task" | Over-verification; wasted tokens, no quality gain | Delete — it verifies its own work unprompted |
| "Use a subagent to verify" | As above, at multiplied cost | Delete; never delegate checking of your own work |
| "Double-check your answer" / "re-verify before responding" | Compounds with built-in self-correction | Delete |
| "Only report high-severity issues" / "be conservative" (review prompts) | Followed **literally** — real bugs go unreported | Ask for everything; filter in a separate pass |
| "Do not think" / "do not reason" | Increases internal-tag leakage when thinking is off | Delete; control cost with effort |
| Prompt-side vision workarounds tuned for older models | Usually obsolete | Re-validate; give it tools to crop and verify instead |
| Effort defaults carried from Opus 4.7/4.8 (`xhigh` by reflex) | Mis-priced — Opus 5's economics differ | Re-run an effort sweep on your own evals |
| Legacy harness scaffolding adding separate verification steps | Same over-verification, structurally | Remove the step from the harness |

## The five dials

Behaviours Opus 5 leans long or wide on, and does not self-regulate. Set
each deliberately; blocks for each are in `references/prompt-blocks.md`.

| Dial | Default lean | Lever |
|---|---|---|
| **Conversational length** | Longer than prior Opus models | Prompt for brevity explicitly — effort will not do it |
| **Progress narration** | Announces what it is about to do; long per-message output in agentic sessions | Describe the cadence and shape wanted; lead with the outcome |
| **Written deliverables** | Files written to disk run long | Length calibration: cover substance, no filler sections |
| **Task scope** | May add unrequested steps or re-judge what the task should be | State the scope contract: deliver what was asked, at the scope intended |
| **Delegation** | Delegates readily | Gate it (below); or cap spawn counts deterministically in the harness |

Positive examples of the style wanted beat instructions about what not to
do. In a long system prompt, pair the main instruction with a short reminder
near the end.

## Effort is the cost lever, not prompt length

`output_config.effort` — not a top-level field. Full ladder and interactions
in `references/effort-and-thinking.md`.

- **Start at the default `high`**, then move on eval evidence: `low` and
  `medium` liberally wherever quality holds, `xhigh` for demanding coding
  and agentic work, `max` only when the task justifies unconstrained spend.
- **Effort controls thinking volume, not visible response length.** Lowering
  it will not reliably shorten the answer. Prompt for length instead.
- **At `xhigh`/`max`, raise `max_tokens`** — 64k is a reasonable start;
  it is a hard cap on thinking *plus* response.
- **Hold effort constant within a cached conversation** — changing it
  between requests invalidates the cached prefix.
- `adaptive` is a thinking mode, not an effort value. Never pass it as one.

## Thinking, and the disabled-thinking trap

Thinking is **on by default** on Opus 5, and `thinking: {"type": "disabled"}`
is accepted only at effort `high` or below — at `xhigh` or `max` it returns
a 400. This is a breaking change from Opus 4.8.

With thinking disabled, two artifacts appear occasionally:

1. **Tool calls written as text** instead of a structured `tool_use` block.
   The turn completes, the call never runs, and in an agentic loop the
   leaked text stays in history and poisons later turns. Most common on
   tool-heavy workloads such as search.
2. **Internal XML tags** leaking into the visible response.

**The primary mitigation for both is to keep thinking on and control cost
with lower effort** — thinking on at `low` beats thinking off at comparable
cost for most tasks. Where thinking must stay off, one combined instruction
mitigates both (`references/prompt-blocks.md`); naming the tags explicitly
works less well than the general rule.

## Orchestrating

Opus 5 coordinates subagent teams well — writer-verifier patterns hold, and
agents rarely overwrite each other's work. The discipline is about *when*,
because delegation multiplies cost and wall-clock on small work.

**Delegate only when all four hold:** the track is large; genuinely
independent; parallelisable; and not something finishable in a handful of
tool calls. **Never delegate verification of your own work.** If one agent
can do it, use one. Keep spawn counts low, and prefer `low` effort for
subagents. Depth in `references/orchestration.md`.

## Opus 5 facts (date-stamped 2026-07-25 — re-verify)

Fast-moving; confirm against the Models API and current docs before relying
on any row.

| Property | Value |
|---|---|
| Model ID | `claude-opus-5` (Bedrock: `anthropic.claude-opus-5`) |
| Context window | 1M tokens — both default and maximum, no smaller variant |
| Max output | 128k tokens |
| Thinking | On by default; `adaptive` is the equivalent explicit value |
| Effort levels | `low`, `medium`, `high` (default), `xhigh`, `max` |
| Minimum cacheable prompt | 512 tokens (down from 1,024 on Opus 4.8) |
| Pricing | $5 / $25 per million input / output tokens |

## Pitfalls

- Lowering effort to shorten a response — wrong dial; it cuts thinking.
- Keeping `max_tokens` from a non-thinking Opus 4.8 workload after
  migrating: thinking now consumes the same budget.
- Disabling thinking to save money — costs quality *and* risks the two
  artifacts above; lower effort instead.
- A conservative filter in a review prompt read literally, so genuine
  findings never surface. Collect wide, filter downstream.
- Delegating small or dependent work because delegation is available.
- Re-verifying, then narrating the re-verification, then summarising it.
- Treating a prompt tuned on Opus 4.7/4.8 as validated here — behaviour
  carried over, effort economics did not.

## Reference index

- `references/prompt-blocks.md` — paste-ready instruction blocks for every
  dial, where to place them, and how to tune narration up rather than down.
- `references/effort-and-thinking.md` — the effort ladder, Opus 5
  recommendations, thinking interaction, `max_tokens` and caching effects.
- `references/orchestration.md` — the delegation gate, subagent effort,
  writer-verifier patterns, review passes, long-context work.
- `references/migration-from-opus-4-8.md` — breaking changes, the
  instruction-subtraction sweep, and what to re-run on evals.

## Boundaries

- **General prompt engineering** — structure, few-shot, templates as code,
  evals, agent-harness and MCP design → `llm-development`; this skill is
  the model-specific layer above it.
- **Usage-window pacing** for long or parallel runs → `stay-within-limits`.
- **Briefing an agentic task as a spec** (intent, acceptance criteria,
  scope) → `llm-development` (`prompt-engineering.md`) and `visual-plan`.
- **Verifying claims against current docs** rather than memory, including
  this file's date-stamped table → `read-the-damn-docs`.
- **Prose quality of what the model writes** → `uncanny`.
- **Code review process** → `code-review-development`; this skill only
  notes that conservative filter instructions are taken literally.

## Source

Distils Anthropic's [Prompting Claude Opus
5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5),
[Effort](https://platform.claude.com/docs/en/build-with-claude/effort) and
[What's new in Claude Opus
5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5)
(retrieved 2026-07-25). Model-version-specific by nature: re-verify against
current documentation, and expect a rewrite each model generation.
