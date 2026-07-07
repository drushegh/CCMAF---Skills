# Training and tuning (tabular)

Model choice on tabular data is largely settled; the craft is validation
design, a disciplined search over the few hyperparameters that matter, and
knowing when to stop. Deep-learning training routes to
`pytorch-fundamentals.md`.

## Tabular defaults (July 2026 — re-verify)

- **Gradient-boosted trees are the default**: LightGBM, XGBoost, CatBoost,
  or sklearn's `HistGradientBoosting*` (no extra dependency, natively
  handles missing values and categoricals). On most tabular problems a
  tuned GBDT is at or near the ceiling; deep tabular models
  (transformer-style) win occasionally and cost far more to operate —
  demand evidence on *your* data before adopting one.
- **Regularised linear/logistic** stays the choice for small data, heavy
  interpretability requirements, or as the calibration-friendly baseline.
- Random forests remain a reasonable low-tuning fallback; SVMs and k-NN
  are niche at modern data sizes.

## Cross-validation discipline

- The CV scheme mirrors the test split (temporal → rolling-origin, grouped
  → group folds — `data-and-splits.md`). All model selection happens here;
  the test set stays sealed.
- **Report mean ± spread across folds.** A model winning by less than the
  fold-to-fold spread hasn't won.
- When you must both tune *and* report an unbiased estimate from the same
  modest dataset, use **nested CV** (inner loop tunes, outer loop
  estimates) — tuning and reporting on the same folds overstates
  performance.

## Hyperparameter search

- **Randomised search beats grid** at equal budget; successive-halving
  (sklearn's `HalvingRandomSearchCV`) and Bayesian optimisers
  (Optuna-class) improve on it when budget is tight — decision-level, not
  mandatory.
- **Tune the few parameters that matter** for the family. GBDT:
  learning rate ↔ number of trees (fix the trade with early stopping),
  tree depth / number of leaves, min samples per leaf, subsampling
  (rows/columns), regularisation lambdas. Logistic: regularisation
  strength and penalty. Leave the rest at defaults until evidence says
  otherwise.
- **Early stopping on a validation fold** is the cheapest tuning there is
  for boosting: set trees high, stop when validation loss plateaus.
- Every search run is tracked (params in, metrics out —
  `tracking-and-production.md`); an untracked search is re-run within the
  month.

```python
from scipy.stats import loguniform, randint
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold

search = RandomizedSearchCV(
    estimator=model,                      # the full Pipeline from features-and-pipelines.md
    param_distributions={
        "clf__learning_rate": loguniform(0.01, 0.3),
        "clf__max_depth": randint(3, 12),
        "clf__min_samples_leaf": randint(10, 200),
        "clf__l2_regularization": loguniform(1e-3, 10),
    },
    n_iter=50,
    scoring="average_precision",          # PR-AUC — chosen with the metric table, not by habit
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
    random_state=42,
    n_jobs=-1,
    refit=True,
)
```

Searching over the pipeline (`clf__` prefixes) keeps preprocessing inside
the folds — tuning a bare estimator on pre-transformed data reintroduces
the leakage the pipeline prevented.

## Class weights and costs

Where errors have asymmetric costs, push the asymmetry into training
(`class_weight`, `scale_pos_weight`) *and* into the operating threshold
(`evaluation-and-error-analysis.md`) — the two compose. Don't fake costs
by resampling unless nothing else works (`data-and-splits.md`).

## Knowing when to stop

- **Plot learning curves** (performance vs training-set size): if
  validation performance is still climbing with more data, collect data,
  don't tune. If train and validation have converged, the model family is
  saturated — change features or family, not seeds.
- Diminishing returns are real: the gap between a tuned GBDT and a
  heroically tuned one is typically a fraction of what one good feature
  buys. Route surplus effort to error analysis
  (`evaluation-and-error-analysis.md`).
- Fix the ensemble temptation with a rule: ensembling is justified only
  when the uplift over the single best model exceeds the operational cost
  of serving N models forever.
