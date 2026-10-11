# Tracking, reproducibility and production

The gap between "a notebook that worked once" and an operated model is
this file: every result reproducible, every deployed model traceable to
its training run, and a monitoring/retraining loop designed before launch
rather than improvised after the first drift incident.

## Experiment tracking

Track from the first experiment, not after things get serious — the
untracked early runs are precisely the ones someone asks about later.

- **Log per run**: parameters (full config, not just the tuned ones), data
  version/hash, code SHA, environment (lockfile or image digest), seed,
  metrics (per fold and aggregate), and artefacts (the fitted pipeline,
  plots, slice reports).
- **Tooling** (July 2026 — re-verify): MLflow 3.x (open source,
  self-hostable) and Weights & Biases are the commodity choices; managed
  platform equivalents exist (Azure ML's tracking is MLflow-compatible —
  platform plumbing → `azure-development`). The tool matters less than the
  invariant: **no result without a run ID.**

```python
import mlflow

with mlflow.start_run(run_name="churn-gbdt-v12") as run:
    mlflow.log_params(config)                       # the whole config dict
    mlflow.set_tags({"data_version": data_hash, "git_sha": git_sha})
    mlflow.log_metrics({"pr_auc": pr_auc, "pr_auc_ci_low": ci_low})
    mlflow.sklearn.log_model(model, name="model")   # the fitted Pipeline
```

- Name and organise runs by experiment question ("does adding tenure
  features beat v11?"), not by date — a tracker you can't navigate is a
  write-only log.

## The reproducibility stack

A result is reproducible when four things are pinned together: **code**
(git SHA), **data** (immutable snapshot or content hash — mutable
"latest" tables silently invalidate every past run), **environment**
(lockfile/container digest), **config + seed** (in the tracker). Test the
claim occasionally: re-run a past experiment from its run ID; if the
number doesn't reproduce, the stack has a hole you want found now.

## Registry, packaging, promotion

- A **model registry** (MLflow-style or platform-native) holds versioned,
  stage-labelled models (candidate → staging → production), each linked to
  its training run. Deploying an artefact with no run lineage is the ML
  equivalent of deploying an unversioned binary.
- **Package the pipeline, not the estimator** — preprocessing travels with
  the model (`features-and-pipelines.md`). Formats: native
  (joblib/state_dict) inside a pinned environment, or ONNX for
  cross-runtime serving. Treat pickled artefacts as code: load only
  trusted ones, and pin the library versions they were saved under.
- **Promotion gates are the same evals as development**: sealed-set
  metrics with intervals, slice report, calibration check, latency budget
  — automated, so a retrain can't skip them.

## Serving patterns

| Pattern | When | Notes |
|---|---|---|
| **Batch scoring** | Decisions tolerate hours of latency (campaigns, risk refreshes) | Simplest; scores land in a table; start here when in doubt |
| **Online service** | Per-request decisions (fraud at checkout) | Latency budget includes feature fetch; schema-validate inputs at the boundary |
| **Streaming** | Continuous event scoring | Feature freshness is the hard part → `event-driven-development` for the transport |
| **Edge/embedded** | No connectivity, or privacy demands local | Export (ONNX-class), quantise, version explicitly |

Service telemetry (latency, errors, saturation, SLOs) is standard
observability → `observability-development`. This skill owns the layer
below: is the *model* still right?

## Monitoring: drift and quality

Ground truth usually arrives late (churn labels: 90 days), so monitoring
is layered by latency:

1. **Now — input/data drift**: compare serving feature distributions to
   training (PSI or KS-class distance per feature; alert on sustained
   shift). Missing-value rates and unseen-category rates are the
   earliest, cheapest alarms — often a broken upstream pipeline, not real
   drift (`data-engineering-development`).
2. **Now — prediction drift**: score distribution, positive rate, mean
   prediction vs training-time expectations.
3. **Later — realised performance**: join predictions to arriving labels;
   compute the true metric on a rolling window; compare to the offline
   claim. This join is worth building *before* launch.
4. Distinguish **data drift** (inputs moved; model may still be fine) from
   **concept drift** (the input→output relationship moved; retraining is
   the only fix). Rising drift metrics with stable realised performance is
   a watch item, not an incident.

## Retraining loops

- **Triggers**: scheduled (simple, predictable — right when drift is
  seasonal/slow) or drift/performance-triggered (responsive; needs the
  monitoring above to be trustworthy). Start scheduled, add triggers with
  evidence.
- Every retrain runs the **same pipeline, same eval gates, fresh sealed
  test window** — an auto-retrain that skips evaluation automates the
  shipping of regressions.
- **Roll out like code**: shadow (score silently alongside the champion),
  then canary on a traffic slice, then promote; keep the previous model
  warm for instant rollback. Champion–challenger comparisons use the
  realised-performance join, on the same windows.
- Log every served prediction with model version, feature vector (or its
  hash) and timestamp — the audit trail for incidents, the training data
  for the next model, and the substrate for the realised-performance join.
