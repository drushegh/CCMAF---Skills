# Data Quality and Data Contracts

Bad data is worse than no data: a missing dashboard gets fixed, a wrong
one gets acted on. Quality is engineered at boundaries, not audited
after complaints.

## The quality dimensions (test all six, not just nulls)

| Dimension | Question | Typical check |
|---|---|---|
| Freshness | Did new data arrive on time? | max(loaded_at) vs SLO |
| Volume | Did roughly the expected amount arrive? | Row count vs trailing window |
| Schema | Same columns, types, semantics? | Contract/schema assertion |
| Uniqueness | Is the declared grain actually unique? | Count vs distinct on key |
| Integrity | Do references resolve? | FK/relationship tests, orphan counts |
| Distribution | Do values still look like the business? | Null %, accepted values, range/ratio checks |

Freshness and volume are the highest-value, lowest-effort checks — they
catch the "upstream silently died" class that produces confidently
stale dashboards.

## Where to test

- **Boundary in (source → bronze/staging):** freshness, volume, schema.
  Catch upstream breakage before spending compute on it.
- **Post-transform (silver):** uniqueness on grain, integrity,
  accepted values — proves *your* logic.
- **Pre-publication (gold):** reconciliation against source control
  totals (order counts, revenue sums) and cross-mart consistency. The
  last gate before humans see it.

Severity is part of the check's definition: **blocking** (stop the
pipeline — grain violations, schema breaks, reconciliation failures on
published tables) vs **warning** (record and alert — distribution
drift, volume anomalies within tolerance). A pipeline where everything
warns protects nothing; where everything blocks, on-call learns to
bypass it.

## Quarantine, not silent drops

Failing rows get diverted with a reason, never discarded invisibly:

```sql
INSERT INTO quarantine_orders
SELECT s.*, 'missing_customer_id' AS reject_reason, CURRENT_TIMESTAMP AS rejected_at
FROM stg_orders AS s
WHERE s.customer_id IS NULL;

INSERT INTO silver_orders
SELECT s.order_id, s.customer_id, s.amount, s.order_date
FROM stg_orders AS s
WHERE s.customer_id IS NOT NULL;
```

Monitor the quarantine rate (a rising reject count is an upstream
incident), triage it on a cadence, and decide per-pipeline whether
quarantined rows are repaired-and-replayed or expire.

## Data contracts

A contract is the producer's published promise, versioned and enforced
in CI — not a wiki page:

- **Schema**: columns, types, nullability.
- **Semantics**: grain, units, timezone, enum meanings — the part
  schema tools skip and the part that causes the expensive arguments.
- **SLOs**: freshness and availability the consumer can build against.
- **Ownership + change policy**: who to call; breaking changes ship as
  a new major version with a deprecation window, additive changes flow.

Enforcement points: producer CI fails on unapproved schema change
(dbt model contracts, schema-registry compatibility checks, typed
interfaces); consumer runs boundary-in checks anyway — trust, but
verify, because contracts drift exactly when nobody is looking.

Tooling (July 2026 — re-verify): dbt tests + model contracts cover most
warehouse cases; Great Expectations and Soda are the de-facto
standalone expectation frameworks; schema registries own the streaming
side (→ `event-driven-development`). Prefer checks-as-code in the
pipeline's repo over a separate quality silo nobody re-runs.

## Anomaly detection — with restraint

Static thresholds first: they are debuggable, explainable and don't
degrade trust. ML-based anomaly detection on volumes/distributions
earns its place only after static checks exist, and always as
*warning* severity — an unexplainable blocking alert trains people to
ignore alerts.

## When bad data ships anyway

1. **Stop propagation** — pause downstream schedules before fixing
   anything; a wrong number spreading beats a late one.
2. **Blast radius via lineage** — which tables, dashboards, exports,
   models consumed it, since when.
3. **Fix forward**: repair at the earliest wrong layer, then reprocess
   downstream through the normal backfill playbook
   (`pipeline-design-and-backfill.md`) — never hand-patch a gold table.
4. **Tell consumers** what was wrong, for which period, and when it was
   restated.
5. **Close the loop**: add the check that would have caught it. Every
   data incident without a new check is scheduled to repeat.
