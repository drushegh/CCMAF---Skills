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

### Carve-out: near-misses and limits

"Only when you find something important or change direction" is a narrow
filter. A check that came back clean is neither — so near-misses,
self-corrections and known limits fall outside it and go unreported. In
operator-facing agentic work that is usually the wrong trade: *"the audit
flagged 27 files as dead, I verified before deleting, and they were live"*
changes what the operator trusts next time, while satisfying neither clause.

"Lead with the outcome, supporting detail after" has a second edge: it
pushes caveats into trailing material readers skim. Where a green headline
must not be mistaken for acceptance, pin material caveats up front.

Append where either matters:

```text
Report near-misses, self-corrections, and known limits even when they are not findings and did not change direction. Lead with the outcome, but keep material caveats in the first paragraph rather than in trailing detail.
```

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
| "Include a final verification step for any non-trivial task" | Over-verification **when the step is a re-read**; see the caveat below before deleting an empirical one |
| "Use a subagent to verify your work" | Same, at multiplied cost |
| "Double-check your answer before responding" | Compounds with built-in self-correction |
| "Only report high-severity issues" / "be conservative" | Taken literally; real findings suppressed |
| "Do not think" / "do not reason before answering" | Raises internal-tag leakage |
| "Do not emit `<thinking>` tags" | Weaker than the general no-internal-tags rule |

### Caveat on the first two rows

Those rows target **redundant re-reading**. They do not license deleting
**empirical** verification — render it, execute it, measure it, diff it.
That kind produces observations the model does not otherwise have, and
self-correction cannot substitute for it: the model can only re-examine what
is already in its context. Deleting a render-and-look step because a guide
said to remove "verification steps" is the common misread (SKILL.md,
§"Verification: subtract re-reading, keep evidence").

A useful test before deleting a step: *does it re-examine what the model
already knows, or does it produce a new observation?* Delete the first, keep
the second.
