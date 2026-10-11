---
name: data-engineering-development
description: >-
  Vendor-neutral data pipeline and analytics engineering: batch vs streaming
  pipeline design, ELT/ETL, dbt-style transformation with tests and docs,
  orchestration concepts (Airflow, Dagster, Prefect), Spark and distributed
  processing, warehouse and lakehouse modelling (dimensional/star schema,
  slowly changing dimensions, medallion layering), data quality and data
  contracts, file and table formats (Parquet, Delta Lake, Apache Iceberg),
  partitioning, and idempotent, backfillable job design. Use whenever a data
  pipeline is created, edited, reviewed or debugged — even if the user says
  "the ETL", "the warehouse", "the DAG" or "the nightly job". Triggers
  include: dbt projects, Airflow/Dagster/Prefect DAGs, PySpark or Spark SQL
  jobs, fact/dimension or SCD design, backfill and reprocessing requests,
  duplicate rows after retries, Parquet/Delta/Iceberg choices, partitioning
  strategy, data quality checks, and "the pipeline is slow/late/wrong".
  PROACTIVELY activate before designing any scheduled data job.
---

# Data Engineering Development

Vendor-neutral standards for building data pipelines and analytics
platforms — the discipline `fabric-development` applies inside Microsoft
Fabric, owned here for every stack (dbt, Spark, Airflow/Dagster/Prefect,
any warehouse or lakehouse). The defining property of the domain:
**pipelines re-run**. Retries, backfills, replays and late data are the
normal case, not the exception — so idempotency and reprocessability are
design inputs, never incident responses.

Version context (July 2026 — fast-moving, re-verify): Spark 4.x is
current (4.0 GA mid-2025), Airflow 3.x (3.0 GA April 2025), dbt Core
1.10-era with the Rust-based Fusion engine rolling out, Delta Lake 4.x,
Iceberg format v2 as the interop baseline (v3 in progress). Confirm the
target platform's actual versions before using version-gated features.

## Non-negotiables

1. **Idempotent by construction.** Re-running a job for the same logical
   interval must produce the same result: overwrite-by-partition,
   merge-by-key, or dedupe on a natural key — never a blind append. If a
   retry can double rows, the job is defective before it ever fails.
2. **Logical time from the orchestrator, never the wall clock.** No
   `CURRENT_DATE`/`now()` inside transformation logic. Every run is
   parameterised by its data interval, so today's backfill of last March
   produces exactly what last March's run produced.
3. **Land raw, immutable, first (ELT default).** Keep untransformed
   source data and transform downstream. Raw is the reprocessing
   insurance: everything is rebuildable from it, nothing from a lost
   transform.
4. **Declare the grain before writing a model.** Every table states what
   one row means; fact-table grain is documented and tested (uniqueness
   on the grain columns).
5. **Test transformations like code.** Minimum per model: key
   uniqueness, not-null on the grain, referential integrity to
   dimensions, accepted values on enums — plus source freshness checks.
6. **Contracts at every boundary you don't own.** Schema, semantics and
   freshness SLO declared for what you consume and publish; breaking
   changes are versioned and negotiated, not pushed.
7. **Every incremental model has a tested full-refresh path.**
   Incremental state corrupts eventually; the rebuild is the recovery
   plan, so prove it works before you need it.
8. **Partition and size files deliberately.** Partition by what queries
   filter and jobs reprocess; target roughly 100 MB–1 GB per file;
   compact small files as routine maintenance, not archaeology.

## Decision tables

