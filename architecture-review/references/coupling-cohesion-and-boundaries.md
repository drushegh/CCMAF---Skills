# Coupling, cohesion and boundaries

Boundaries are the architecture. Almost every structural quality —
changeability, independent deployment, failure isolation, team
autonomy — is really a statement about where the seams sit and how much
crosses them. The review probes the seams harder than the boxes.

## Cohesion first

Ask of every module/service: **can you state its responsibility in one
sentence without "and"?** Things that change together belong together
(common-closure); a "shared utils" service, an "entity service" per
table, or a component whose name is a department are cohesion findings.
Low cohesion inside guarantees high coupling outside — the fragments
must call each other back.

## Coupling — judge the dimensions, not a slogan

"Loose coupling" is adjective-ware until you name what kind:

| Dimension | Question | Smell |
|---|---|---|
| Contract | What must both sides agree on? | Sharing internal models/DTOs across a seam; consuming another's database schema |
| Temporal | Must both be up at the same moment? | Synchronous call chains for non-interactive work (async alternative → `event-driven-development`) |
| Deployment | Can they release independently? | Lock-step version trains; shared libraries forcing simultaneous upgrades |
| Data | Who else reads/writes this datum? | Shared mutable database; two writers to one table |
| Transactional | Does an invariant span the seam? | Cross-service transactions, distributed locks, sagas retrofitted late |
| Operational | Does one's load/failure move the other? | No bulkheads; shared infrastructure with no isolation |

Coupling *strength* also matters: agreeing on a name is weaker than
agreeing on a type, which is weaker than agreeing on an algorithm or on
timing. Prefer weaker agreements at wider distances — tight coupling
inside a module is fine; the same coupling across a network and two
teams is a finding.

## Data ownership

The sharpest boundary test: **every datum has exactly one writer.**

- A shared database between services is the classic false-decoupling —
  the schema is now an unversioned public API with no owner
  (`sql-development` for schema-evolution mechanics).
- Others get the data via the owner's contract: API, published events,
  or replicated read models — each an explicit, versioned agreement.
- If the review can't answer "who owns Customer?", the boundary is
  drawn wrong regardless of how clean the diagram looks.

## Bounded contexts and language

A boundary is placed well when the *language* changes across it —
"Order" means something different to billing and to fulfilment, and
forcing one shared model couples every team to every nuance. Within a
context, one model, one vocabulary; across contexts, explicit
translation at the seam. Review question: does each context's model
serve *its* scenarios, or is there one god-model everyone bends around?

## The distributed monolith — symptom checklist

The costliest boundary failure: services that must move together.
Two or more of these is a blocking finding on a distribution proposal:

- Releases require coordinating several services (lock-step deploys).
- One user request traverses long synchronous chains of internal calls.
- Services share a database or reach into each other's storage.
- A single change routinely fans out across several repos/teams.
- Cross-service transactions or distributed locks uphold invariants.
- Everything fails together — no request survives any one dependency.

The honest alternatives are both respectable: a **modular monolith**
(enforced internal boundaries, one deployable — often the simplest
thing that meets the scenarios) or **actual services** (boundaries
aligned to data ownership and teams, async where temporal coupling
isn't required). The in-between is the trap.

## Conway alignment

Structure and org chart are one system: a seam that cuts across a
team's ownership will erode, and a team split by an architecture will
re-draw it. Review both directions — "which team owns each container?"
should have a clean answer, and interfaces between containers should
look like interfaces between teams. An architecture the org can't own
is wrong even if it's elegant.

## Review probes for this file

- Name each seam's contract, and who breaks when it changes.
- What's the blast radius of renaming a field in the core model?
- Which boundaries could you *test* (dependency rules, import checks)?
  → encode as fitness functions (`fitness-functions.md`).
