# Spark and Distributed Processing

Vendor-neutral Spark: the model and failure modes are identical on
Databricks, EMR, Dataproc, Kubernetes or Fabric (Fabric-specific
settings → `fabric-development`). Version context (July 2026 —
re-verify): Spark 4.x is current; Adaptive Query Execution (AQE) has
been on by default since 3.2, so most static-tuning folklore predates
the engine you are running.

## The execution model in five lines

- The **driver** plans; **executors** do the work on **partitions** of
  the data — parallelism is the partition count, not the cluster size.
- Transformations are **lazy**; nothing runs until an action
  (`write`, `count`, `collect`).
- **Narrow** transformations (filter, map) stay within a partition.
  **Wide** transformations (join, groupBy, distinct, repartition) need a
  **shuffle** — data redistributed across the cluster by key.
- Jobs split into **stages at shuffle boundaries**. The Spark UI's
  shuffle read/write columns are where performance investigations start.
- **Shuffle is the cost centre.** Everything in Spark tuning is really
  about moving less data across the network.

## Joins

| Situation | Join | Notes |
|---|---|---|
| One side small (≲ tens of MB) | Broadcast hash | No shuffle of the big side; AQE converts automatically when estimates allow |
| Both sides large | Sort-merge | The default; pre-partitioned/bucketed layouts avoid re-shuffling |
| Skewed key on either side | AQE skew-join handling first | Salting only if AQE isn't enough |

Force a broadcast only with evidence (`broadcast(df)` /
`/*+ BROADCAST(t) */`) — a broadcast that doesn't fit in executor
memory kills the job harder than the shuffle it avoided.

## Skew

One hot key (the NULL key, the default tenant, the megacustomer) makes
one task run for hours while the rest finish in seconds — visible in the
UI as a stage stuck at "199/200". Order of attack: filter or
special-case the hot key (NULLs usually shouldn't join at all) → let AQE
split skewed partitions → salt the key (append a random suffix on the
big side, explode the small side to match) as the last resort.

## Partitions, memory, small files

- `spark.sql.shuffle.partitions` default 200 is wrong at both extremes;
  AQE coalesces down but won't split up beyond it — raise it for
  genuinely large shuffles.
- `repartition(n)` shuffles; `coalesce(n)` only merges — use coalesce to
  reduce output file count, repartition to fix skew or parallelism.
- Most executor OOMs are one oversized partition (skew), a too-large
  broadcast, or `collect()` on the driver — not "Spark needs more
  memory".
- Aim for ~128 MB–1 GB output files: `repartition` before write, and
  compact with the table format's maintenance command (see
  `formats-and-lakehouse.md`).

## UDFs and the API ladder

Built-in functions → SQL expressions → pandas (vectorised) UDFs → row
UDFs, in that order. Python row UDFs serialise every row across the
JVM/Python boundary and blind the optimiser; most "needed a UDF" cases
are a missing built-in (`transform`, `aggregate`, regex and date
functions cover more than people expect).

```python
from pyspark.sql import functions as F

# Built-in, optimiser-visible — not a row UDF
orders = (
    spark.table("silver.orders")
    .filter(F.col("order_date") == F.lit(run_date))
    .withColumn("net", F.col("amount") - F.col("discount"))
)

daily = orders.groupBy("customer_id").agg(
    F.sum("net").alias("net_total"),
    F.countDistinct("order_id").alias("orders"),
)
```

## Caching discipline

`cache()`/`persist()` only when a DataFrame is reused across multiple
actions *in the same job*, and `unpersist()` when done. Caching a
DataFrame used once costs memory for nothing; caching before a write
does nothing at all. For reuse across jobs, write a table.

## When not to use Spark

Single-node engines (DuckDB, Polars) beat a Spark cluster on datasets
up to tens or hundreds of GB — no cluster spin-up, no shuffle, no ops.
Reach for Spark when data genuinely exceeds one machine, when the
platform's Spark is where the data lives, or when you need its
streaming/Delta integration — not by default.
