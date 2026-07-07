# Diátaxis and Document Types

Diátaxis (diataxis.fr) maps documentation onto two axes: is the reader
**acting** (doing something) or **cognising** (thinking about something),
and are they **acquiring** skill (studying) or **applying** it (working)?
The intersections give four modes, each with its own reader, form and
quality bar. The framework is stable and vendor-neutral; the canonical
statement lives at diataxis.fr.

| Mode | Reader is… | Reader's question | Form |
|---|---|---|---|
| **Tutorial** | Studying + acting | "Teach me, by doing" | A lesson: guided, concrete, guaranteed to work |
| **How-to guide** | Working + acting | "Help me achieve this task" | A recipe: steps towards a goal |
| **Reference** | Working + cognising | "Tell me the exact fact" | A map: austere, complete, consistent |
| **Explanation** | Studying + cognising | "Help me understand" | A discussion: context, reasons, trade-offs |

## Per-mode quality bars

**Tutorial.** The author takes responsibility for the learner's success:
if a learner follows every step and fails, the tutorial is broken. Rules:
one path, no choices ("we will use X" — never "you could use X or Y");
visible results early and often; concrete actions, not abstractions;
minimum necessary explanation, linked out rather than inlined; every step
tested end-to-end on a clean environment; explicit, versioned
prerequisites. Perfect reliability is the bar — a tutorial that works
95% of the time is a failed tutorial.

**How-to guide.** Assumes competence — the reader knows the basics and
has a real-world goal. Rules: name the goal in the title ("How to rotate
the signing key"), state preconditions up front, order steps by
execution, make each step one action, keep it adaptable to variations of
the task rather than exhaustively branching, and stop when the goal is
reached. No teaching, no digressions into why.

**Reference.** Describes the machinery, completely and neutrally. Rules:
structure mirrors the thing described (one page per command/endpoint/
class, sections in a fixed, predictable order); statements are austere
and factual — no persuasion, no tips (link tips out to how-tos);
consistency of format matters more than elegance, because readers
pattern-match; nothing missing — an undocumented parameter is a gap the
reader falls into.

**Explanation.** The only mode with room for opinion, and it must be
marked as such. Rules: give context and background, admit alternatives
and trade-offs honestly, explain why the design is what it is, and don't
instruct — link to the how-to instead.

## API reference prose

API reference is reference mode with extra discipline (the contract
itself — OpenAPI, versioning — belongs to `api-development`):

- Every parameter documented: type, constraints, default, whether
  required, and what happens when omitted.
- Every error documented: condition, code, and what the caller should do
  about it. Error docs are where reference pages usually fail.
- One tested, minimal example per operation — request and real response.
  Generated-from-schema stubs are scaffolding, not documentation.
- Description fields describe *behaviour*, not the field name restated
  ("`timeout` — the timeout" documents nothing).

## Mixing failure modes

| Blend | What the reader experiences |
|---|---|
| Tutorial + explanation | Lesson keeps stalling for theory; learner loses the thread |
| Tutorial + reference | Option dumps mid-lesson; learner can't tell what to actually type |
| How-to + tutorial | Steps padded with teaching the reader already has |
| How-to + explanation | The 03:00 operator scrolls past design history to find step 3 |
| Reference + how-to | Facts buried in narrative; lookup becomes reading |
| Explanation + instruction | "Why" document that quietly becomes a second, drifting copy of the steps |

The fix is always the same: split by mode, cross-link, and let each
document do one job.

## Mapping genres onto the grid

- **README** — a container, not a mode: each section is single-mode
  (what/why = explanation, quickstart = tutorial-shaped, usage = how-to,
  configuration table = reference). See
  `readmes-and-onboarding.md`.
- **ADR** — explanation plus an immutable record of a decision.
- **Runbook** — a how-to hardened for execution under stress.
- **Changelog** — reference: a complete, factual record of change.
- **Design doc / RFC** — explanation written *before* the system exists:
  context, options, trade-offs, proposed direction. Implementation plans
  with file maps and diagrams route to `visual-plan`; the design doc is
  the durable narrative around such a plan.

## When Diátaxis isn't the frame

Marketing copy, incident postmortems, tender responses and specs have
their own structures — don't force the grid onto them. Diátaxis governs
documentation of a system for its users and operators. It is also a lens,
not a migration project: apply it to the next document you touch rather
than reorganising the whole docs tree in one heave.
