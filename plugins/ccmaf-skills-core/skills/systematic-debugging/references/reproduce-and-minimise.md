# Reproduce and Minimise

A reproduction is the debugging session's unit of currency: it proves
the bug exists, measures whether it's gone, and (minimised) usually
points straight at the cause. No reproduction → no verified fix.

## The reproduction ladder

Climb as high as the bug allows; each rung is worth effort:

1. **One-command deterministic repro** — a script or failing test that
   fails every run. The goal state.
2. **Documented manual steps** — reliable but human-driven. Convert to
   a script/test as soon as the steps stabilise.
3. **Statistical repro** — fails k times in N runs. Usable, but you
   must measure the baseline rate before you can verify any fix (see
   below).
4. **Observed once, never again** — not yet a reproduction. Work the
   "cannot reproduce" playbook.

Capture *before* the trail goes cold: exact error text (copy, don't
paraphrase), input data, versions (app, dependencies, runtime, OS),
configuration and flags, environment (container image, locale, TZ),
timestamp, and the last state known to work.

## Make the repro a failing test

The strongest form of reproduction is a test in the project's suite:
it runs the same way every time, survives context loss, becomes the
regression test when fixed, and forces precision about *expected vs
actual*. Even for exploratory debugging, a scratch test file beats
re-running the app by hand.

## Minimise — delta debugging by hand

Every element removed from a reproduction removes a suspect. The
mechanical version (Zeller's ddmin) is just disciplined halving —
apply it to whatever dimension is large:

- **Input**: delete half the data; if it still fails, keep deleting;
  if not, restore and halve the other half. Recurse.
- **Configuration**: start from defaults and add the suspect's config
  in halves — or start from the failing config and strip in halves.
- **Code path**: comment out or stub half the steps of the failing
  flow.
- **Dependencies**: a fresh minimal project + only the implicated
  library, with 20 lines that fail, is both a minimisation and the
  evidence you'd need to file an upstream issue.

Stop when every remaining element is necessary — removing anything
makes the failure disappear. A minimal repro frequently *is* the
diagnosis.

Also minimise **time-to-signal**: a repro that takes 10 minutes allows
6 experiments an hour; the same repro cut to 10 seconds allows 360.
Trimming waits, using a smaller dataset, or targeting the failing unit
directly is often the highest-leverage act of the whole session.

## The "cannot reproduce" playbook

The bug happens *there* but not *here* — so the difference between
there and here contains the cause. Enumerate the differences and test
them (full method: isolate-and-bisect.md):

- **Data** — production-shaped records (nulls, Unicode, extremes,
  volume) vs your tidy fixtures.
- **Versions** — app build, dependency lockfile, runtime, OS. Confirm
  what is *actually deployed*, not what should be.
- **Configuration and feature flags** — including per-user/per-tenant
  toggles.
- **Concurrency and load** — one user locally vs many there; run the
  repro under parallel load.
- **State accumulation** — long-running process vs fresh start; caches
  warm vs cold; disk full vs empty.
- **Time** — TZ, DST boundaries, month/quarter ends, leap days,
  certificate expiry.

If nothing surfaces, instrument where the bug lives (structured logs
around the suspect seam — instrumentation-and-observation.md) and let
the next natural occurrence generate the data you're missing.

## Intermittent bugs: measure the rate first

Before attempting fixes, establish the baseline: run the repro N times
(N ≥ 20 where feasible), record k failures. Without that number,
"ran it three times and it passed" after a fix is indistinguishable
from luck — the statistics of proving it fixed live in
verify-and-regression.md.

```bash
#!/usr/bin/env bash
set -u
fails=0; runs=50
for ((i = 1; i <= runs; i++)); do
  ./repro.sh >/dev/null 2>&1 || fails=$((fails + 1))
done
echo "failure rate: ${fails}/${runs}"
```

## Boundaries

Shrinking *history* to the breaking commit → isolate-and-bisect.md and
git-workflow. Turning the final repro into a durable regression test →
verify-and-regression.md and testing-development.
