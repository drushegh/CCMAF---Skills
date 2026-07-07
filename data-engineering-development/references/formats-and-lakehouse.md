# File Formats, Table Formats and the Lakehouse

Two layers, often conflated: the **file format** (how bytes encode
rows/columns — Parquet, Avro, ORC) and the **table format** (how many
files become one transactional table — Delta Lake, Apache Iceberg,
Apache Hudi). Most performance work is file-layout work.

## File formats

- **Parquet** — the columnar default for analytics. Files contain **row
  groups** (~128 MB target); each column chunk carries min/max
  statistics and dictionary encoding. Engines skip whole row groups
  whose statistics exclude the predicate (**predicate pushdown**) and
  read only referenced columns (**projection pushdown**) — which is why
  *sorting data by a common filter column before writing* improves both
  compression and pruning for free.
- **Avro** — row-oriented, schema-embedded, splittable: the streaming
  and wire format (Kafka + schema registry), and fine for landing raw
  events. Not a serving format — convert to Parquet-backed tables
  downstream.
- **CSV/JSON** — ingestion-edge formats only: no types, no statistics,
  no enforced schema. Land them in bronze, parse once, never serve from
  them.
- **Compression** (July 2026 — re-verify defaults): snappy remains the
  common default; zstd usually wins on ratio at similar read speed and
  is broadly supported — worth setting deliberately on large estates.

## Table formats — what they add over "a folder of Parquet"

ACID transactions on object storage, safe concurrent writers, schema
evolution without rewriting files, time travel to previous versions,
and statistics/metadata that make planning cheap. A raw Parquet folder
gives readers a torn view during writes and makes deletes/updates
rewrite-everything operations — for anything mutable or multi-writer,
use a table format.

| | Delta Lake | Apache Iceberg | Apache Hudi |
|---|---|---|---|
| Centre of gravity | Spark/Databricks ecosystem | Broadest engine neutrality (Spark, Trino, Flink, DuckDB, warehouses) | Streaming upserts/CDC |
| Layout | Transaction log (JSON + checkpoints) | Snapshot/manifest metadata tree | Timeline + file groups |
| Notable | Liquid clustering, UniForm interop | Hidden partitioning, partition evolution | Merge-on-read tuning |

Choose by engine ecosystem, not feature checklists — all three cover
the core. Interop (Delta UniForm, Apache XTable) lets one physical
table expose multiple formats; treat it as a bridge, not an
architecture (July 2026 — re-verify maturity).

## Partitioning

- Partition by what queries filter **and** jobs reprocess — for
  pipelines that is almost always a date column, because the partition
  is the unit of idempotent overwrite (`pipeline-design-and-backfill.md`).
- Low cardinality only: date yes, `customer_id` never. Rule of thumb —
  if a partition holds < ~1 GB, you have too many partitions; thousands
  of tiny partitions cost more in metadata and open-file overhead than
  they save in pruning.
- Don't sub-partition reflexively (`date/region/type`): each level
  multiplies file count. Prefer one partition dimension + **clustering/
  sorting** within it (Delta liquid clustering, Iceberg sort orders) for
  secondary predicates.
- Iceberg's hidden partitioning (declare `days(event_ts)` and queries on
  `event_ts` prune automatically) removes the classic bug of filtering
  the timestamp while partitioned on a derived date column — on other
  stacks, filter on the partition column explicitly.

## Small files and maintenance

Streams, micro-batches and over-parallel writers produce thousands of
KB-scale files; every reader then pays per-file open/plan cost. This is
routine maintenance, not incident response:

- Compact on a schedule (`OPTIMIZE`, Iceberg `rewrite_data_files`),
  targeting ~128 MB–1 GB files.
- Expire old snapshots/`VACUUM` to control storage — but never below
  the reprocessing/time-travel window the pipelines rely on (check
  downstream dependencies first; a too-aggressive retention setting
  destroys the rollback path exactly when an incident needs it).
- Clean orphan files from failed writes on the format's own tooling.

## Catalogues

The catalogue maps table names to metadata (Hive Metastore historically;
REST-based catalogues — Unity Catalog, Polaris, Glue and peers — as the
current direction; July 2026, re-verify). Whatever the platform: one
catalogue as the single source of table truth, access control at the
catalogue layer, and no engine bypassing it with direct paths — path-
based reads skip both permissions and statistics.

## Time travel

Version pinning is the reproducibility tool: debugging reads the table
*as of* the incident, audits diff versions, and rollback is a metadata
operation. Retention policy bounds all of it — set it per table as a
deliberate trade of storage vs recovery window.
