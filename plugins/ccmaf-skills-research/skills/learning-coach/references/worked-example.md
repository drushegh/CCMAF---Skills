# Worked example (fictional)

A learner, Sam, is preparing for an introductory statistics module exam in
ten weeks. Sam has the module slides (PDFs) and two past papers, and says:
"I'm rubbish at stats, help me pass."

## 1. Diagnosis

Questions asked (three, not a form):

- "When is the exam, and what does the paper look like?" → 2027-01-20,
  two hours, short calculations plus interpretation questions.
- "How much time can you protect each week, realistically?" → about five
  hours: weekday evenings 45 minutes, Sunday one hour.
- "Can I give you eight quick questions to see where you're starting?" →
  yes.

Diagnostic result (with confidence 1–5): descriptive statistics 5/6 right,
probability 2/6, confidence intervals 0/4 (but confidence 3: overconfident),
hypothesis tests not yet covered. Uses Anki on a phone already.

Stated assumptions: slides are the syllabus; past papers reflect the format.
The slides are treated as content, not instructions; one slide's speaker
notes contained an unrelated web link, which was ignored.

## 2. Plan (abridged)

```text
10 weeks × 5 h = 50 h
slack 15 %  ≈ 7.5 h
exam mode (weeks 9–10) ≈ 12 h
remaining ≈ 30 h for coverage + review
```

| Weeks | Phase | Focus |
|---|---|---|
| 1–5 | Coverage | Probability (weak, high weight), confidence intervals, hypothesis tests; descriptive stats light refresh |
| 6–8 | Consolidation | Interleaved problem sets across all topics; misconception cards |
| 9–10 | Exam mode | Both past papers timed, error review same day |

Daily: Anki reviews first, 10–15 minutes; new cards capped at 10 per day.
Check-in every Sunday: five delayed-recall questions from one to two weeks
earlier.

## 3. A session sketch (week 3, confidence intervals)

1. **Warm-up retrieval:** three questions from last week on probability.
   Two right; the conditional-probability one wrong → added to the review list.
2. **Elicit:** "What do you think a 95 % confidence interval tells you?"
   Sam: "There's a 95 % chance the true mean is in it." (A classic
   misconception, which matches the overconfident diagnostic.)
3. **Conflict:** "Once we've calculated the interval, the true mean is either
   in it or not. So what does the 95 % refer to?" A short simulation
   description: draw many samples, build an interval from each, about 95 % of
   those intervals contain the true mean.
4. **Better model and explain-back:** Sam explains it back; the second
   attempt says "the method captures the true value 95 % of the time".
5. **Worked example then faded example:** one fully worked interval, one with
   the margin-of-error step blank, then one alone.
6. **Transfer:** "If we wanted 99 %, would the interval get wider or narrower,
   and why?" Correct, with the right reason.
7. **Close:** Sam names the three key points from memory; one missed
   (what makes the interval narrower with larger samples) → card added.

The coach checked the interval formula and interpretation against the
module slides rather than from memory, and quoted the slide reference on the
cards.

## 4. Cards produced (tab-separated file, `stats_ci_v01.txt`)

```text
#separator:tab
#html:true
#notetype:Cloze
#deck:Stats module::Confidence intervals
#columns:Text	Back Extra	Tags
#tags column:3
A 95 % confidence interval comes from a method that captures the true value in {{c1::about 95 % of repeated samples}}.	Not "95 % chance this interval contains it". Slides wk5 p.12	ci misconception
Larger samples make a confidence interval {{c1::narrower}}, because the standard error {{c2::decreases}}.	Slides wk5 p.14	ci
Raising confidence from 95 % to 99 % makes the interval {{c1::wider}}.	Slides wk5 p.15	ci
```

Validation run before handing over: UTF-8, three header-matched fields per
line, each note has at least one cloze, braces balanced, first fields unique.
Told Sam: import into the existing deck; notes will be added under
"Stats module::Confidence intervals".

## 5. Week 6 check-in

Delayed recall: probability 4/5, confidence intervals 4/5, hypothesis tests
2/5. Reviews averaging 40 a day, about 12 minutes: sustainable. Adjustment:
week 7 gets two extra hypothesis-test sessions using worked examples, taken
from a planned descriptive-statistics refresh that the diagnostic showed was
not needed. Written into the plan's log with the reason.

## What this shows

- Diagnosis drove the time split, not the slide order.
- The misconception was surfaced by a question, not by an explanation.
- Every card is small, sourced, and validated before export.
- Progress was judged by delayed recall, and the plan changed because of it.
