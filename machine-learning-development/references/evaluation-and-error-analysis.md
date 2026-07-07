# Evaluation and error analysis

Evaluation is the product: the model is only as trustworthy as the number
that recommends it. This file covers choosing metrics that match the
decision, calibrating and thresholding scores, quantifying uncertainty,
and the highest-leverage activity in applied ML — reading the errors.

## Metric selection beyond the table

The SKILL.md table gives starting points; the refinements:

- **ROC-AUC vs PR-AUC**: ROC-AUC is stable to class balance and answers
  "does the model rank positives above negatives?"; PR-AUC answers "what
  does precision look like where I'd actually operate?" — on imbalanced
  problems the latter is the honest one, and both can coexist in a report.
- **Report the operating point, not just the curve**: the deployed model
  runs at one threshold; state precision, recall and volume *there*.
- **Regression**: MAE for interpretable typical error; RMSE when large
  errors are disproportionately costly; MAPE only when zeros are
  impossible and relative error is what the business feels; **quantile
  loss** when over- and under-prediction cost differently (inventory,
  staffing).
- **Multiclass**: macro-average when minority classes matter, weighted
  when prevalence should count; always look at the per-class confusion
  matrix — the aggregate hides which confusions are expensive.

## Calibration and thresholds

A score is only a probability if it's calibrated — and downstream
consumers (expected-value decisions, ranking by risk, human review
queues) usually assume it is.

- **Check first**: reliability curve (predicted probability vs observed
  frequency, binned) plus Brier score / log loss. GBDTs and deep nets are
  routinely miscalibrated; anything trained on resampled data certainly is.
- **Fix post-hoc**: isotonic regression (flexible, needs data) or Platt
  scaling (small data) via sklearn's `CalibratedClassifierCV`, fitted on
  held-out folds — never on the test set.
- **Thresholds come from costs, not habit**: with cost per false positive
  and false negative, sweep validation thresholds and pick the
  expected-cost minimiser (or the constraint form: "max recall subject to
  precision ≥ 0.8"). Re-derive the threshold whenever the model, the
  population or the costs change — a threshold is a deployment artefact,
  versioned with the model.

## Uncertainty

A metric without uncertainty invites decisions on noise:

- **Bootstrap the test set** (resample rows with replacement ~1,000×,
  recompute the metric) for a confidence interval — cheap and
  assumption-light. Grouped data bootstraps *groups*, not rows.
- **Seed variance** for deep models: ≥3 training runs; report spread. A
  0.3-point improvement with a 0.5-point seed spread is a coin flip.
- Two models are only meaningfully different if the difference survives
  the interval — compare on identical splits, ideally on paired
  predictions.

## Slice-based evaluation

Aggregates hide the failures that matter:

- Slice by **segment** (plan, region, device), **time** (recent vs old —
  a proxy for drift sensitivity), **cohort** (new vs tenured entities),
  and **data-quality strata** (rows with imputed values vs complete).
- A model can pass overall and fail your largest customer, newest market,
  or any protected group — slicing by legally protected attributes is
  fairness due diligence (obligations → `secure-development`).
- Automate the slice report: the same slices, every model iteration —
  regressions on a slice are invisible in the headline number.

## Error analysis — the highest-leverage hour

After each serious training round, on validation (never test):

1. **Read the top-loss examples** — the 30–50 most confidently wrong
   predictions, individually. Patterns emerge fast: a mislabelled class, a
   data-entry artefact, a segment with different semantics, truncated
   text, units confusion.
2. **Cluster the failures** into named modes with rough counts — "wins by
   fixing labels", "needs a feature the model can't see", "genuinely
   ambiguous". This is next sprint's backlog, ranked by count × fixability.
3. **Audit labels in the error set** — a chunk of "model errors" are label
   errors; systematic label-noise hunting tools exist at decision level,
   but reading examples catches most of it.
4. **Check errors against slices** — if failures concentrate in a slice,
   the fix is data or features for that slice, not global tuning.

The loop — evaluate, read errors, fix data/features, re-evaluate — beats
hyperparameter archaeology on almost every real project.

## Reporting discipline

A result that leaves the team states: metric + interval on the sealed test
set, the baseline and incumbent on the same split, the operating
threshold and its confusion matrix, slice table, and the run ID that
reproduces it (`tracking-and-production.md`). Anything less is an
anecdote.
