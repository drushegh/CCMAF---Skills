# Effort and thinking on Opus 5

Date-stamped 2026-07-25 — effort levels and per-model recommendations move
with each release. Re-verify before relying on a row.

## The parameter

Effort lives at `output_config.effort`, not top level:

```json
{
  "model": "claude-opus-5",
  "max_tokens": 4096,
  "messages": [{"role": "user", "content": "..."}],
  "output_config": {"effort": "medium"}
}
```

It is a **behavioural signal, not a token budget**. At low levels the model
still thinks on genuinely hard problems — just less than it would higher up.
It affects *all* tokens in the response: visible text, thinking, and tool
calls and their arguments. Setting `"high"` is exactly equivalent to
omitting the parameter.

## The ladder

| Level | Character | Typical use |
|---|---|---|
| `max` | Maximum capability, no constraint on spend | Deepest reasoning and analysis |
| `xhigh` | Extended capability for long-horizon work | Agentic/coding runs over ~30 minutes, million-token budgets |
| `high` | Default; equivalent to omitting the field | Complex reasoning, difficult coding, agentic tasks |
| `medium` | Balanced, moderate savings | Agentic work balancing speed, cost and quality |
| `low` | Most efficient, some capability reduction | Simple tasks, high volume, **subagents** |

## Opus 5 recommendation

**Start at the default `high` and adjust on eval evidence**:

- Step up to `xhigh` for demanding coding and agentic work; `max` where the
  task justifies unconstrained spend.
- Use `low` and `medium` **liberally** as the primary control for token cost
  and latency wherever evals show quality holds. Efficiency at low effort is
  one of Opus 5's real gains — `low`/`medium` deliver strong quality at a
  fraction of the tokens and latency of higher settings.
- Code review and bug-finding stay accurate at lower effort, which supports
  a cheap pass at review time and a thorough pass later.

**This differs from Opus 4.7/4.8**, where the advice was to *start* at
`xhigh` for coding and agentic use. Carrying those defaults over mis-prices
Opus 5 work. Re-run an effort sweep on your own evals rather than reusing
the old setting.

## Effort does not control response length

The single most common mis-wiring. Effort governs how much the model
*thinks*; on Opus 5 lowering it does not reliably shorten the visible
response. To shorten output, prompt for it (`prompt-blocks.md`).

## Effort with tool use

Lower effort tends to combine operations into fewer tool calls, make fewer
calls overall, proceed straight to action without preamble, and confirm
tersely. Higher effort makes more calls, explains the plan first, summarises
changes in detail, and comments code more heavily. This is why effort is a
better cost lever than trimming prompts in a tool-heavy harness.

## Thinking

Thinking is **on by default** on Opus 5 — a change from Opus 4.8, where
requests ran without it unless `thinking: {"type": "adaptive"}` was set. The
wire value is unchanged and `adaptive` remains valid and equivalent to the
default. The model decides when and how deeply to think per turn; effort is
the depth control.

`adaptive` is a **thinking mode, never an effort value**. Passing it to
`effort` is an error.

### Disabling is restricted

`thinking: {"type": "disabled"}` is accepted only at effort `high` or below.
At `xhigh` or `max` the request returns **400**, enforced per request. This
is a breaking change from Opus 4.8, where the two were independent. If a
workload disables thinking at high effort today, either keep thinking off
and drop effort to `high` or below, or keep the effort level and remove the
`thinking` field.

### Two artifacts when thinking is off

1. **Tool calls as text.** The model occasionally writes a tool call into
   its user-facing text instead of emitting a `tool_use` block. The turn
   completes normally, the call never runs, and in an agentic loop the
   leaked text persists in conversation history and affects later turns.
   Most common on tool-heavy workloads such as search.
2. **Internal XML tags** — `<thinking>` or other internal tags appearing in
   the visible response. A system-prompt rule telling the model not to think
   or not to reason *increases* this.

**Preferred mitigation for both: keep thinking enabled and control cost with
lower effort.** For most tasks, thinking enabled at `low` outperforms
thinking disabled at comparable cost. Where thinking must stay off, use the
combined instruction in `prompt-blocks.md`.

## max_tokens

`max_tokens` is a hard limit on **total** output — thinking plus response
text. Two consequences:

- At `xhigh` or `max`, set it large so the model has room to think and act
  across subagents and tool calls. 64k is a reasonable starting point.
- After migrating a workload that ran *without* thinking on Opus 4.8,
  revisit it: the same budget now also has to cover thinking.

## Caching interactions

- Effort is **request-level**. Each request carries its own value, and the
  value applies to the whole request.
- Effort shapes the rendered prompt, so **changing it between requests
  invalidates cached prefixes**. Pick a level at the start of a session that
  relies on caching and hold it. Vary effort across workloads, not within a
  cached conversation.
- Opus 5's minimum cacheable prompt is **512 tokens**, down from 1,024 on
  Opus 4.8 — prompts previously too short to cache now create entries with
  no code change.

Broader cache-prefix discipline (stable ordering, what invalidates a
session) → `llm-development`, `references/caching-cost-latency.md`.
