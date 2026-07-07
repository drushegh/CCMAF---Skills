# Problem framing and baselines

Most ML failures are framing failures wearing a modelling costume: the
wrong target, a label that means something else, or a model solving a
problem a lookup table already solved. Framing is where the project is won.

## Is ML the right tool?

Prefer, in order: a rule ("flag orders over X from new accounts"), a
lookup/aggregate ("last month's rate per segment"), then a model. ML earns
its keep when the pattern is real but too complex or too drifting for
rules — and it costs you evaluation infrastructure, monitoring, retraining
and opacity from day one. "We used ML" is a cost, never a feature.

Decide-and-flag: when a heuristic hits the success criterion, ship the
heuristic and record that the model was not needed.

## Defining the prediction target

The highest-leverage design decision, and the least examined:

- **Label availability and timing.** What is knowable *at prediction
  time*, and when does ground truth arrive? "Churn within 90 days" has a
  90-day label delay — that delay shapes validation and monitoring later.
- **Proxy risk.** "Clicked" is not "found useful"; "readmitted" is not
  "got sicker". When the label proxies the true goal, write the gap down —
  the model will optimise the proxy, including its pathologies.
- **Label provenance.** Who or what produced the labels, with what error
  rate and what incentives? Human labels drift; operational labels encode
  past policy (a fraud model trained on *caught* fraud learns yesterday's
  detection, not fraud).
- **Framing choice.** The same business question can be classification
  ("will churn?"), regression ("expected spend"), time-to-event or
  ranking. Choose the frame whose output plugs directly into the decision
  — if the action is "call the top 100 accounts", it's a ranking problem
  regardless of how the label is stored.

## Success criteria

Fix these before training:

1. **The business metric** the model should move (retained revenue, fraud
   losses, manual-review hours).
2. **The model metric** that proxies it (SKILL.md metric table), with the
   operating point: "precision ≥ 0.8 at recall 0.6" beats "good AUC".
3. **The bar**: what the baseline achieves, and the minimum uplift that
   justifies the added complexity.
4. **The constraints**: latency, explainability, fairness/regulatory
   requirements (EU AI Act risk-class questions → `secure-development`).

## The baseline ladder

Climb it in order; each rung is measured on the same splits with the same
metric as the eventual model:

1. **Constant/majority** — predicts the majority class or the mean.
   Establishes the floor and exposes the imbalance immediately.
2. **Domain heuristic** — the rule an expert would write. Often
   embarrassingly strong; always politically informative.
3. **Regularised linear/logistic on obvious features** — cheap, stable,
   interpretable; the first "real" model.
4. **GBDT with defaults** — for tabular data this is the serious
   baseline; anything more complex must beat *it*, not the majority class.

Then, and only then, complexity: tuned GBDT, deep models, ensembles.

## Why baselines are non-negotiable

- **They catch broken evaluation early.** If the majority-class baseline
  scores 0.94 accuracy, you learn your metric is wrong *before* wasting a
  week of tuning.
- **They price complexity.** "The deep model beats logistic regression by
  0.4 points of PR-AUC" is a business decision; without the baseline it's
  just a number.
- **They are the honest fallback.** When the model degrades in production,
  the baseline is what you can serve while you fix it.

## Anti-patterns

- Starting with the most powerful model "to see what's possible" — you
  learn the ceiling before knowing the floor, and leakage hides in the
  gap.
- Success defined after results exist — post-hoc bars always bend to fit.
- A target chosen because the label column existed, not because the
  prediction serves a decision.
- Framing churn/fraud/demand as pure prediction when the business acts on
  the prediction — the action changes the outcome, so define labels and
  evaluation windows around the *untreated* behaviour where possible, and
  record the interference where not.