| Need | Use |
|---|---|
| Freshness measured in hours | Batch — simplest, cheapest, easiest to backfill |
| Freshness in minutes | Micro-batch (frequent incremental runs) before real streaming |
| Sub-minute, event-at-a-time | Streaming — the bus and delivery semantics live in `event-driven-development` |
| Analytics/BI serving layer | Dimensional star schema; one-big-table only as deliberate last-mile denormalisation |
| Dimension history | SCD type 2 only where the business asks "as of when"; type 1 (overwrite) otherwise |
| Table format on object storage | Delta Lake or Apache Iceberg (pick by engine ecosystem); plain Parquet only for immutable raw |
| Transform engine, data fits one node | Warehouse SQL, or DuckDB/Polars — not a Spark cluster |
| Genuinely distributed transform | Spark (or the platform's managed Spark) |
| Scheduling model | Data-aware/asset-based scheduling over cron chains where the orchestrator supports it |

| Symptom | First check |
|---|---|
| Duplicate rows after an incident | Non-idempotent append + retry — check write mode and merge keys |
| Backfill disagrees with the original run | Wall-clock time in logic, late-arriving dimension, or non-deterministic source read |
| Spark job slow | Shuffle volume, skewed keys, small files — in that order, from the Spark UI, not from guessing |
| Warehouse drifts from source | No reconciliation counts at the boundary; silent schema drift from `SELECT *` |
| Pipeline green, data wrong | Tests assert structure but not semantics — add volume/distribution checks |
| SLA missed only at month-end | Volume-proportional cost on a fixed schedule — check the data volume trend before the code |

## High-frequency pitfalls

- `SELECT *` from sources — schema drift flows silently downstream;
  select columns explicitly at the staging boundary.
- Timezone-naive timestamps. Store UTC (`timestamptz`-equivalent) and
  declare it; convert at the presentation edge only.
- Incremental filters on event date ("yesterday's events") that miss
  late arrivals — filter on arrival (ingestion time / CDC cursor), or
  re-run a rolling window.
- Business logic in orchestrator DAG files — untestable and unreusable;
  the orchestrator schedules, the engine transforms.
- `DISTINCT` as dedupe for a fan-out from a wrong-grain join — fix the
  join, don't mask it.
- Retention/`VACUUM` shortened below the reprocessing window, destroying
  time travel exactly when an incident needs it.
- The heroic nightly full refresh because incremental "was flaky" — fix
  the idempotency defect instead of paying for it in compute forever.
- Testing only realistic volumes: zero-row inputs and full-duplicate
  inputs are the classic silent corrupters.

## Workflow for changes

1. State the grain, interval and downstream consumers of the affected
   tables before editing.
2. Baseline current output (row counts, sums of key measures).
3. Make the change parameterised by logical time; add or extend tests in
   the same change.
4. Run one interval, then a small historical backfill; diff both against
   the baseline.
5. Check the physical plan: partitions pruned, files right-sized,
   shuffle sane.
6. Ship with lineage/docs updated and the backfill plan stated in the
   change description.

## Reference index

- `references/warehouse-modelling.md` — grain, facts/dimensions, star schema, SCDs, medallion layering
- `references/elt-and-dbt.md` — layered ELT, materialisations, incremental models, dbt-style tests
- `references/spark-and-distributed.md` — execution model, shuffles, skew, joins, when not to use Spark
- `references/orchestration.md` — DAGs, logical intervals, Airflow/Dagster/Prefect, retries
- `references/pipeline-design-and-backfill.md` — batch vs streaming, idempotency patterns, late data, backfills
- `references/data-quality-and-contracts.md` — quality checks, data contracts, quarantine, bad-data response
- `references/formats-and-lakehouse.md` — Parquet, Avro, Delta/Iceberg/Hudi, partitioning, compaction

## Boundaries

- **Microsoft Fabric implementation** (OneLake, Fabric Spark, Direct
  Lake, capacities) → `fabric-development` — same discipline, that skill
  owns the platform specifics.
- **Relational engineering** — query tuning, indexing, transactional
  schema design, expand–contract migrations → `sql-development`.
- **Messaging and streaming architecture** — delivery semantics, Kafka,
  outbox, schema registries → `event-driven-development`; this skill
  owns the analytical pipelines that consume those streams.
- **Semantic models, DAX and reports** downstream of the published
  layer → `power-bi-development`.
- **Python idioms and testing** for pipeline code → `python-development`.
- **CI/CD wiring** for pipeline deployment → `devops-development`.
- **Retrieval indexes for LLM corpora** → `rag-development`; this skill
  owns the ingestion pipelines that feed them.
