---
name: machine-learning-development
description: >-
  Classic and deep machine-learning engineering — models you train, evaluate
  and operate yourself (NOT LLM applications: prompting/tool-use/agents route
  to llm-development, retrieval to rag-development): problem framing and
  baseline-first discipline, data audits, split design and leakage
  prevention, imbalance handling, feature engineering in leakage-safe
  pipelines, training and tuning (scikit-learn, gradient-boosted trees,
  PyTorch), rigorous evaluation (metric selection, cross-validation,
  calibration, slice analysis, error analysis), experiment tracking and
  reproducibility (MLflow/W&B), and production ML (serving, model
  registries, data/concept drift monitoring, retraining loops). Use for any
  "train/build a model" task — churn, fraud, forecasting, classification,
  regression, ranking — sklearn or torch imports, "accuracy is low", "great
  in the notebook, wrong in production", metric/validation questions, and
  drift monitoring. PROACTIVELY activate before any model training or
  evaluation is designed.
---

# Machine Learning Development

Engineering standards for models you train yourself — tabular and deep,
from framing through production. What separates working ML from notebook
theatre is almost entirely **evaluation integrity**: what to measure, how
to split, what leaked, and whether the number survives contact with
production. Applications built on hosted LLMs route to `llm-development`;
retrieval systems to `rag-development` (boundaries below).

Context (July 2026 — re-verify): scikit-learn 1.x is the tabular substrate
(Pipeline/ColumnTransformer API stable for years); PyTorch 2.x with
`torch.compile` is the mainstream deep-learning stack; MLflow 3.x and
Weights & Biases are the commodity experiment trackers; gradient-boosted
trees (LightGBM/XGBoost/CatBoost) remain the tabular default. Pin exact
versions per project. Python code blocks in this skill and its references
are mechanically parsed (Python `ast`); they are patterns, not end-to-end
runnable scripts.

## Non-negotiables

1. **Baseline before models.** Majority class, a domain heuristic, or a
   regularised linear model — measured on the same splits. A model earns
   its complexity only by beating the baseline; many business problems end
   (correctly) at the heuristic.
2. **The test set is spent once.** Held out at the start, untouched by any
   decision — features, tuning and model selection happen on validation
   folds; every peek converts test into validation.
3. **Split by the deployment reality.** Time-ordered data gets temporal
   splits; entities (users, patients, devices) never straddle splits;
   random splits only when rows are genuinely exchangeable.
4. **All preprocessing is fitted inside the pipeline** on training folds
   only — scalers, imputers, encoders, feature selection, resampling. A
   transform fitted on all data before splitting is leakage.
5. **The metric is chosen before training** and tied to the decision the
   model serves. Accuracy alone on imbalanced data is a defect, not a
   result.
6. **Every reported result is reproducible:** seeded, with data version,
   code version, environment and config captured in an experiment tracker.
   No run ID, no result.
7. **Evaluate slices, not just aggregates.** A model 95% accurate overall
   and 60% on your largest customer segment is a 60% model wearing a good
   average.
8. **Look at the data before modelling it** — nulls, duplicates, ranges,
   target distribution, time coverage, label provenance — and read the
   top-loss errors afterwards: it beats another tuning sweep.
9. **Production models are monitored** — input distributions, prediction
   distributions, and delayed ground truth — with retraining designed as a
   loop, not performed as a panic.
10. **Suspiciously good numbers are bugs until proven otherwise.** AUC
    0.99 on a hard problem means leakage, not genius.

## Decision tables

