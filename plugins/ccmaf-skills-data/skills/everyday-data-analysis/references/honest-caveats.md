# Honest Caveats

The user will repeat your sentences to other people. Every finding has to
survive that: stated at the strength the data supports, with the limits a
reasonable reader needs, in plain words.

## The claim-strength ladder

Match the verb to the evidence.

| Evidence | Say | Do not say |
|---|---|---|
| A number from the data | "Spending in September was €1,240." | |
| A comparison of two periods | "That is €140 more than September 2025." | "Spending is rising." |
| A consistent pattern over many periods | "Spending has been higher than the year before in 8 of the last 9 months." | "Spending will keep rising." |
| Two things moving together | "Months with more takeaway orders also had higher total spending." | "Takeaways are driving your spending." |
| A before/after with nothing else changing (rare) | "After the gym membership started, weekly runs went from 1.5 to 2.8 on average; other things may also have changed." | "The gym membership doubled your running." |
| A designed experiment | Causal language may be justified; check `academic-research` | |

Words that usually overstate: *proves, drives, causes, because of, always,
never, significant* (unless you ran a test and say which), *trend* (for
fewer than a dozen or so points), *dramatic, skyrocketing, plummeting*.

## Caveats that matter most often

Name only the caveats that apply, and say what each one means for the
reader.

- **Small numbers.** "Based on 14 responses" changes how much weight a 64%
  deserves. Show counts beside percentages when n is small; avoid
  percentages entirely below about 20.
- **Incomplete or missing periods.** The current month, gaps in the export,
  a device that was off for a fortnight.
- **Who is in the data.** A customer survey covers people who stayed and
  chose to answer; a fitness app covers days the watch was worn. Say who is
  missing.
- **Definitions.** What counted (refunds? transfers? trial members?) and
  anything excluded, with counts.
- **Changes in measurement.** A new categorisation, a new meter, a different
  export format mid-series.
- **One-offs.** A single large purchase that dominates a month or category;
  show the figure with and without it.
- **Data quality.** Blank categories, suspected duplicates, rows that could
  not be parsed, and how they were handled.

## Common traps (check before writing a finding)

- **Averages hiding the story.** One huge value moves a mean; report the
  median for skewed data and say why.
- **Averaging averages.** The mean of store averages is not the average
  customer. Recompute from the rows.
- **Simpson's paradox.** A pattern in every group can reverse in the total
  when group sizes differ. If a breakdown tells a different story from the
  total, show both.
- **Survivorship.** Analysing only what is still here (current members,
  products still on sale) hides what left.
- **Regression to the mean.** An unusually bad month is usually followed by
  a better one with no intervention at all. Do not credit a change made
  after a bad month without a longer view.
- **Seasonality.** December vs November says more about December than about
  a trend. Compare with the same month last year.
- **Multiple looks.** Slice data enough ways and something will look
  remarkable by chance. Report what you looked at, not just what stood out.
- **Percentage-point vs percent.** From 10% to 12% is 2 percentage points,
  or a 20% relative increase. Say which.
- **Rounding.** Shares that add to 99% or 101% are fine; say "may not sum to
  100 because of rounding".

## Uncertainty without jargon

For non-specialists, prefer plain statements over statistics:

- "September was higher than any month last year, but only by €30, which is
  within the normal month-to-month swing of about €150."
- "With 14 responses, this could easily be off by 20 points either way."
- Ranges beat point forecasts: "on current pace, between €14,000 and
  €16,000 for the year", with the assumption stated.

If the user asks whether a difference is "significant", explain that this
has a specific statistical meaning, ask whether they need that, and if so
state the test, its assumptions and the result. Do not use the word loosely.

## The caveats section of the findings note

Short, specific, ordered by how much each could change the conclusion:

```markdown
## What to keep in mind
- October 2026 has only 9 days of data, so it is left out of the monthly comparison.
- 312 transactions (6.5%) had no category; they are shown as "Uncategorised",
  which is the fourth-largest bucket. Categorising them could reorder the top five.
- Transfers between your own accounts (23) are excluded.
- One €2,400 purchase in March 2026 (sofa) makes March look unusual; without it,
  March is in line with other months.
```

## When the data cannot answer the question

Say so first, then offer what it *can* answer and what data would answer the
original question. "This export shows what was spent, not why; if you want
to know whether the new job changed spending, compare the six months either
side, but other things changed too (the move in May)."
