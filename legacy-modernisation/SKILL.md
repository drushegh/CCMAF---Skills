---
name: legacy-modernisation
description: >-
  Safely changing code you don't fully understand — legacy systems,
  inherited codebases, framework and major-version upgrades, platform
  migrations. Owns the discipline: characterisation/approval tests that
  pin current behaviour before any change, seams and dependency-breaking
  to get untested code into a harness, strangler-fig and
  branch-by-abstraction for incremental replacement, codemods for
  mechanical change at scale, upgrade playbooks (one major at a time,
  changelog first), deprecation and dead-code management, and rollback as
  a design input. Use whenever a task involves modifying untested or
  unfamiliar code, "upgrade to <framework/runtime> vN", "migrate off X",
  "modernise this module", an inherited codebase, EOL/deprecation
  warnings, a large mechanical rename/refactor, or a rewrite proposal.
  PROACTIVELY activate before editing code that has no tests covering the
  change area. Schema expand-contract stays with sql-development;
  verifying the new API against real docs with read-the-damn-docs.
---

# Legacy Modernisation

How to change code you didn't write and don't fully understand, without
breaking the things nobody remembers it does. The working definition is
Michael Feathers' (*Working Effectively with Legacy Code*): **legacy code
is code without tests** — its behaviour cannot be verified, so every edit
is a bet. The prime directive follows: **preserve behaviour you cannot
yet specify.** First make the current behaviour observable and pinned;
only then change it, in slices that are individually shippable and
individually revertible. Big-bang rewrites are the alternative, and they
fail on schedule: the old system keeps moving while the new one chases
a snapshot of it.

## Non-negotiables

1. **Characterise before you change.** Before modifying code with no
   test coverage over the change area, write characterisation tests that
   pin what it *currently does* — including behaviour that looks wrong
   (`references/characterisation-tests.md`).
2. **Bugs found while characterising are decisions, not fixes.** Pin the
   buggy behaviour, flag it to the board/user, and fix it as its own
   deliberate change later. Downstream consumers may depend on the bug;
   a silent fix is an unannounced breaking change.
3. **Refactoring and behaviour change never share a commit.** A
   structure-only commit is verifiable by unchanged tests; a behaviour
   commit is reviewable on its own terms. Mixed commits are neither, and
   they poison `git bisect` (mechanics → `git-workflow`).
4. **Every slice lands green and shippable.** No long-lived migration
   branch drifting from main: integrate continuously behind flags or an
   abstraction, keep the build releasable at every step
   (`references/strangler-fig-and-incremental.md`).
5. **Rollback is designed, not improvised.** Before each step, name the
   way back (revert commit, flag off, route back, restore) and the point
   of no return. A step with no rollback gets extra verification or a
   smaller slice.
6. **One major version at a time, changelog first.** Read the release
   notes and migration guide before touching the lockfile, and clear
   deprecation warnings on version N before moving to N+1 — they are the
   list of what N+1 breaks (`references/upgrade-playbooks.md`; verifying
   the new API against real docs → `read-the-damn-docs`).
7. **Archaeology before edits.** Read the history (`git log`/`blame`),
   map the callers, find and run whatever tests exist, and check
   production telemetry for how the code is actually used. Ten minutes
   of archaeology routinely invalidates a modernisation plan.
8. **Mechanical change at scale goes through a codemod.** The same
   structural edit across dozens of files is scripted, sampled, reviewed
   and committed with its transform — never hand-typed per file
   (`references/codemods-and-mechanical-refactors.md`).
9. **Delete only with evidence, via deprecation.** "Looks unused" is not
   evidence; static reachability plus runtime telemetry is. And no
   "while I'm here" scope creep — modernisation dies of accumulated
   unrelated improvements (`references/deprecation-management.md`).

## Strategy selection

| Situation | Strategy |
|---|---|
| Working system on a dying platform/framework | Strangler fig: intercept at a boundary, replace piecemeal, retire |
| One module needs change, no tests around it | Characterise → break dependencies at a seam → change |
| New behaviour needed inside untestable code | Sprout: build it as new, tested code; call it from the old |
| Same structural edit across many files | Codemod with sampled review |
| Framework/runtime N → N+2 | Sequential majors, playbook per hop |
| In-process component swap (library, engine, data layer) | Branch by abstraction behind an interface, flip by flag |
| Suspected dead code | Deprecate + instrument, then remove on evidence |
| "Let's rewrite it from scratch" | Almost always no — criteria in `references/strangler-fig-and-incremental.md` |

## High-frequency pitfalls

