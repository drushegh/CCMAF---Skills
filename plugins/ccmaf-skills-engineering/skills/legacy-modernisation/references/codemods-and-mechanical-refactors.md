# Codemods and Mechanical Refactors

When the same structural edit applies across dozens or hundreds of
sites, hand-editing is the risky option: humans drift, skip variants and
fat-finger exactly one of ninety files, and reviewers glaze over by file
ten. A codemod — a scripted, syntax-aware transformation — makes the
change uniform, reviewable as a *rule*, repeatable on rebase, and
auditable after the fact.

## AST over regex

Regex operates on characters; code has structure. Reserve regex for
genuinely lexical changes (a renamed string constant, an import path
swap with no aliasing). Anything involving syntax — call signatures,
argument reordering, API migration, wrapping expressions — needs an
AST-based tool that understands scope, comments, strings and formatting.
The classic regex failures: matching the pattern inside a string literal
or comment, missing an aliased import, and mangling a multi-line variant
the author never pictured.

## Tool landscape

As of July 2026 — re-verify availability and versions before use:

| Ecosystem | Tools |
|---|---|
| JS/TS | **jscodeshift** (transform framework, most published codemods), **ts-morph** (TypeScript AST scripting) |
| Python | **LibCST** (lossless CST + codemod framework), **pyupgrade** / **ruff** autofixes for idiom modernisation |
| JVM (+ growing polyglot) | **OpenRewrite** — recipe catalogue covers framework migrations wholesale |
| .NET | **Roslyn** analyzers + code fixes; the **.NET Upgrade Assistant** applies Microsoft's own |
| Go | `gofmt -r` (expression rewrites), `go fix`, gopls rename |
| Polyglot / structural | **Comby**, **ast-grep** — structural search-and-replace when no per-language framework fits |

Many frameworks ship **official codemods** for their own breaking
changes (React, Next.js, and others) — check for one before writing your
own; they encode the maintainers' knowledge of the edge cases
(→ `upgrade-playbooks.md`).

## The protocol

1. **Specify the transform** — before/after examples, including the
   variants (aliased imports, chained calls, the pattern inside a
   lambda). Grep the codebase for the pattern *class*, not just the
   sites you already know about — the variants you didn't find are the
   sites the codemod silently misses.
2. **Test the transform itself** — fixture pairs (input file → expected
   output file), including should-NOT-transform fixtures for lookalike
   patterns. A codemod is code; it gets tests.
3. **Run on a sample** — one directory or a representative file set.
   Human-review that diff completely.
4. **Run on everything**, then verify by machine: full test suite,
   typecheck/build, lint. A typed language's compiler is the best
   codemod-verifier there is.
5. **Sweep for the missed** — re-grep for the pattern class after the
   run; the survivors are either legitimate exclusions (document why) or
   transform gaps (fix and re-run).
6. **One codemod = one commit**, message naming the transform, with the
   transform script committed alongside (in the repo or the PR) so the
   change is reproducible on rebase and auditable later. Never mix
   codemod output with hand edits in one commit — the reviewer's whole
   leverage is knowing every hunk came from the same rule.

## Idempotency

A codemod must be safe to run twice: re-running on transformed code
changes nothing. This is what makes it usable across rebases and
long-running migration branches, and it forces the transform to
*recognise* its own output — usually the difference between a sloppy
pattern and a precise one.

## Reviewing codemod output

A 400-file mechanical diff is not reviewed like a feature
(→ `code-review-development` for the general discipline). The reviewer's
job here: review the **transform** and its fixtures line-by-line; review
the **sample diff** completely; then spot-check the full run and verify
the invariants — file count touched matches the expected site count, no
unexpected file types, no hunks that don't match the rule's shape, CI
fully green. Any hunk that surprises you fails the whole run, because it
means the rule isn't what you thought.

## Semi-mechanical changes

When a migration is *mostly* mechanical but needs judgement at some
sites (say, a new API needs an argument that depends on local context),
don't force a full transform: have the codemod do the mechanical part
and **mark the judgement sites** — insert a distinctive TODO comment or
a deliberately-failing marker call — then work the marker list down by
hand. The grep for the marker becomes the migration's progress meter.
This beats both extremes: fully-manual (drift, misses) and
fully-automatic (wrong guesses scaled across the codebase).
