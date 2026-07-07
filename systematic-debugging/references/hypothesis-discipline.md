# Hypothesis Discipline

The difference between debugging and flailing is a written, falsifiable
hypothesis. This file is the scientific method as a working protocol —
the part of debugging that fails first when time pressure rises.

## The experiment record

Keep a running log — a scratch file next to the work, entries in the
task notes, whatever survives the session. For agents this is the
load-bearing artifact: after a context compaction, the log *is* the
debugging session. Per cycle:

```text
HYPOTHESIS: the cache returns stale entries after a key is re-added
PREDICTION: if true, logging cache.get(k) at seam X shows the old
            value while the DB row is already updated
EXPERIMENT: add probe at X, run repro once
RESULT:     cache shows NEW value — prediction wrong
VERDICT:    hypothesis falsified; staleness is not in the cache read
```

Rules the record enforces:

- **A hypothesis names a mechanism**, not a location. "Something in
  the parser" is a search area; "the parser treats CRLF as two
  newlines" is testable.
- **The prediction is written before the experiment runs** — otherwise
  every outcome gets rationalised as expected.
- **One variable per experiment.** Two changes that "fixed" it teach
  you nothing about which mattered, and the superfluous one stays in
  the code as noise.
- **Falsified hypotheses are progress** — each one shrinks the space.
  Record them; re-testing a ruled-out idea two hours later is the
  signature of logless debugging.
- **Revert every experiment that didn't conclude the session** before
  the next one. Accumulated probe edits contaminate later experiments.

## The assumption audit

When hypotheses keep failing, the wrong belief is usually upstream of
all of them. Write down what you are *assuming*, then verify the cheap
ones:

- "The code I'm editing is the code that's running" — stale build,
  wrong environment, cached artifact, undeployed change. Embarrassingly
  common; check first.
- "This function is actually called" — one probe settles it.
- "The config/flag has the value I think" — print it at runtime; don't
  read it off the file.
- "The input is what I think" — log it at entry, verbatim.
- "The library does what its name suggests" — read its docs for the
  version actually installed (read-the-damn-docs).

Verify from the cheapest assumption upward. Most "impossible" bugs are
an assumption on this list being false.

## Priors — where bugs actually live

Order hypotheses by base rate, not by novelty: your newest code, then
your code, then configuration/environment, then dependencies' *usage*
(you calling it wrong), then dependencies themselves, and only then
compilers/runtimes/OS. Platform bugs exist, but "select isn't broken"
— earn that hypothesis with a minimal repro against the platform in
isolation before acting on it. Corollary: whatever changed most
recently is suspect number one, which is why bisecting history
(isolate-and-bisect.md) is so often the fastest opening move.

## Rubber-duck explanation

Explain the failing flow line by line — to a colleague, a file, or the
commit message draft — stating what each step *should* do and what you
believe it *does*. The act of serialising the model exposes the gap in
it; the sentence you can't finish honestly is usually the bug's
address. For an agent, writing the explanation into the log doubles as
the record.

## Timeboxing and stepping back

Set a budget per approach (30–60 minutes of wall-clock or a fixed
number of experiment cycles). When it expires without convergence:

1. Re-read the experiment log — do the falsified hypotheses share an
   assumption? Audit it.
2. Return to an earlier loop stage: re-minimise the repro, or pick a
   different search axis to bisect.
3. Escalate or hand off *with the log* — a documented dead-end search
   is valuable; an undocumented one must be repeated.

Sunk-cost escalation — "one more tweak" for hours down a single theory
— is the expensive failure mode. The log's timestamps make it visible.

## Cognitive traps

- **Confirmation bias**: design experiments to *falsify* the favourite
  hypothesis, not to confirm it — seek the test that would prove you
  wrong.
- **Anchoring on the first theory**: generate two or three candidate
  mechanisms before testing any; it prevents tunnel vision.
- **Pattern-matching on stale experience** ("this is always DNS"):
  fine as a prior, poisonous as a conclusion — it still needs its
  experiment.

## Boundaries

Choosing what to observe for each experiment →
instrumentation-and-observation.md. Halving strategies the experiments
plug into → isolate-and-bisect.md. Closing the session properly →
verify-and-regression.md.