- **The big-bang rewrite** — second-system effect plus a moving target;
  the business freezes, the rewrite chases the old system's tail-lights.
- **Characterisation tests that pin nothing** — green because they
  assert too little. Prove they bite: break a branch, watch them fail.
- **Snapshot-everything brittleness** — the opposite failure; pinning
  incidental detail (timestamps, ordering, formatting) so every harmless
  change screams.
- **Silently fixing the bug you found** — see non-negotiable 2.
- **The eternal strangler** — both systems alive for years because
  nobody owns retirement; progress measured in new code written instead
  of old code deleted.
- **Multi-major jumps** — skipping N+1's deprecation cycle and debugging
  three majors' breakage as one undifferentiated pile.
- **Codemod output committed unreviewed** — or a regex transform for a
  structural change; both scale a subtle bug across the codebase.
- **Trusting existing tests unexamined** — run them first; check they
  fail when the code breaks. Inherited suites are often green because
  they test nothing.
- **Removing "dead" code that runs quarterly** — month-end, year-end and
  disaster paths don't show in a fortnight of telemetry.

## Workflow

1. **Archaeology.** History, callers, existing tests (run them),
   production usage, and any recorded decisions. Write down what the
   code appears to be for and what you can't yet explain.
2. **Safety net.** Characterisation tests at the nearest stable boundary
   around the change area; verify they bite.
3. **Open a seam.** The minimal dependency-breaking needed to get the
   change area into a harness — no grand refactor before a net exists
   (`references/seams-and-dependency-breaking.md`).
4. **Change in slices.** Each slice green, shippable, revertible;
   refactor commits separated from behaviour commits.
5. **Verify against reality.** Where feasible, parallel-run old and new
   on real inputs and diff the outputs before cutover.
6. **Contract.** Retire the old path deliberately: deprecate, watch
   telemetry, delete. The migration is done when the old code is gone,
   not when the new code works.
7. **Record.** Strategy and irreversible choices as ADRs, and the
   migration guide for anyone downstream (→ `technical-writing`).

## Reference index

Load on demand:

- `references/characterisation-tests.md` — golden-master/approval
  testing: pinning current behaviour, choosing the boundary, taming
  non-determinism, proving the tests bite, and their retirement.
- `references/seams-and-dependency-breaking.md` — Feathers' seam
  catalogue: sprout/wrap, extract interface, parameterise constructor,
  the hidden-dependency checklist, and the minimal safe refactors
  allowed before tests exist.
- `references/strangler-fig-and-incremental.md` — strangler fig, branch
  by abstraction, flags and cutover, parallel-run verification, rollback
  design, retirement governance, and when a rewrite is actually right.
- `references/codemods-and-mechanical-refactors.md` — AST-based
  transforms over regex, the tool landscape per ecosystem, the
  write→sample→review→sweep protocol, and idempotency.
- `references/upgrade-playbooks.md` — the framework/runtime upgrade
  sequence end-to-end, lockfile and rollback discipline, ecosystem
  upgrade tooling, and unblocking abandoned or far-behind estates.
- `references/deprecation-management.md` — consuming deprecation
  warnings as a work queue, issuing deprecations with removal plans,
  dead-code evidence (telemetry, scream test), and the ratchet pattern.

## Boundaries

- **Schema migrations (expand–contract for databases)** →
  `sql-development`; this skill owns the code side of a data-touching
  migration and defers the DDL/locking discipline there.
- **Test strategy, the pyramid, E2E/load tooling** →
  `testing-development`; this skill owns characterisation testing
  specifically — tests as a change-safety net, not as a quality goal.
- **Reviewing the resulting diffs** → `code-review-development`
  (including its AI-generated-code pass for agent-written migrations).
- **Version pinning, changelog reading, verifying an API exists in the
  target version** → `read-the-damn-docs`.
- **Bisect, blame, history surgery, branch strategy for long
  migrations** → `git-workflow`.
- **Diagnosing a divergence once old and new disagree** →
  `systematic-debugging`.
- **The migration plan as a reviewable artefact** → `visual-plan`;
  recording decisions and writing the migration guide →
  `technical-writing`.
- **Deprecating/sunsetting HTTP APIs you expose to others** →
  `api-development`.
- **Per-language refactoring mechanics and idioms** → the language
  skills (`python-development`, `typescript-development`,
  `dotnet-development`, …).
- **EOL runtimes and vulnerable dependencies as a supply-chain risk** →
  `secure-development`; CI wiring for flags and parallel pipelines →
  `devops-development`.
