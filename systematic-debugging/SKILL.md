---
name: systematic-debugging
description: >-
  The language-independent debugging method: reproduce deterministically,
  minimise the failing case, isolate by binary search (code bisection,
  git bisect, differential debugging against a working instance), form
  one falsifiable hypothesis at a time, instrument to observe instead of
  guessing, fix the root cause, and exit through a regression test —
  plus the anti-patterns (shotgun edits, symptom patching) called out by
  name. Use whenever ANY bug, crash, wrong output, flaky test,
  regression, performance cliff or "works on my machine" problem is
  being investigated — in any language or stack, BEFORE proposing the
  first fix, and especially after a fix attempt has already failed.
  Triggers include: stack traces, error logs, failing CI, "why is this
  happening", "cannot reproduce", intermittent or timing-dependent
  behaviour, "it worked yesterday", heisenbugs, race conditions,
  deadlocks, repeated fixes that didn't stick, debugging going in
  circles, production incidents needing a root cause.
---

# Systematic Debugging

Debugging is applied science, not archaeology by vibes: observe, form a
falsifiable hypothesis, run the cheapest experiment that could disprove
it, and only then change code. This skill owns that method across every
language and stack. Debugger and profiler *mechanics* live in the
language skills; the method here is what decides which tool to reach
for and when. Shell blocks in this skill parse under `bash -n`; the
method itself has no machine-verifiable form — it is distilled from
long-standing practice (Zeller's delta debugging, Agans' nine rules,
the scientific method).

## The loop

```text
Reproduce → Minimise → Isolate → Hypothesise → Instrument & observe
    → Root cause → Fix (smallest correct) → Verify + regression test
```

Any observation that surprises you sends you **backwards** in the loop
(usually to Reproduce or Hypothesise) — never forwards on hope. Most
failed debugging sessions are jumps straight from symptom to Fix.

## Non-negotiables

1. **Reproduce before you fix.** Without a reproduction you cannot
   verify a fix — you can only stop seeing the symptom. "Cannot
   reproduce" is a finding to investigate, not a reason to guess
   ([references/reproduce-and-minimise.md](references/reproduce-and-minimise.md)).
2. **Read the whole error.** Bottom frame of the stack, the *first*
   error of a cascade, the actual values in the message. Half of all
   bugs are solved by reading what the system already said.
3. **One hypothesis, one change at a time.** Write the hypothesis down
   before testing it; revert every change that didn't fix anything —
   non-fixes left in place become tomorrow's mystery
   ([references/hypothesis-discipline.md](references/hypothesis-discipline.md)).
4. **Fix causes, not symptoms.** A `try/catch` around the crash, a
   `sleep` before the race, a retry around the flake — each converts a
   loud bug into a quiet one. Ask *why* until the answer is a broken
   assumption or invariant, and fix there.
5. **Not fixed until proven fixed.** A regression test that fails
   without the fix and passes with it, verified against the *original*
   reproduction — then sweep the codebase for the same pattern
   ([references/verify-and-regression.md](references/verify-and-regression.md)).
6. **Two failed fixes → stop editing, start measuring.** Repeated fix
   attempts mean your model of the system is wrong; more edits from the
   same wrong model just destroy evidence. Step back to observation.
7. **Assumptions are not evidence.** List what you believe but haven't
   verified ("the config is loaded", "this function is even called",
   "the deploy actually shipped") and check the cheapest ones first.
   It is almost always your code — but *verify* the layer boundaries.
8. **Keep a written log** of what you tried, observed and ruled out.
   For agents this is load-bearing: a debugging session that outlives a
   context window survives only through its notes.

## First move, by bug class

| Bug class | First move |
|---|---|
| Deterministic failure with an error | Read the error fully; minimise the reproduction |
| Regression ("worked before") | Bisect history — `git bisect run` (mechanics → git-workflow) |
| Works in env A, fails in env B | Differential debugging: enumerate and halve the differences ([references/isolate-and-bisect.md](references/isolate-and-bisect.md)) |
| Intermittent / timing-dependent | Measure the failure rate first; low-perturbation observation ([references/heisenbugs-and-concurrency.md](references/heisenbugs-and-concurrency.md)) |
| Wrong output, no error | Instrument the seams; walk the data through each boundary ([references/instrumentation-and-observation.md](references/instrumentation-and-observation.md)) |
| Performance cliff | Measure/profile before reading code — intuition about hot paths is usually wrong |
| Production-only | Existing telemetry first (traces/metrics/logs) to localise, then reproduce locally |

