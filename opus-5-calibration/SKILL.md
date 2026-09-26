---
name: opus-5-calibration
description: >-
  Operate Claude Opus 5 well — its failure mode is excess, not deficiency.
  Covers the two length dials (conversational brevity, written-deliverable
  length), behaviours it does not self-regulate (narration, task scope,
  delegation), legacy instructions that now backfire ("double-check",
  "only report high-severity", "do not think"), effort as the cost lever
  (default `high`), and thinking-disabled artifacts. Field corrections:
  *empirical* verification (execute, render, measure) is not the redundant
  re-checking the vendor guidance says to delete. Use when Opus 5 is doing
  the work (especially orchestrating/delegating) and when writing a system
  prompt, CLAUDE.md, subagent prompt or harness for it. Triggers:
  `claude-opus-5`, `output_config`/effort, disabling thinking, "too
  verbose", "it did more than I asked", "too many subagents", migrating
  prompts from Opus 4.7/4.8. General prompt engineering → llm-development.
metadata:
  author: Damien (distils Anthropic's "Prompting Claude Opus 5", "Effort" and
    "What's new in Claude Opus 5" documentation, retrieved 2026-07-25;
    §"Field corrections" records where observed behaviour diverges)
  version: 1.1.0
---

# Opus 5 Calibration

Most model-specific prompting guidance tells you what to add to compensate
for a weakness. Opus 5 inverts that. It completes whole tasks rather than
leaving stubs, catches many of its own mistakes, and reviews code with high
precision — so its characteristic failure mode is **excess, not
deficiency**: longer answers, more narration, wider scope, more delegation
than the task earned.

**Calibrating Opus 5 is subtraction first, then a few explicit dials.**
Prompts written for Opus 4.8 work well out of the box; what follows is the
short list that still needs tuning.

**Do not stack duplicate instructions.** If the harness already encodes a
rule, restating it compounds rather than reinforces.

## Two modes

- **Operating** — Opus 5 is doing the work now. The dials are self-applied:
  choose scope, narration and delegation deliberately rather than by lean.
- **Authoring** — writing a system prompt, `CLAUDE.md`, subagent prompt or
  harness targeting it. Paste-ready blocks in `references/prompt-blocks.md`.

## Start here: the two length dials

The highest-yield changes, and the ones most consistently needed. If you
adopt nothing else from this skill, adopt these.

**Conversational length.** Opus 5's responses run longer than prior Opus
models'. Effort will not fix it — that controls thinking volume, not visible
output. Prompt for it:

```text
Keep responses focused, brief, and concise. Keep disclaimers and caveats short, and spend most of the response on the main answer. When asked to explain something, give a high-level summary unless an in-depth explanation is specifically requested.
```

**Written deliverable length** — a *separate* dial. Files written to disk
(reports, Markdown, summaries) run long even when conversation is tight, so
the block above does not cover them. Add wherever the model authors
documents:

```text
Match the length of written documents to what the task needs: cover the substance, but do not pad with filler sections, redundant summaries, or boilerplate.
```

## Subtract

Instructions that helped earlier models and now cost tokens or quality:

| Legacy instruction | Effect on Opus 5 | Instead |
|---|---|---|
| "Double-check your answer" / "re-verify before responding" | Compounds with built-in self-correction | Delete |
| "Include a final verification step for any non-trivial task" | Over-verification when it means *re-reading* — but read the next section before deleting an *empirical* step | Delete the re-read, keep the evidence |
| "Only report high-severity issues" / "be conservative" (review prompts) | Followed **literally** — real bugs go unreported | Ask for everything; filter in a separate pass |
| "Do not think" / "do not reason" | Increases internal-tag leakage when thinking is off | Delete; control cost with effort |
| Prompt-side vision workarounds tuned for older models | Usually obsolete | Re-validate; give it tools to crop and verify instead |
| Effort defaults carried from Opus 4.7/4.8 (`xhigh` by reflex) | Mis-priced — Opus 5's economics differ | Re-run an effort sweep on your own evals |

## Verification: subtract re-reading, keep evidence

The vendor guidance says Opus 5 "verifies its own work without being told
to" and that verification instructions should be removed. **That is right
about one kind of verification and wrong about another**, and the
distinction decides whether deleting them is free or expensive:

| Kind | Example | Verdict |
|---|---|---|
| **Redundant re-reading** | "double-check your answer", "re-verify before responding", a second pass over the same reasoning | **Delete** — the model already does this |
| **Empirical verification** | render it and look, execute the test, measure the output, diff against a baseline | **Keep** — it produces evidence the model does not otherwise have |

The failure mode of deleting the second kind: the model reasons carefully,
reaches a confident conclusion, and is wrong in a way no amount of
re-reading can surface, because the information needed was never in its
context. Observed instances (§"Field corrections"): CSS that passed a full
automated gate suite while rendering visibly broken; a static reference
analysis returning a confident list of "unreferenced" files that were
reachable by a mechanism the analysis did not model.

**Rule of thumb:** if the check re-examines what the model already knows,
delete it. If the check produces *new observations* — pixels, exit codes,
measurements — it is not over-verification, whatever the prompt calls it.
Self-correction is strong; it is not clairvoyance.

## The remaining dials

Behaviours Opus 5 leans wide on and does not self-regulate. Blocks for each
in `references/prompt-blocks.md`.

| Dial | Default lean | Lever |
|---|---|---|
| **Progress narration** | Announces what it is about to do; long per-message output in agentic sessions | Describe the cadence and shape wanted; lead with the outcome |
| **Task scope** | May add unrequested steps or re-judge what the task should be | State the scope contract |
| **Delegation** | Delegates readily | Gate it (below), or cap spawn counts in the harness |
| **Correction narration** | Narrates its own corrections more than prior models | Limit to corrections that change the user's decisions |