| Problem shape | Start with |
|---|---|
| Tabular classification/regression | Gradient-boosted trees (LightGBM/XGBoost/CatBoost or sklearn's HistGradientBoosting); regularised linear as the baseline |
| Small data, or coefficients must be defended | Regularised linear/logistic regression |
| Vision, audio, free text (non-generative) | Pretrained deep model, fine-tuned (PyTorch); from-scratch training is a last resort |
| Forecasting | Seasonal-naive baseline first; then classical or GBDT-with-time-features; deep forecasters only at scale |
| Ranking/recommendation | GBDT ranker over engineered candidates; ranking metrics from day one |
| Generating or conversing in natural language | Not this skill → `llm-development` |
| Answering from a document corpus | Not this skill → `rag-development` |

| Data shape | Split design |
|---|---|
| Independent rows | Random, stratified by target |
| Any temporal process | Train on past, test on future; rolling-origin CV |
| Repeated rows per entity | Group split — the entity appears on one side only |
| Temporal + entities | Group-aware temporal split (both constraints) |

| Problem | Metric starting point |
|---|---|
| Balanced binary | ROC-AUC + accuracy at a justified threshold |
| Imbalanced binary | PR-AUC + precision/recall at the operating threshold; cost-weighted where costs are known |
| Probabilities consumed downstream | Calibration curve + Brier score / log loss |
| Multiclass | Macro-F1 + per-class recall + confusion matrix |
| Regression | MAE vs RMSE per cost shape; quantile loss for asymmetric costs |
| Ranking | nDCG@k, recall@k |

## High-frequency pitfalls

- **Preprocessing before splitting** — scaler/imputer/encoder/feature
  selection fitted on the full dataset; the classic silent leak.
- **Target leakage features** — columns that encode the outcome
  (post-event timestamps, "account_closed_reason") or are populated after
  the prediction moment.
- **Random splits on time series** — the model reads the future; offline
  metrics collapse on deployment.
- **Duplicate or near-duplicate rows across splits**, and the same entity
  on both sides of a split (group leakage).
- **Resampling (SMOTE-class) applied before splitting**, or to
  validation/test folds — synthetic copies of test information in training.
- **Threshold 0.5 by default**, and uncalibrated scores read as
  probabilities.
- **Tuning against the test set** — running it "one more time" forty
  times is model selection on test.
- **Training–serving skew** — a second implementation of preprocessing
  in the serving path, drifting from the training pipeline.
- **A deep model never overfitted on a tiny batch first** — if it cannot
  memorise 32 examples, the pipeline is broken, not underfitted.
- **Metric monomania** — optimising the offline metric while the
  business metric it proxies quietly diverges.

## Workflow

1. **Frame**: decision served, prediction target, label availability,
   costs of each error type → metric choice
   (`references/framing-and-baselines.md`).
2. **Audit the data**; design splits from the deployment reality; freeze
   the test set (`references/data-and-splits.md`).
3. **Baseline** — heuristic and simple model, measured properly.
4. **Build the leakage-safe pipeline** (features + preprocessing + model
   as one object) and iterate under cross-validation
   (`references/features-and-pipelines.md`, `references/training-and-tuning.md`).
5. **Analyse errors on validation** — slices, top losses, label quality —
   and feed findings back into data and features
   (`references/evaluation-and-error-analysis.md`).
6. **Evaluate once on test**, with uncertainty (bootstrap CI), against the
   baseline and any incumbent model.
7. **Track everything** — params, data hash, code SHA, metrics, artefacts
   (`references/tracking-and-production.md`).
8. **Ship deliberately**: registry, packaged pipeline, shadow/canary
   rollout, drift monitoring, and the same eval gates on every retrain.

## Reference index

Load on demand:

- `references/framing-and-baselines.md` — is ML the right tool, target definition, baseline ladder, success criteria
- `references/data-and-splits.md` — data audit, split taxonomy, the leakage catalogue, imbalance handling
- `references/features-and-pipelines.md` — feature engineering, leakage-safe sklearn pipelines, encodings, train/serve skew
- `references/training-and-tuning.md` — tabular defaults, cross-validation, hyperparameter search, early stopping
- `references/pytorch-fundamentals.md` — loop anatomy, DataLoaders, sanity checks, mixed precision, checkpoints, determinism
- `references/evaluation-and-error-analysis.md` — metric depth, calibration, thresholds, slices, bootstrap uncertainty, error reading
- `references/tracking-and-production.md` — experiment tracking, reproducibility, registries, serving, drift, retraining loops

## Boundaries

- **Applications on hosted LLMs** — prompting, tool use, agent harnesses,
  LLM evals, foundation-model fine-tuning decisions → `llm-development`.
  This skill owns models you train and evaluate yourself.
- **Retrieval pipelines** — chunking, embeddings-for-retrieval, vector
  stores, retrieval evals → `rag-development`.
- **Data pipelines at platform scale** — orchestration, warehouse
  modelling, Spark, data contracts feeding training sets →
  `data-engineering-development`; **Fabric specifics** → `fabric-development`.
- **Python idioms, project setup, pytest discipline** →
  `python-development`; **feature-extraction SQL and query tuning** →
  `sql-development`.
- **Azure ML platform plumbing** — workspaces, endpoints, registries on
  Azure → `azure-development`; this skill owns the practice those
  services host.
- **Service-level telemetry** of a model service (latency, errors, SLOs)
  → `observability-development`; this skill owns model-quality and drift
  monitoring.
- **Training-data privacy (GDPR) and EU AI Act obligations** →
  `secure-development`.
- **Debugging a training bug that is a code bug** → `systematic-debugging`;
  this skill owns the ML-specific diagnostics (leakage hunts, loss-curve
  reading, overfit-one-batch).
