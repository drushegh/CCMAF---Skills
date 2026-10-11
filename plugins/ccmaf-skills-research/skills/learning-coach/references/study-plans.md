# Study plans

A plan is a budget of the learner's real time, spent mostly on retrieval and
review, with a scheduled point to re-plan.

## Diagnosis (ask before planning, keep it short)

1. **Goal:** exam (which, what format, what pass mark), a work skill, a
   certificate, or curiosity? What does "done" look like?
2. **Deadline:** a date, or ongoing?
3. **Time:** hours per week they can actually protect, and when (daily
   20 minutes beats a hopeful Saturday block).
4. **Starting point:** a short diagnostic quiz on the syllabus beats
   self-report. Five to ten questions across topics, scored, with
   confidence ratings.
5. **Materials:** syllabus, textbook, slides, past papers, existing deck?
6. **Constraints:** device for flashcards, whether they already use Anki or
   similar, any accessibility needs.

Do not ask all six as a form. Ask the two or three that matter most for the
request, infer the rest, and state your assumptions in the plan.

## Backward planning from a deadline

```text
weeks_available = deadline - today
hours_total     = weeks_available * hours_per_week
reserve 15–20 % as slack (illness, overruns)
reserve 20–30 % for final mixed practice / timed papers (last 1–3 weeks)
remainder: coverage + spaced review of covered material
```

Phases:

1. **Coverage (first ~50–60%)**: each topic gets first-pass learning, then
   enters review. Weight topics by exam weight times weakness from the
   diagnostic.
2. **Consolidation (middle)**: interleaved practice across covered topics;
   flashcard reviews continue daily; revisit the weakest topics.
3. **Exam-mode (final 1–3 weeks)**: timed, mixed, past-paper style
   questions under exam conditions; review errors the same day; no big new
   topics in the last few days.

If the arithmetic does not fit (the syllabus needs more hours than exist),
say so plainly and offer choices: prioritise the high-weight topics, accept a
lower target, or find more hours. Do not hide the shortfall.

## Weekly template (ongoing or within a phase)

| Day | Block | Content |
|---|---|---|
| Daily | 10–20 min | Flashcard reviews due today (always first) |
| 3–4 days | 30–60 min | New topic: worked example → practice → explain-back |
| 1–2 days | 30–60 min | Mixed retrieval across older topics; past-paper questions |
| Weekly | 15 min | Check-in: what failed this week, adjust next week |

Session length: focused blocks of 25–50 minutes with breaks tend to beat
marathons; adapt to the learner.

## Review budgeting

- Each new card adds review work for weeks. A rough working figure: daily
  reviews settle at several times the daily new-card count (this varies with
  the scheduler, retention target and difficulty — measure the learner's own
  numbers after two weeks rather than predicting).
- Set new cards per day from available review time, not from how much
  material there is. If due reviews exceed the time available, pause new
  cards until the backlog clears.

## Plan file format

Keep the plan as a Markdown file the learner owns:

```markdown
# Study plan: <subject> — exam 2027-01-20

Assumptions: 6 h/week (Mon–Thu evenings 1 h, Sat 2 h); diagnostic 2026-10-11.

## Targets
- Pass mark 60 %; aiming 70 %.

## Phases
| Weeks | Phase | Focus |
|---|---|---|
| 1–6 | Coverage | Topics A, B, C (weak), D |
| 7–10 | Consolidation | Interleaved A–D, weak-topic focus C |
| 11–14 | Exam mode | Timed past-paper style questions |

## Log
| Date | Did | Delayed-recall check | Notes |
|---|---|---|---|
```

The log column that matters is the delayed-recall check: a handful of
questions on material from one to two weeks ago, without notes.

## When the plan slips

- Missed a week: do not "catch up" by doubling. Drop or shrink the lowest
  priority remaining items, keep reviews going.
- Reviews piling up: stop new cards, clear reviews over several days.
- Diagnostic scores not moving on a topic: change method (more worked
  examples, a different explanation, prerequisite gap), not just more of the
  same.
- Re-plan at the scheduled check-in, write down what changed and why.

## Pitfalls

- Plans with a new topic every session and no review slots.
- Equal time for every topic regardless of weight and weakness.
- No slack, so the first disruption breaks the plan.
- Measuring hours or cards rather than delayed recall.
