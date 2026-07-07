# Instrumentation and Observation

You cannot fix what you cannot see. Instrumentation turns a hypothesis
into an observation — but each technique perturbs the system and costs
setup time differently. Climb the ladder deliberately.

## The observation ladder

1. **What already exists** — error output, application logs, CI
   artifacts, traces/metrics if the system emits them. Always exhausted
   first: it's free and it can't perturb anything.
2. **Reading the code** along the failing path, with the stack trace as
   the map. Cheap, and often sufficient once the repro is minimal.
3. **Added logging/prints** — targeted probes at chosen seams.
4. **Interactive debugger** — breakpoints, stepping, live state.
5. **Tracers and profilers** — syscall/library tracing, CPU/allocation
   profiles, for "where does the time/memory go" questions.
6. **Post-mortem artifacts** — core/crash dumps, heap snapshots, for
   crashes you can't attend or reproduce interactively.

Per-language tool names and mechanics → the language skills; the
choice of rung and placement of probes is this skill's job.

## Logging as instrumentation

The probe that answers a hypothesis logs **value and expectation**, at
a **seam**, with a **removable marker**:

```bash
# Shell example; same shape in any language
log_probe() { printf 'PROBE-BUG42 %s\n' "$*" >&2; }

log_probe "before parse: bytes=${#raw} expected>0"
log_probe "after parse: rows=${row_count} expected=${input_count}"
```

- **Value AND expectation** — "rows=17 expected=20" localises the bug
  the moment it prints; a bare "rows=17" still needs archaeology.
- **A greppable marker** (`PROBE-BUG42`) makes removal mechanical
  before the fix ships — shotgunned anonymous prints outlive sessions.
- **At seams**: function boundaries, layer transitions, before/after
  the suspect call — where the wolf-fence needs posts
  (isolate-and-bisect.md).
- Log **inputs verbatim** at entry points (lengths, types, first
  bytes): what the code received is the assumption most worth
  verifying.

## Print vs debugger — the honest trade

Prints: work everywhere (CI, containers, prod-like envs, other
people's machines), capture *many runs* cheaply, leave a comparable
record, survive detached execution. Debuggers: interrogate state you
didn't predict needing, walk up the stack, mutate variables to test a
theory mid-flight, and stop *on the failing iteration* with conditional
breakpoints — one loop pass out of ten thousand.

Rule of thumb: known question, unknown answer → print at the seam;
unknown question ("what even is the state here?") → debugger.
Watchpoints (break when a *value* changes) answer "who mutates this?"
— the question prints answer worst. Time-travel/record-replay
debuggers (e.g. rr on Linux; availability varies by stack — 2026-07,
re-verify) record once and step backwards from the crash: worth
setup cost for rare-but-recorded failures.

## Observability-assisted debugging

In deployed systems, telemetry is the outermost bisection layer —
consume it before touching code:

- **Traces**: which service/span does latency or the error live in?
  That's the component to reproduce locally.
- **Metrics**: when did the rate change, and what deployed/changed at
  that timestamp? (Correlation across timelines →
  isolate-and-bisect.md.)
- **Structured logs**: filter by correlation/request ID to see one
  failing request end-to-end; compare a failing request's log line
  sequence against a succeeding one — the divergence point is the
  wolf-fence result.

Designing this telemetry (what to emit, naming, SLOs) →
observability-development; this skill spends it.

## Post-mortem observation

For crashes without a live session: enable core/crash dumps in the
failing environment, capture thread stacks on hangs (the "where is
everyone stuck" snapshot — deadlock analysis in
heisenbugs-and-concurrency.md), take heap snapshots for leak growth
comparison (two snapshots, diff the retained sets). The principle:
turn an unattendable failure into an artifact you can study at
leisure.

## Instrumentation hygiene

- Remove probes before completion — grep for the marker. If a probe
  proved decisive, consider promoting it to a *permanent* structured
  log line or assertion at that seam: the next bug in the area starts
  half-solved.
- Beware probe cost: heavy logging in a hot loop changes timing (and
  can hide races — heisenbugs-and-concurrency.md) and floods the
  signal. Sample, or gate probes behind the smallest scope that still
  answers the hypothesis.

## Boundaries

Which seam to probe → isolate-and-bisect.md. What the observation
means → hypothesis-discipline.md. Language-specific debugger/profiler
mechanics → the language skills. Telemetry design →
observability-development.
