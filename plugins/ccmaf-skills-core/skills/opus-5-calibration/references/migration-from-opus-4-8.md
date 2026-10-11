# Migrating to Opus 5 from Opus 4.8

Date-stamped 2026-07-25. Opus 5 performs well out of the box on existing
Opus 4.8 prompts — migration is mostly two API changes plus a subtraction
sweep, not a rewrite.

## Step 1 — model ID

| Platform | ID |
|---|---|
| Claude API | `claude-opus-5` |
| Amazon Bedrock | `anthropic.claude-opus-5` |
| Google Cloud | `claude-opus-5` |
| Microsoft Foundry | available |

Opus 4.8 remains available on all of these.

## Step 2 — two breaking behaviour changes

**Thinking is on by default.** On Opus 4.8 a request ran without thinking
unless it set `thinking: {"type": "adaptive"}`; the same request on Opus 5
runs with thinking on. The wire value is unchanged and `adaptive` stays
valid and equivalent to the default.

→ **Revisit `max_tokens`** for any workload that ran without thinking on
Opus 4.8. It is a hard limit on total output, and thinking now shares it.

**Disabling thinking requires effort `high` or below.** `thinking: {"type":
"disabled"}` at `xhigh` or `max` returns a **400**, enforced per request. On
Opus 4.8 the two settings were independent.

→ Either keep thinking disabled and set effort to `high` or below, or keep
the effort level and remove the `thinking` field. Prefer the latter: see the
disabled-thinking artifacts in `effort-and-thinking.md`.

## Step 3 — the subtraction sweep

Search prompts, `CLAUDE.md` files, skill files and harness scaffolding for
these and act on each. This is where most of the migration value is — but
the sweep removes *redundant re-reading*, not *empirical* checks (see
SKILL.md §"Verification: subtract re-reading, keep evidence").

| Search for | Action |
|---|---|
| `verif` — "final verification step", "verify before finishing" | Triage each hit: delete it if it means re-reading / re-reasoning; **keep** it if it runs, renders, measures or diffs something (tests, screenshots, benchmarks) |
| "subagent to verify", "verifier agent" over own work | Delete when the agent only re-reads the author's output; **keep** independent review with a different prior, and any rule that the author is not its own acceptance gate |
| "double-check", "re-check", "re-verify" | Delete |
| "only report high", "be conservative", "high-severity only" | Replace with report-everything plus a separate filtering pass |
| "do not think", "do not reason", "no reasoning" | Delete — increases internal-tag leakage |
| `<thinking>` named explicitly in a prohibition | Replace with the general no-internal-tags rule |
| Vision workarounds tuned for older models | Re-validate; most are now unnecessary |

Rationale: Opus 5 re-checks its own reasoning and self-corrects without
being told, so instructions to re-read compound with behaviour the model
already has, spending tokens with no quality gain. Self-correction cannot
surface facts absent from context, though — a green static gate over
visibly broken output is the observed failure (SKILL.md §"Field
corrections") — so harness steps that produce new evidence stay.

## Step 4 — re-sweep effort

Opus 4.7/4.8 guidance was **start at `xhigh`** for coding and agentic use.
Opus 5 guidance is **start at the default `high`**, step up to `xhigh` for
demanding work, and use `low`/`medium` liberally wherever evals hold.

Carried-over effort defaults are the most common silent mis-pricing after a
migration. Run a fresh sweep on your own eval set rather than reusing the
previous setting — Opus 5 converts effort into results more reliably than
any earlier Opus model, so the choice carries more weight in both
directions. Full ladder in `effort-and-thinking.md`.

## Step 5 — add the behavioural dials

Behaviour changes visible without any code change: default responses and
written deliverables run longer, agentic narration is more frequent,
delegation is more readily reached for, and corrections to earlier
statements are narrated more. None of these are regressions, and none
self-regulate. Add only the blocks you need from `prompt-blocks.md`.

## New capabilities worth adopting

- **Lower prompt-cache minimum** — 512 tokens on Opus 5, down from 1,024.
  Prompts previously too short to cache now create entries with no code
  change. Re-check cache-hit metrics after migrating; the floor moved.
- **Mid-conversation tool changes (beta)** — add or remove tools between
  turns while preserving the prompt cache, instead of resending a fixed tool
  list for the life of a session. Beta header
  `mid-conversation-tool-changes-2026-07-01`. This relaxes the long-standing
  rule that swapping the tool list mid-session nukes the cache.
- **Default fallbacks mode (beta)** — `fallbacks` accepts `"default"`,
  applying Anthropic's recommended fallback models by refusal category
  instead of a hand-maintained list. Beta header
  `server-side-fallback-2026-07-01` (which supports both `"default"` and
  explicit lists; the earlier `server-side-fallback-2026-06-01` accepts only
  explicit lists).
- **Fast mode** (research preview) — Claude API only, not Bedrock, Google
  Cloud or Microsoft Foundry. Priced at $10 / $50 per million input /
  output tokens against the standard $5 / $25.

Beta headers and preview features change on their own schedule — confirm
each against current documentation before shipping (`read-the-damn-docs`).

## What to re-run on evals

1. **Effort sweep** across `low` → `max` on the real workload, before
   anything else.
2. **Length distributions** — response and written-deliverable length
   against whatever the product's tolerance is.
3. **Recall on review-shaped tasks**, if any prompt previously carried a
   conservative filter that has now been removed.
4. **Cost per task**, including cache-hit rate against the new 512-token
   floor and any change in subagent spawn counts.
5. **Tool-call integrity** if thinking is disabled anywhere — specifically,
   calls appearing as text rather than `tool_use` blocks.

Eval method, golden sets and variance handling → `llm-development`,
`references/evals.md`.