## Anti-patterns — recognise them in yourself

- **Shotgun debugging**: many speculative edits at once; whichever
  "worked" taught you nothing and the rest linger as noise.
- **Symptom patching**: catching the exception, sleeping the race away,
  retrying the flake, special-casing the failing input.
- **Guess-and-check without a hypothesis**: change → run → shrug →
  change. If you can't say what a change would prove, don't make it.
- **Blaming the platform first**: compiler/library/OS bugs exist but
  are rare; earn that hypothesis with a minimal reproduction against
  the platform alone.
- **"This should fix it"** shipped without reproducing the bug — the
  fix and the bug may never even have met.
- **Ritual debugging**: rebuild/restart/clear-cache with no model of
  why. (If a restart *does* fix it, that's evidence — you have a state
  or lifecycle bug; find what accumulated.)
- **Debugging in a dirty context**: uncommitted edits, stale builds,
  cached artifacts. Establish a clean, known state first.

## Workflow

1. **Capture the crime scene**: exact error text, environment,
   versions, input, timestamp, last-known-good state. Cheap now,
   impossible later.
2. **Reproduce** on demand; write it down as a command or failing test.
3. **Minimise** until every remaining element is necessary
   ([references/reproduce-and-minimise.md](references/reproduce-and-minimise.md)).
4. **Isolate** by halving the space — history, code path, input or
   environment ([references/isolate-and-bisect.md](references/isolate-and-bisect.md)).
5. **Hypothesise**; state the falsifiable prediction; log it.
6. **Instrument and observe** at the boundary the hypothesis names.
7. **Root cause**: keep asking why until you reach the broken
   assumption, not just the line that threw.
8. **Fix minimally** at the cause; revert all diagnostic scaffolding.
9. **Verify**: regression test red → green; original repro passes;
   suite green; same-pattern sweep
   ([references/verify-and-regression.md](references/verify-and-regression.md)).
10. **Record** the root cause and the trail in the project's log —
    non-trivial bugs recur in variants.

## Reference index

| Load when the task involves... | File |
|---|---|
| Building a reproduction, shrinking it, "cannot reproduce", flake rates | [references/reproduce-and-minimise.md](references/reproduce-and-minimise.md) |
| Bisecting history/code/input/environment, differential debugging | [references/isolate-and-bisect.md](references/isolate-and-bisect.md) |
| Hypothesis records, assumption audits, timeboxing, cognitive traps | [references/hypothesis-discipline.md](references/hypothesis-discipline.md) |
| Logging for diagnosis, debuggers vs prints, tracing, post-mortem dumps | [references/instrumentation-and-observation.md](references/instrumentation-and-observation.md) |
| Bugs that vanish under observation, races, deadlocks, works-on-my-machine | [references/heisenbugs-and-concurrency.md](references/heisenbugs-and-concurrency.md) |
| Proving the fix, regression tests, root-cause classification, write-ups | [references/verify-and-regression.md](references/verify-and-regression.md) |

## Boundaries with sibling skills

- **Tool mechanics per stack** — pdb/debugpy, .NET debuggers, Node
  inspector, sanitisers, `set -x` → `python-development`,
  `dotnet-development`, `typescript-development`, `rust-development`,
  `go-development`, `bash-development`; this skill decides *when*, they
  own *how*.
- **Bisect and history archaeology mechanics** → `git-workflow`.
- **Flaky-test strategy and suite design** → `testing-development`
  (this skill debugs the individual flake's cause).
- **Hunting defects in a diff under review** →
  `code-review-development`.
- **Designing production telemetry** (what to emit, SLOs, dashboards) →
  `observability-development`; this skill *consumes* telemetry to
  localise faults.
- **Query-plan-level database performance** → `sql-development`;
  **server-level resource troubleshooting** → `linux-administration`.
- **Nondeterministic LLM behaviour** (prompt regressions, evals) →
  `llm-development`.
