# Features and leakage-safe pipelines

Feature work moves metrics more than model choice on tabular problems —
and it is also where leakage enters. The structural defence is one object
that owns preprocessing *and* model, fitted only on training folds, and
shipped as a unit.

## Feature engineering discipline

- **Point-in-time correctness** is the cardinal rule: every feature value
  must be computable from information available *at the prediction
  moment*. Aggregates ("orders in last 30 days") are computed as-of the
  prediction timestamp, not as-of today. Backfilling training features
  from current state is temporal leakage in bulk.
- Prefer **few strong, explainable features** over hundreds of weak ones:
  cheaper to serve, easier to monitor for drift, easier to debug.
- Derive features from the **entity's history** (recency, frequency,
  monetary-style aggregates), **relationships** (ratios to segment
  norms), and **time** (seasonality, tenure) before reaching for
  exotica.
- Write each feature's definition down (name, window, source, as-of
  semantics). The serving side will need exactly this
  (`tracking-and-production.md`); at platform scale a feature store is
  the industrialised version of this table — a decision-level choice, not
  a default (pipelines → `data-engineering-development`).

## The pipeline as the unit of work

Everything that learns from data lives inside the pipeline, so
cross-validation refits it per fold and serving gets it for free:

```python
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = ["tenure_days", "orders_30d", "avg_basket"]
categorical = ["plan", "region", "acquisition_channel"]

preprocess = ColumnTransformer(
    transformers=[
        ("num", Pipeline([
            ("impute", SimpleImputer(strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
        ]), numeric),
        ("cat", Pipeline([
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=20)),
        ]), categorical),
    ],
    remainder="drop",
)

model = Pipeline([
    ("prep", preprocess),
    ("clf", HistGradientBoostingClassifier(random_state=42)),
])
```

`fit` on training data only; `cross_validate` handles per-fold refitting.
Anything fitted outside this object (a scaler in the notebook, a
vocabulary built on the full dataset) is a leak and a serving-skew bug in
waiting.

## Encoding and scaling choices

- **One-hot** for low-cardinality categoricals; cap explosion with
  `min_frequency`/`max_categories`, and always `handle_unknown="ignore"` —
  production *will* send unseen categories.
- **Native categorical support** in GBDT libraries (LightGBM, CatBoost,
  sklearn's `categorical_features`) usually beats one-hot for trees — use
  it and skip the dummy columns.
- **Target encoding** is powerful and dangerous: it learns from the
  target, so it must be fitted per training fold (use a CV-aware
  implementation such as sklearn's `TargetEncoder`); a naive
  whole-dataset target encoding is textbook leakage.
- **Scaling** matters for linear models, SVMs, k-NN and neural nets; trees
  don't care. Scale inside the pipeline or not at all.
- **Missing values**: impute inside the pipeline with
  `add_indicator=True` — the fact of missingness often carries signal.
  GBDT handles missing natively; deep nets need explicit handling.

## Train/serve skew

The classic production failure: a second implementation of the features in
the serving path that drifts from the training one.

- **One implementation** — serve the fitted pipeline itself, or generate
  both training and serving features from the same code path/feature
  definitions.
- **Log the serving-time feature vector** (sampled) and compare its
  distributions to training data — this is the input-drift monitor's
  substrate too (`tracking-and-production.md`).
- Schema-validate inputs at the serving boundary (types, ranges, required
  columns); reject or default explicitly, never silently coerce.
- Verify parity mechanically before launch: score a sample through the
  offline path and the serving path and diff the predictions — any gap is
  skew, found now instead of in the incident review.
