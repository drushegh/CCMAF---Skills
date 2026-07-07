# Orchestration

The orchestrator owns scheduling, dependencies, retries, alerting,
backfill mechanics and run parameterisation. It does **not** own
transformation logic — a DAG file computing business rules is untestable
and unreusable. Tasks invoke engines (warehouse SQL, dbt, Spark) and
pass parameters.

Version context (July 2026 — re-verify): Airflow 3.x (3.0 GA April
2025 — DAG versioning, event-driven scheduling, `schedule` replacing the
removed `schedule_interval`/`execution_date` idioms), Dagster 1.x,
Prefect 3.x.

## The logical interval

Every scheduled run processes a **data interval** — "the run for
2026-07-06" — distinct from when it executes. Retries and backfills
re-execute *the same interval*. Everything downstream follows:

- Tasks receive the interval as a parameter; no wall-clock reads inside
  logic (SKILL.md non-negotiable 2).
- A run for interval N must be re-runnable after N+3 has completed,
  without either corrupting the other — intervals write disjoint
  partitions or merge by key.
- Beware `depends_on_past`-style settings: they serialise recovery after
  an outage. Prefer tasks that don't need yesterday's *run* (needing
  yesterday's *data* is fine — sense it explicitly).

## Choosing an orchestrator (concepts travel; names differ)

| Concern | Airflow 3.x | Dagster | Prefect 3.x |
|---|---|---|---|
| Core abstraction | Task DAG | Software-defined assets | Flows/tasks (Python-first) |
| Data-aware scheduling | Assets/`Dataset` triggers | Native — assets are the model | Event/asset triggers |
| Backfills | Per-DAG catchup/backfill runs | First-class per-asset partitions | Programmatic re-runs |
| Strength | Ubiquity, operator ecosystem | Lineage + partition awareness | Low-ceremony dynamic Python |

Asset/data-aware scheduling ("run when the upstream table updated")
beats cron chains where available: cron encodes a *guess* about when
upstreams finish, and the guess fails at month-end. If cron is what you
have, schedule on data *sensors*, not on hope.

## Task design

- **Idempotent and restartable**: any task can be killed and re-run.
  Side effects (notifications, API posts) need dedup keys.
- **Right-sized**: a task is a unit of retry. A three-hour mega-task
  restarts from zero; 500 micro-tasks drown the scheduler. Split at
  natural checkpoint boundaries.
- **Parameterised by environment**: connections/variables from the
  orchestrator's store or a secrets manager — never hard-coded, never a
  prod path in a DAG file.
- **Alert on final failure and on SLA breach** — not on every retry.
  Retries with exponential backoff are routine weather; page on the
  outcome.

```python
from datetime import datetime
from airflow.sdk import dag, task


@dag(schedule="@daily", start_date=datetime(2026, 1, 1), catchup=False)
def orders_daily():
    @task
    def load_orders(logical_date=None):
        interval = logical_date.strftime("%Y-%m-%d")
        # invoke the engine with the interval; no business logic here
        run_ingestion(source="orders", target_partition=interval)

    load_orders()


orders_daily()
```

(Airflow 3 SDK shown; the shape — decorated tasks, interval passed in,
logic delegated — is the portable part. Parsed as Python; not executed
against a live scheduler.)

## Backfill mechanics

- Backfill = enumerate intervals × run the same parameterised job.
  Never a special "backfill script" with its own logic — that script is
  an untested second implementation.
- Bound concurrency (`max_active_runs`/partition batching): a 3-year
  backfill at full parallelism is a denial-of-service on your own
  warehouse and any rate-limited source.
- Order: oldest → newest when downstream state accumulates; verify a
  sample interval against known-good numbers before unleashing the rest.
- Catchup on by default is a trap: deploying a DAG with an old
  `start_date` and catchup enabled starts a surprise backfill. Decide
  explicitly.

Full reprocessing strategy (when to backfill vs rebuild, communication,
verification) → `pipeline-design-and-backfill.md`.
