# ADRs and Decision Records

An architecture decision record captures one significant decision, its
context and its consequences, at the moment it is made. The format is
Michael Nygard's (2011), extended by MADR (Markdown Any Decision
Records); both are stable, open conventions. The payoff arrives months
later, when someone asks "why on earth is it done this way?" and the
answer exists, with the constraints of the time attached — instead of an
archaeology project or a well-meaning rewrite of a load-bearing
constraint.

## What deserves an ADR

A decision is ADR-worthy when at least one holds:

- **Expensive to reverse** — schema shape, wire format, dependency
  adoption, module boundaries, auth model, hosting/platform choice.
- **Shapes future work** — a convention or pattern others must follow.
- **Will be questioned later** — anything a competent newcomer would
  challenge without knowing the context ("why not X?").
- **Chosen against an obvious alternative** — the rejected option is the
  reason to write it down.

Not ADR-worthy: naming trivia, reversible local choices, anything fully
expressed by the code and its tests. An ADR per week is a healthy
project; an ADR per merge is ceremony.

## Anatomy

Nygard core, with the MADR options section where alternatives were real:

```markdown
# NNNN. Use one queue per tenant

Date: 2026-07-07
Status: Accepted

## Context
[The forces: technical constraints, requirements, politics, deadlines —
factual and neutral. What was true, not what was wished.]

## Options considered
[MADR extension — each real option, one honest paragraph: what it is,
what it costs, why it lost. Omit if there was genuinely one option.]

## Decision
We will [active voice, present tense — "We will route all tenant
traffic…", never "it was felt that…"].

## Consequences
[What becomes easier, what becomes harder, what we now must do.
Positive AND negative.]
```

- **Context is neutral.** No advocacy in the context section — a reader
  should be unable to guess the decision from it.
- **Decision is active.** "We will…" — a named choice, not a summary of
  vibes.
- **Consequences include the bill.** Every real decision costs
  something. An ADR whose consequences are all benefits wasn't finished —
  the negative consequences are the part future readers most need.

## Status lifecycle and immutability

`Proposed → Accepted → Deprecated | Superseded by NNNN`

Once **Accepted**, the record is immutable except for its status line. To
change the decision, write a new ADR that states the new context ("what
changed since 0007"), links back, and marks the old one
`Superseded by NNNN`. Editing an accepted ADR into a different decision
destroys the only thing the format offers: a trustworthy history.
Typo-level fixes are fine; meaning-level edits are not.

## Storage and numbering

- `docs/adr/NNNN-short-slug.md` (zero-padded, monotonic — never reuse a
  number, even for a rejected proposal).
- In the repo, next to the code they govern, reviewed by PR like any
  change. A decision log in a wiki drifts out of sight of the people
  changing the code.
- Keep an index (a README in the ADR directory, or generated) listing
  number, title, status.
- Helper tooling (adr-tools and similar CLIs) exists but is optional —
  the value is the discipline, and a text template does the job (tool
  landscape as of July 2026; re-verify before recommending a specific
  one).

## Retrofitting onto an existing system

A system with no ADRs doesn't need its history reconstructed. Record the
half-dozen *standing* decisions that most shape current work (platform,
data store, module boundaries, auth model) as ADRs dated today with
status Accepted and context "documented retrospectively" — then start
recording new decisions properly. This turns tribal knowledge into
onboarding material for the cost of an afternoon.

## ADR vs design doc vs RFC

| Artefact | When | Shape |
|---|---|---|
| **Design doc / RFC** | Before building — proposal seeking review | Explanation: context, options, trade-offs, proposed direction; often long; a discussion vehicle |
| **ADR** | At decision time — records the outcome | Short, immutable, one decision |
| **Implementation plan** | After the decision, before the code | File maps, steps, diagrams → `visual-plan` |

A good sequence: design doc explores → decision lands as an ADR (often
distilling the design doc's chosen option) → plan executes. Don't use an
ADR as a design doc; the format punishes exploration.

## Anti-patterns

- **Post-hoc justification** — writing the ADR after the code shipped,
  with alternatives invented to make the outcome look considered.
- **Editing history** — changing an accepted ADR instead of superseding.
- **Consequences = benefits list** — no costs admitted, no trust earned.
- **ADR for trivia** — ceremony that trains readers to ignore the log.
- **Orphaned decisions** — ADRs contradicted by the codebase with no
  superseding record; worse than silence, because the log now lies.
