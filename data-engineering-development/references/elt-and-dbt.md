# ELT and dbt-Style Transformation

dbt is the de-facto standard for transformation-in-the-warehouse; the
patterns here (layered model DAG, tests-as-config, docs from code) apply
equally to SQLMesh and hand-rolled equivalents. Version context (July
2026 — re-verify): dbt Core 1.10-era; the Rust-based dbt Fusion engine
is rolling out alongside dbt Core — check which engine the project runs
before assuming feature parity.

## The layered model DAG

```
sources → staging → intermediate → marts
```

- **Sources** declared in YAML with freshness checks — the only place
  raw tables are referenced by physical name.
- **Staging** (`stg_`): 1:1 with source entities. Rename to convention,
  cast types, no joins, no business logic. This is where `SELECT *` dies.
- **Intermediate** (`int_`): reusable joins/business steps, not exposed
  to consumers.
- **Marts** (`dim_`/`fct_`): the published star schema.

Every inter-model reference goes through `ref()`/`source()` — that is
what builds the dependency graph, correct run order and lineage. A
hard-coded table name inside a model is a lineage hole and an
environment bug (it won't retarget between dev/prod schemas).

## Materialisations

| Materialisation | Use when | Cost profile |
|---|---|---|
| view | Cheap logic, small data, always-fresh | Compute at query time |
| table | Consumed repeatedly, moderate size | Full rebuild per run |
| incremental | Large facts, append/merge pattern | Only new intervals per run |
| ephemeral | Private helper logic | Inlined as CTE |
| materialised view / dynamic table | Engine-managed freshness | Platform-specific — verify support |

Start with views, promote to table when query cost bites, promote to
incremental only when rebuild time bites — each step buys speed with
state, and state is where the bugs live.

## Incremental models

```sql
{{ config(materialized='incremental', unique_key='order_line_id',
          incremental_strategy='merge') }}

SELECT order_line_id, order_id, customer_id, amount, updated_at
FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

- Strategy choice: `merge` for upserts by key; `delete+insert` /
  `insert_overwrite` for partition-interval replacement (pairs with the
  idempotency patterns in `pipeline-design-and-backfill.md`).
- The `is_incremental()` filter must tolerate late data — a rolling
  lookback window (`updated_at > MAX(updated_at) - interval`) beats a
  strict high-water mark when sources deliver late.
- Schedule an occasional `--full-refresh` rebuild and treat a diff
  against the incremental result as a defect siren.

(Jinja-SQL has no full parser available here — dbt blocks are checked
structurally; the pure-SQL examples in this skill are parsed with
sqlglot.)

## Tests

- **Generic tests** (YAML, per column): `unique`, `not_null`,
  `accepted_values`, `relationships` — the minimum on every model's key
  and grain columns.
- **Singular tests**: any SQL that returns rows on failure — use for
  cross-table semantics ("refund amount never exceeds order amount").
- **Unit tests** (dbt 1.8+): fixed mock inputs, expected output —
  finally makes complex logic testable without live data.
- **Source freshness**: `loaded_at_field` + warn/error thresholds; the
  cheapest possible "the upstream feed died" alarm.

Severity is a dial: `error` blocks the run for published-layer
contracts; `warn` for drift you want visible but not blocking.

## Contracts, snapshots, docs

- **Model contracts** (`contract: enforced: true`) pin column names,
  types and constraints on published models — a breaking change fails
  the producer's build instead of the consumer's dashboard. Pair with
  model `versions` for negotiated breaking changes.
- **Snapshots** are dbt's SCD2 mechanism: point them at a source entity,
  choose `timestamp` (needs a reliable `updated_at`) or `check` strategy,
  and dbt maintains `dbt_valid_from`/`dbt_valid_to`. Snapshot *sources*,
  not derived models.
- **Docs**: descriptions in YAML next to the tests; `dbt docs generate`
  gives the lineage graph. An undocumented published model is
  unfinished work.

## Project hygiene

One model per file, named as its table. No business logic in staging.
Marts select from intermediate/staging, never from raw sources. Keep
environments separated by target schema/database, never by editing
model code. Run `build` (models + tests together) in CI on changed
models and their downstream graph (`state:modified+`).
