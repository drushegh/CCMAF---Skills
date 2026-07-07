# Characterisation Tests

A characterisation test documents what the system *actually does*, not
what anyone thinks it should do. It exists to detect change, not to
judge correctness: you are building a tripwire around code you're about
to modify, so that any behavioural difference — intended or not —
announces itself. The technique is also called golden-master or approval
testing.

## The method

1. **Choose the boundary** (see below) and write a test that calls the
   code with a representative input.
2. **Assert something you know is wrong** (or nothing), run it, and
   **capture the actual output as the expected value.** The system is
   the specification; you are transcribing it.
3. Repeat across the input space: representative cases, boundary values,
   error paths, and the weird inputs production actually sends.
4. Run the suite green. Now — and only now — the code can be changed
   with the tripwire armed.

The mindset shift matters: a failing characterisation test after a
refactor doesn't mean the new code is wrong, it means behaviour changed.
Whether that change is a bug or a fix is a decision to make consciously,
never a diff to accept casually.

## Choosing the boundary

Pin at the **outermost stable boundary** that covers the change area —
a CLI's stdout, an HTTP response, a generated file, a database row-set,
a returned data structure. Coarse boundaries survive internal
restructuring (the point of the exercise); per-method pins shatter on
the first extract-method. If the unit is too entangled to call in a
harness at all, open a seam first
(`seams-and-dependency-breaking.md`) — but keep the pre-test surgery
minimal.

## Getting inputs

- **Production samples** — the highest-value inputs, sanitised of
  personal data before they enter the repo (obligations →
  `secure-development`).
- **Recorded traffic** — VCR-style record/replay for HTTP-shaped
  boundaries; record once against the real dependency, replay in tests.
- **Combinatorial/generative sweeps** — for pure-ish functions, sweep
  the input space mechanically and snapshot all outputs; breadth beats
  insight when you don't yet have insight.
- **Coverage as a map** — run coverage while exercising the suite;
  uncovered branches in the change area are unpinned behaviour, and each
  one is a place a regression can hide.

## Taming non-determinism

Golden masters fail spuriously on anything that varies per run. Scrub
before comparing, don't loosen the assertion: replace timestamps, ids,
GUIDs, ports and absolute paths with placeholders via a scrubber;
inject fixed clocks/seeds where a seam allows; sort genuinely unordered
collections before snapshotting. Every scrub is a small hole in the
tripwire — scrub the minimum, and prefer injecting determinism over
scrubbing output.

## Proving the tests bite

A green characterisation suite might be pinning nothing. Before trusting
it: mutate the code under test — invert a branch, change a constant,
delete a line — and confirm the suite fails; revert and confirm green.
Do this for a handful of mutations across the change area (a manual,
targeted version of mutation testing). A suite that survives mutations
isn't a safety net, it's a decoration. The same check applies to
*inherited* test suites before you lean on them.

## Tooling

As of July 2026 — re-verify before recommending: the **ApprovalTests**
family (multi-language) and **Verify** (.NET) own the
approve/diff-on-failure workflow; **Jest/Vitest snapshots** (JS/TS) and
**syrupy** (pytest) give inline/file snapshots; Go convention is golden
files with an `-update` flag. All share the essentials: expected output
stored as readable text, a diff on failure, and a deliberate command to
re-approve. Plain assertions against committed fixture files work
everywhere and need no dependency — the discipline, not the tool, is the
value.

## When you find a bug

Characterising *will* surface behaviour that is plainly wrong. The rule
(non-negotiable 2 in SKILL.md): **pin it anyway, name it, decide
separately.** Give the test a name that tells the truth —
`characterises_current_rounding_bug_BUG_412` — and file the bug. The
consumers of this code have been living with that behaviour; changing it
is a breaking change and deserves its own change record, not a silent
ride-along on a refactor.

## Retirement

Characterisation tests are scaffolding. They encode *incidental*
behaviour, so left in place forever they harden today's accidents into
tomorrow's requirements. As understanding grows and the modernised code
gains intent-revealing tests (design of those → `testing-development`),
replace the golden masters covering that area: the scaffold comes down
as the structure stands. A years-old snapshot wall nobody dares touch is
this technique's characteristic failure state.
