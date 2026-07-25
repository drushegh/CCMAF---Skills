# Paste-ready instruction blocks

Blocks reproduced from Anthropic's Opus 5 prompting guidance (retrieved
2026-07-25). They are quoted verbatim in US English because they are meant
to be pasted as-is; adapt wording freely, but keep the *shape* — each one
describes a positive target rather than forbidding a behaviour.

**Placement.** Instructions go in the system prompt, ordered stable-first so
the cache prefix holds. In a long system prompt, pair a behavioural rule
with a short reminder near the end — the reminder is what survives a long
agentic session. Add only the blocks for dials you actually want to move.

## Conversational length

For a user-facing multi-turn product:

```text
Keep responses focused, brief, and concise. Keep disclaimers and caveats short, and spend most of the response on the main answer. When asked to explain something, give a high-level summary unless an in-depth explanation is specifically requested.
```

The end-of-prompt reminder that pairs with it:

```text
<tone_preference>
Keep outputs reasonably concise.
</tone_preference>
```

Effort will not do this job — see `effort-and-thinking.md`.

## Progress narration (tuning down)

```text
Before your first tool call, say in one sentence what you're about to do. While working, give a brief update only when you find something important or change direction. When you finish, lead with the outcome: your first sentence should answer "what happened" or "what did you find," with supporting detail after it for readers who want it.
```

The block works because it specifies **cadence** (when to speak), **volume**
(one sentence, brief) and **shape** (outcome first). A bare "be less chatty"
specifies none of the three.

## Progress narration (tuning up, or restyling)

The same lever runs in reverse: describe explicitly what updates should look
like, and give examples of them. **Positive examples of the communication
style you want are more effective than instructions about what not to do** —
this holds for every dial, not just narration. Write the two or three
updates you would have wanted, verbatim, and let the model match them.

## Written deliverable length

Separate dial from conversational verbosity. Files Opus 5 writes to disk —
reports, Markdown docs, summaries — run long. If the product ships
Claude-authored documents:

```text
Match the length of written documents to what the task needs: cover the substance, but do not pad with filler sections, redundant summaries, or boilerplate.
```

## Task scope

For narrow tasks, or any harness where scope creep is expensive:

```text
Deliver what was asked, at the scope intended. Make routine judgment calls yourself, and check in only when different readings of the request would lead to materially different work. If the request seems mistaken or a better approach exists, say so in a sentence and continue with the task as asked rather than quietly narrowing, widening, or transforming it. Finish the whole task, and stop short of actions that are clearly beyond what was asked.
```

Note what it does *not* say: it never tells the model to check its work.
Adding that clause is the over-verification trap.

## Subagent delegation

Where the harness supports subagents:

```text
Delegate to a subagent only for large tasks that are genuinely independent and parallelizable, such as a wide multi-file investigation. Do not delegate work you can finish yourself in a handful of tool calls, and do not use subagents to verify or double-check your own work. If one subagent can complete the task, use one rather than several, and keep spawn counts low.
```

A deterministic cap in the harness is stronger than an instruction where
cost control has to hold. Use both for cost-sensitive workloads.

## Correction narration

Opus 5 narrates corrections to its own earlier statements more than prior
models — undesirable in user-facing products:

```text
Only correct an earlier statement when the error would change the user's code, conclusions, or decisions. State corrections plainly and briefly, then continue the task. For slips that change nothing for the user, make the fix and move on without noting it.
```

Do **not** pair this with "double-check your answer". The model already
self-corrects; the instruction to re-check is what generates the volume of
corrections this block then has to suppress.

## Thinking disabled — combined mitigation

Only for integrations that must keep thinking off (see
`effort-and-thinking.md` for why that should be rare). One instruction
covers both artifacts, by granting permission to speak before a call,
offering an alternative to forcing a call, and banning internal tags:

```text
When you use a tool, you may say a brief sentence first. If no tool can express what the user asked for, say so instead of guessing. Do not include internal or system XML tags in your response.
```

**Do not name the tags specifically.** Instructions that call out thinking
tags by name are less effective than the general form, and a rule telling
the model not to think or not to reason actively increases leakage.

## Blocks not to write

| Tempting block | Why it backfires |
|---|---|
| "Include a final verification step for any non-trivial task" | Over-verification; the model already verifies |
| "Use a subagent to verify your work" | Same, at multiplied cost |
| "Double-check your answer before responding" | Compounds with built-in self-correction |
| "Only report high-severity issues" / "be conservative" | Taken literally; real findings suppressed |
| "Do not think" / "do not reason before answering" | Raises internal-tag leakage |
| "Do not emit `<thinking>` tags" | Weaker than the general no-internal-tags rule |
