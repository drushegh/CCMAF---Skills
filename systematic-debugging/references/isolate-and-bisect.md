# Isolate and Bisect

Isolation is binary search generalised: any space you can halve and
test, you can search in O(log n) — 1,000 suspects become ~10
experiments. The skill is recognising *which* space contains the bug.

| Search space | The question | Tool |
|---|---|---|
| History | "When did it break?" | `git bisect run` (mechanics → git-workflow) |
| Code path | "Where along the flow does it go wrong?" | Wolf-fence instrumentation, stubbing halves |
| Input | "What in the data triggers it?" | Input halving (reproduce-and-minimise.md) |
| Environment | "What differs between working and broken?" | Differential debugging |
| Dependencies | "Which upgrade broke it?" | Lockfile bisection |

## History: bisect commits

The regression answer machine. Requirements: a predicate script that
exits 0/1 for good/bad (125 = skip), and a known-good point. Bisect
finds *the commit*, which is evidence, not the conclusion — read the
commit to understand the mechanism before fixing. Full mechanics,
exit-code contract and pitfalls (flaky predicates, `--first-parent`,
shallow clones) → git-workflow's bisect-and-archaeology reference.

When the code didn't change but behaviour did, bisect the other
timelines: deploys, config changes, data migrations, upstream API
versions — anything with an ordered history and a testable state.

## Code path: the wolf fence

"There's one wolf in Alaska; how do you find it? Build a fence down
the middle, wait to hear the howl, then fence that half." Place one
observation at the midpoint of the failing flow and ask: is the state
still correct here?

- Correct at the midpoint → bug is downstream; fence the second half.
- Already wrong → fence the first half.

Repeat until the fence brackets one function or line. This converges
in a handful of well-placed probes and beats scattering twenty log
statements everywhere at once — each probe halves the territory.
Variants: early-return before suspect stages, stubbing a component
with a known-good fake (if the bug vanishes, the removed component —
or your fake's optimism — contains it), replaying a captured
intermediate state directly into a later stage.

## Environment: differential debugging

When instance A works and instance B fails, the bug lives in the
difference. Make the search mechanical:

1. **Enumerate** every difference you can name: versions (app,
   dependencies, runtime, OS), configuration, feature flags, data,
   hardware/arch, locale/TZ, network path, load.
2. **Converge** the two instances one difference at a time — copy B's
   config into A, point A at B's data, pin A's dependencies to B's
   lockfile — retesting after each change.
3. The change that flips the behaviour names the culprit dimension;
   minimise within it (which config key? which record?).

Halve here too: apply half of B's differences to A at once, then
split the guilty half. Containers make this concrete — building the
repro into an image freezes the environment axis entirely, and
switching base images or dependency layers becomes a clean
one-variable experiment.

```bash
# Example: is it the dependency set? Pin A to B's exact lockfile.
cp /path/to/broken/package-lock.json .
npm ci                      # exact install from the lockfile
./repro.sh; echo "exit: $?"
```

## Dependencies: lockfile bisection

"It broke after `npm update`" with 40 bumped packages is a bisectable
space: restore the old lockfile (confirm it works), then advance half
the bumps at a time until the failure appears; recurse into the guilty
half. If the ecosystem's lockfile is one committed file, this is
just `git bisect` over lockfile commits with your repro as predicate.

## Layer isolation: above or below the line?

Wrong output crossing several layers (UI → API → service → DB): test
at a boundary in the middle — call the API directly with the same
payload the UI sends. Response correct → bug is above; wrong → below.
One curl halves the stack:

```bash
curl -sS -X POST http://localhost:8080/api/invoices \
  -H 'Content-Type: application/json' \
  -d @captured-request.json | tee /tmp/api-response.json
```

Keep captured requests/responses from the failing flow — they are the
fence posts for this axis (capture technique →
instrumentation-and-observation.md).

## Boundaries

Placing the probes well → instrumentation-and-observation.md. Deciding
what a bisect result *means* → hypothesis-discipline.md. Bugs whose
behaviour changes when probed → heisenbugs-and-concurrency.md.
