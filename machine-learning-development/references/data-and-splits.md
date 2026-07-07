# Data, splits and leakage

Split design *is* evaluation design: the split simulates deployment, and
every mismatch between the two inflates the offline number. Leakage is the
failure mode that produces the most confident wrong models in the field.

## The data audit (before any modelling)

Look at the actual data, not just its schema:

- **Shape and coverage** — row counts over time; gaps, spikes, regime
  changes (a pricing change mid-history is a distribution shift already).
- **Nulls and sentinels** — real missingness vs `-999`/`1970-01-01`/empty
  strings; *why* values are missing (missingness that correlates with the
  target is itself a feature — or a leak).
- **Duplicates and near-duplicates** — exact rows, and same-entity
  re-rows; these silently bridge splits later.
- **Target distribution** — class balance, outliers, label noise; per
  time-slice, not just overall.
- **Label provenance** — when was each label written, by what process,
  and could it have changed after the fact?
- **Ranges and units** — impossible ages, negative durations, mixed
  currencies. Fix upstream where possible (`data-engineering-development`
  owns pipeline-scale quality gates).

## Split taxonomy

| Constraint present | Split |
|---|---|
| None (rows exchangeable) | Random, stratified by target |
| Time (any process that evolves) | Temporal: train strictly before test; validate with rolling-origin (expanding or sliding window) |
| Entities with multiple rows | Group split (sklearn `GroupKFold`-style): an entity appears on exactly one side |
| Time + entities | Group-aware temporal split — both constraints simultaneously |

Rules:

- **Freeze the test set first** and treat it as radioactive: no feature
  work, no tuning, no "quick look" touches it. It is spent exactly once,
  at the end.
- **Validation strategy mirrors the test split**: temporal test →
  temporal validation folds; grouped test → grouped folds. Tuning on
  random folds and testing temporally guarantees a surprise.
- Small datasets: repeated/nested cross-validation rather than one lucky
  split; report variance across folds, not just the mean.

## The leakage catalogue

Leakage = information available in training that will not be available at
prediction time. The canonical forms:

- **Target leakage** — features that encode the outcome:
  `account_closed_reason` in a churn model, post-diagnosis lab codes,
  fields populated by the very process the model should trigger.
- **Temporal leakage** — features aggregated over windows that extend past
  the prediction moment ("orders in the 30 days *around* signup"), labels
  computed with revisions made later.
- **Preprocessing leakage** — any transform fitted on the full dataset
  before splitting: scaling, imputation, target encoding, feature
  selection, dimensionality reduction. The fix is structural, not
  vigilance: fit transforms inside the pipeline on training folds only
  (`features-and-pipelines.md`).
- **Group leakage** — the same user/patient/device in train and test;
  near-duplicate documents or images across the split.
- **Selection leakage** — filtering rows using information from the whole
  dataset (e.g. dropping "inactive" users defined by future behaviour).

**The smell test:** a jump in offline performance that lacks a mechanism
is leakage until proven otherwise. AUC 0.99 on a genuinely hard problem
means audit the top features (permutation importance, single-feature
models) — a single feature that nearly perfectly separates classes is
almost always a leak, not a discovery.

## Class imbalance

- **First, fix the metric, not the data**: PR-AUC and
  precision/recall at the operating threshold; accuracy is meaningless at
  99:1 (`evaluation-and-error-analysis.md`).
- **Class weights** (`class_weight="balanced"` in sklearn estimators, or
  `scale_pos_weight` in GBDT libraries) are the cheap, safe first lever.
- **Threshold selection** does most of the remaining work: train on the
  natural distribution, choose the operating threshold from costs on
  validation.
- **Resampling (SMOTE-class oversampling, undersampling)** is a last
  resort: apply it *inside* the pipeline, on training folds only, never to
  validation or test — evaluation must see the true distribution. Note
  that resampling distorts predicted probabilities; recalibrate afterwards
  if probabilities matter.
- Extreme imbalance with rare, expensive positives (fraud) often reframes
  better as anomaly detection or ranking-for-review than as plain
  classification.
