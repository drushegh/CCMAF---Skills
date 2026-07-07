# Pipeline Design, Idempotency and Backfill

## Batch vs streaming — an honest decision

Streaming costs an order of magnitude more engineering: state stores,
checkpoints, watermarks, exactly-once mythology, and every backfill
becomes a replay problem. The decision input is the **required**
freshness of the *consumer*, not the aspiration:

| Consumer needs | Build |
|---|---|
| Daily/hourly reporting | Batch. Full stop. |
| "Near real time" dashboards (minutes) | Micro-batch: the same idempotent incremental job on a 5–15 min schedule |
| Operational reaction per event (fraud, alerts) | Streaming — and the messaging discipline in `event-driven-development` |

Micro-batch keeps batch's superpowers (trivial backfill, simple
reasoning, one code path) at minutes-level latency. Most "we need
streaming" requirements dissolve under the question "what decision
changes if this is 10 minutes old?".

## Idempotency patterns (pick one per sink, deliberately)

1. **Partition overwrite** — the batch workhorse. Each run replaces
   exactly its interval's partition; re-run = rewrite, never duplicate.

```sql
DELETE FROM fct_orders WHERE order_date = '2026-07-06';

INSERT INTO fct_orders
SELECT order_line_id, order_id, customer_id, amount, order_date
FROM stg_orders
WHERE order_date = '2026-07-06';
```

   (Engines with atomic `INSERT OVERWRITE`/`replaceWhere` do this in one
   step; delete+insert needs a transaction or a swap to avoid a window
   with missing data.)

2. **Merge by key** — for mutable entities and CDC.

```sql
MERGE INTO dim_customer AS t
USING stg_customer_updates AS s
    ON t.customer_id = s.customer_id
WHEN MATCHED THEN UPDATE SET segment = s.segment, updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (customer_id, segment, updated_at)
    VALUES (s.customer_id, s.segment, s.updated_at);
```

   Merge keys must be genuinely unique in the source batch — dedupe the
   staging input first or the merge itself becomes nondeterministic.

3. **Append + dedupe on read** — append with a `run_id`/ingest
   timestamp, deduplicate downstream by natural key + latest run wins.
   Simplest writer, pushes cost to every reader; acceptable for bronze,
   smell for gold.

Blind append with no key and no interval is the only forbidden option.

## Determinism under backfill

Re-running July's job in October must produce July's answer:

- Inputs pinned to the interval (partition predicates), never "whatever
  is in the source now" — a full-table read is a moving target.
- Joins to dimensions are the classic leak: today's run joins today's
  customer segment. Where "as of then" matters, join SCD2 validity
  intervals or snapshot the dimension per interval
  (`warehouse-modelling.md`).
- Code versions matter too: record the pipeline version per run; a
  backfill with today's logic over old data is a *choice* to restate
  history — make it consciously and tell the consumers.

## Late data and watermarks

Data arrives after its interval closed — always. Choose a strategy per
pipeline and document it:

- **Rolling reprocess window**: every run re-processes the trailing N
  days (idempotent overwrite makes this free of risk). Simple, batch-
  friendly, bounded staleness.
- **Arrival-time filtering**: filter on ingestion cursor ("rows loaded
  since last run"), so late rows are picked up whenever they land, then
  route each row to its *event-time* partition.
- **Streaming watermarks**: declare allowed lateness; rows later than
  the watermark go to a late-arrivals table for periodic batch
  reconciliation rather than being silently dropped.

## Exactly-once honesty

No pipeline achieves exactly-once *delivery*; the achievable contract is
**effectively-once processing**: at-least-once delivery + idempotent
sink (patterns above) or transactional sink with offset commit. Design
every consumer assuming duplicates arrive, because they will — the
deeper semantics live in `event-driven-development`.

## The backfill playbook

1. Scope: which intervals, which tables, why — and what downstream
   consumers/caches/exports must be refreshed or warned.
2. Verify one representative interval first against known-good numbers.
3. Run in bounded slices with capped concurrency; monitor cost and
   source rate limits.
4. Reconcile: row counts and key measure sums per interval vs
   expectation; investigate any drift before continuing.
5. Announce completion + any restatement of history to consumers.

Bootstrapping a new pipeline is the same playbook: the initial load is
a backfill over all history through the *same* parameterised code path —
a bespoke one-off initial-load script is an unreviewed fork of the
pipeline.
