# Verify and Regression

"The error went away" is not a verified fix — errors also go away when
you stop triggering them, mask them, or move them. This file is the
exit criteria for a debugging session.

## Definition of done for a bug

1. **Root cause stated in one sentence**, naming a mechanism ("the
   parser treated CRLF as two rows"), not a location ("something in
   parsing") or an action ("added a check").
2. **Fix applied at that cause**, minimal and scoped.
3. **Regression test red → green**: fails on the pre-fix code, passes
   on the fixed code — both actually run, not assumed.
4. **Original reproduction passes** — the very repro from the start of
   the session, not a friendlier proxy of it.
5. **Suite green** — the fix broke nothing else.
6. **Same-pattern sweep done** (below).
7. **Diagnostic scaffolding removed** — probes, commented-out blocks,
   experiment leftovers (grep for the probe marker).

## The red→green discipline

Write the regression test first, watch it fail, then fix. Running the
new test only on fixed code proves nothing — green-on-arrival tests
are how "regression suites" accumulate tests that would pass with the
bug present. If writing the failing test is hard, that difficulty is
information: the code lacks a seam at the failure point (making the
seam is often part of the real fix; deep untestable legacy →
legacy-modernisation).

Test at the failure's natural level: a unit test for a logic bug, an
integration test for a seam/contract bug (suite placement and design →
testing-development).

## Verifying intermittent fixes — do the arithmetic

For a bug with measured baseline failure rate *p* (you measured it —
reproduce-and-minimise.md), N consecutive clean runs give confidence
roughly `1 - (1-p)^N` that something changed. Useful rule of thumb:
**N ≈ 3/p for ~95% confidence** — verified against the underlying
formula:

| Baseline rate | Clean runs for ~95% |
|---|---|
| 1 in 2 | ~5 |
| 1 in 10 | ~30 |
| 1 in 50 | ~150 |

"Ran it three times after the fix" verifies nothing for a 1-in-10
flake. If the required N is impractical, strengthen the repro first
(raise *p* with stress/probe-delays — heisenbugs-and-concurrency.md)
and verify against the strengthened version.

## Root cause vs trigger vs symptom

Distinguish the three in the write-up — fixes aimed at triggers
regress later by another route:

- **Symptom**: the crash/wrong output observed.
- **Trigger**: the input/timing that exercised the defect *this time*.
- **Root cause**: the broken assumption or invariant that made the
  trigger able to cause the symptom.

Rejecting the null-record *trigger* is a patch; fixing the join that
*produced* null records is the cause; both might be right (defence in
depth) — but only if the cause is fixed. Ask "why" past the first
answer until it lands on a decision/assumption ("we assumed IDs are
unique across shards") — that is where the fix and the lesson live.

## The same-pattern sweep

A root cause is a *pattern instance*; the codebase usually contains
siblings. Before closing, sweep for the class, not just the fixed
occurrence — the same wrong idiom, other callers of the misused API,
copies of the flawed snippet:

```bash
grep -rn 'parseDate(' src/ | grep -v 'withTimezone'   # shape: find the
                                                      # pattern, exclude
                                                      # the corrected form
```

Fix or file each sibling found. Skipping the sweep is how the "same
bug" ships three more times from code review's blind spots.

## Strengthen detection

Ask: *why did this bug survive until now?* If the answer is "nothing
checked the invariant", add the check — an assertion, a validation at
the seam, a permanent structured log line, an alert on the metric that
would have caught it earlier (telemetry design →
observability-development). The best debugging sessions leave the
system easier to debug next time.

## Write it down

A three-line note in the project's log (task board, progress notes,
commit body): symptom → root cause → fix, plus anything expensive
learned on the way ("the staging DB has non-UTC timestamps").
Non-trivial bugs recur in variants; the note is what makes the next
occurrence a lookup instead of a second investigation. If the fix is
deliberately a workaround, label it as such where the code and the
board can both see it, and file the root-cause task.

## Boundaries

Test design depth and suite strategy → testing-development. Reviewing
the fix as a change → code-review-development. Bisect evidence for
the write-up → git-workflow. Production alerting on the failure class
→ observability-development.
