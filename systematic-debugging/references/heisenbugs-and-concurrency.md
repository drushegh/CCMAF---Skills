# Heisenbugs and Concurrency

A heisenbug changes behaviour when you try to observe it — the
debugger's pause, the print's I/O, the log's lock acquisition all
shift timing, and timing-sensitive bugs hide. The response is not
frustration; it's switching to observation techniques that perturb
less, and treating "observation changes it" as a *diagnostic result*:
the bug is timing- or state-dependent, which narrows the hypothesis
space considerably.

## Low-perturbation observation

Ordered by decreasing perturbation — descend until the bug stops
hiding:

1. **Standard logging** — often already too slow/synchronising.
2. **In-memory ring buffer** — append events to a preallocated buffer;
   dump it only after the failure. Nanoseconds per event, no I/O or
   locks on the hot path.
3. **Counters/flags** — atomically increment on suspect events; read
   at exit. Confirms *whether/how often* without recording *when*.
4. **Post-mortem artifacts** — crash dumps, thread stacks captured at
   failure; zero cost until the moment of death.
5. **Record-replay tooling** (rr and stack equivalents — availability
   varies; 2026-07, re-verify) — record the failing run once, then
   step through the *recording* with zero further perturbation.

## Race conditions

Symptoms: intermittent failure, corruption that varies run to run,
failures only under load or only on faster/slower machines, tests that
fail in the suite but pass alone.

**Make the improbable frequent.** A race that fires 1-in-10,000 runs is
undebuggable; raise the collision probability first:

- Stress: run the operation in a tight loop across many threads/
  processes; add parallel load.
- Widen the window **as a probe**: an injected delay between the
  suspected check and act makes the race fire reliably — which both
  confirms the mechanism and gives you a deterministic repro. (A sleep
  is only ever a probe. A sleep shipped as the *fix* is the canonical
  symptom-patch: you've re-narrowed the window, not closed it.)
- Run under the stack's race detector/thread sanitiser where one
  exists (→ language skills): they catch data races the stress loop
  merely makes likely.

The classic shapes to hypothesise against: check-then-act (TOCTOU),
read-modify-write on shared state, unsynchronised lazy initialisation,
iteration during mutation, and callback/completion ordering
assumptions. The fix is structural — atomic operations, locks with a
defined ordering, immutability, message passing — never timing.

## Deadlocks

A hang is one of: deadlock (circular waiting), livelock (busy but no
progress), starvation, or an unbounded wait on something external.
Diagnose with a **thread/stack dump of the hung process** (every stack
at once): deadlocked threads each sit in an acquire, and the cycle
A-holds-X-wants-Y / B-holds-Y-wants-X reads straight off the dump.
Two dumps a few seconds apart distinguish deadlock (identical) from
livelock/slow progress (moving). Prevention is lock ordering, lock
scope minimisation (never hold across I/O), and timeouts on acquisition
so production fails loudly instead of hanging silently.

## State-accumulation bugs

"Fixed by restart" is a finding: something accumulates — cache
entries, connections, file handles, memory, queue depth, disk. Compare
a fresh instance against a long-running one (differential debugging —
isolate-and-bisect.md) on those dimensions; take two heap/resource
snapshots an interval apart and diff growth. The bug is wherever the
curve doesn't flatten.

## Works-on-my-machine

A heisenbug cousin: the observation platform (your machine) differs
from the failing one. Freeze the environment axis by reproducing
inside a container/VM matching the failing environment; then it's
ordinary differential debugging over data, config, versions and load
(isolate-and-bisect.md). Timing differences deserve special suspicion:
CI machines are slower, more parallel and colder-cached than dev
laptops — a CI-only failure is a race until proven otherwise.

## Native-code corruption

In unsafe languages, memory corruption produces symptoms that *move*
when unrelated code changes (layout shifts) — the meta-signature to
recognise. Stop chasing the moving symptom; run the memory/address
sanitiser (→ the language skill) and fix the *first* reported
violation: everything after the first corruption is untrustworthy.

## Time bugs

Deterministic-but-calendar-dependent: TZ and DST transitions,
month/quarter boundaries, leap years/seconds, epoch overflows, clock
skew between machines, wall-clock vs monotonic confusion. When a bug
correlates with *when* rather than *what*, set the clock as the
experiment variable (freeze/mux time in tests; most stacks have a
clock-injection idiom → language skills).

## Boundaries

Suite-level flake quarantine/retry *policy* → testing-development
(this file finds the individual flake's cause). Race-detector and
sanitiser invocation per stack → language skills. Verifying a fix for
an intermittent bug statistically → verify-and-regression.md.