Positive examples of the style wanted beat instructions about what not to
do. In a long system prompt, pair the main instruction with a short reminder
near the end.

**Narration carve-out.** The standard tune-down block says to update only on
an important finding or a change of direction. Taken literally, that
suppresses *near-misses, self-corrections and known limits* — a check that
came back clean is neither a finding nor a direction change, yet "I nearly
deleted the wrong thing, and here is what stopped me" is often the most
useful sentence in the session. Where an operator relies on that signal, add
the carve-out in `references/prompt-blocks.md`.

## Effort is the cost lever, not prompt length

`output_config.effort` — not a top-level field. Full ladder in
`references/effort-and-thinking.md`.

- **Start at the default `high`**, then move on eval evidence: `low` and
  `medium` liberally wherever quality holds, `xhigh` for demanding coding
  and agentic work, `max` only when the task justifies unconstrained spend.
- **Effort controls thinking volume, not visible response length.** Lowering
  it will not reliably shorten the answer. Prompt for length instead.
- **At `xhigh`/`max`, raise `max_tokens`** — 64k is a reasonable start; it
  is a hard cap on thinking *plus* response.
- **Hold effort constant within a cached conversation** — changing it
  between requests invalidates the cached prefix.
- `adaptive` is a thinking mode, not an effort value. Never pass it as one.

## Thinking, and the disabled-thinking trap

Thinking is **on by default** on Opus 5, and `thinking: {"type":
"disabled"}` is accepted only at effort `high` or below — at `xhigh` or
`max` it returns a 400. Breaking change from Opus 4.8.

With thinking disabled, two artifacts appear occasionally:

1. **Tool calls written as text** instead of a structured `tool_use` block.
   The turn completes, the call never runs, and in an agentic loop the
   leaked text stays in history and poisons later turns. Most common on
   tool-heavy workloads such as search.
2. **Internal XML tags** leaking into the visible response.

**Primary mitigation for both: keep thinking on and control cost with lower
effort** — thinking on at `low` beats thinking off at comparable cost for
most tasks. Where thinking must stay off, one combined instruction mitigates
both (`references/prompt-blocks.md`); naming the tags explicitly works less
well than the general rule.

## Orchestrating

Opus 5 coordinates subagent teams well — writer-verifier patterns hold, and
agents rarely overwrite each other's work. The discipline is about *when*,
because delegation multiplies cost and wall-clock on small work.

**Delegate only when all four hold:** the track is large; genuinely
independent; parallelisable; and not finishable in a handful of tool calls.
If one agent can do it, use one. Keep spawn counts low, and prefer `low`
effort for subagents. Depth in `references/orchestration.md`.

**"Do not use subagents to verify your own work" — read it precisely.** It
targets *redundant self-checking at multiplied cost*: spawning an agent to
re-read what you just wrote. It does **not** mean independent review is
worthless. Two distinct things:

| Pattern | Value | Verdict |
|---|---|---|
| A subagent re-reads your output to confirm it | Same context, same priors — adds cost, rarely finds what you missed | Skip |
| An independent party with a *different prior* reviews the work, or two parties cross-review each other | Surfaces what one perspective structurally cannot; observed to make a reviewer withdraw a position it had argued | Keep where the stakes justify it |

The second is not self-verification. Where a harness or governance rule
mandates that the author of a claim is not its acceptance gate, that rule is
about *authority*, not redundancy, and this skill does not override it.

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

## Field corrections

Where observed behaviour diverges from the published guidance. Recorded with
the mechanism so they can be judged rather than taken on trust; each comes
from agentic coding work, not a controlled study.

1. **"Verifies its own work" does not extend to facts absent from context.**
   Self-correction catches reasoning errors reliably; it cannot catch a
   wrong belief about the world. A full automated gate suite returned green
   on visibly broken rendered output, and a reference-graph analysis
   produced a confident false-positive list because the real reference
   mechanism sat outside what it inspected. Keep empirical checks.
2. **Static checks passing is not self-verification succeeding.** Green
   gates measure what the gates encode. Where a harness treats them as the
   model's self-check, deleting the empirical step removes the only stage
   that could have failed.
3. **The narration tune-down suppresses near-misses.** See the carve-out
   above.
4. **Conciseness is the correction that most reliably reproduces.** Of all
   the dials, response length is the one operators notice unprompted when
   migrating from 4.8.

## Pitfalls

- Lowering effort to shorten a response — wrong dial; it cuts thinking.
- Keeping `max_tokens` from a non-thinking Opus 4.8 workload after
  migrating: thinking now consumes the same budget.
- Disabling thinking to save money — costs quality *and* risks the two
  artifacts above; lower effort instead.
- A conservative filter in a review prompt read literally, so genuine
  findings never surface. Collect wide, filter downstream.
- Deleting a render/execute/measure step because a guide said to remove
  "verification steps".
- Delegating small or dependent work because delegation is available.
- Re-verifying, then narrating the re-verification, then summarising it.
- Treating a prompt tuned on Opus 4.7/4.8 as validated here — behaviour
  carried over, effort economics did not.

## Reference index

- `references/prompt-blocks.md` — paste-ready instruction blocks for every
  dial, where to place them, the narration carve-out, and blocks not to write.
- `references/effort-and-thinking.md` — the effort ladder, Opus 5
  recommendations, thinking interaction, `max_tokens` and caching effects.
- `references/orchestration.md` — the delegation gate, subagent effort,
  writer-verifier patterns, independent review, long-context work.
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
(retrieved 2026-07-25), plus the field corrections above. Model-version
specific by nature: re-verify against current documentation, and expect a
rewrite each model generation.
