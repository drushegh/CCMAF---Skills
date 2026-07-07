# Warehouse and Lakehouse Modelling

## Grain first

Every modelling decision follows from the grain — what one row means.
Declare it in the model's documentation ("one row per order line per
day"), test it (uniqueness on the grain columns), and refuse to join
tables of different grains without an explicit aggregation step. Most
"the numbers doubled" incidents are grain violations: a join fanned out
and an aggregate downstream counted the duplicates.

## Facts and dimensions

- **Fact tables** hold measurements at a declared grain: transaction
  facts (one row per event), periodic snapshots (one row per entity per
  period), accumulating snapshots (one row per process instance, updated
  as milestones complete). Facts are narrow, long and append-heavy.
- **Dimension tables** hold the descriptive context (who/what/where),
  are wide and comparatively small, and carry the attributes users
  filter and group by.
- **Conformed dimensions** — one shared `dim_customer`, `dim_date` —
  are what make measures comparable across marts. Duplicate,
  slightly-different dimensions per team are the root of "why do our
  dashboards disagree".

## Star schema rules

- Facts reference dimensions by **surrogate key** (warehouse-generated
  integer or deterministic hash), never by raw natural key: natural keys
  get reused, recycled and re-formatted by source systems, and SCD2
  needs a key per *version*, which the natural key cannot provide.
- Keep the star flat: snowflaking (normalising dimensions into
  sub-dimensions) saves negligible storage and costs a join per level.
  Denormalise the hierarchy into the dimension.
- Model many-to-many relationships through bridge tables with an
  explicit weighting decision, and document it — every bridge is a
  double-counting hazard.
- Handle unknown/late dimension members with a reserved row (key `-1`
  "unknown") rather than NULL foreign keys — joins stay inner, counts
  stay honest.

## Slowly changing dimensions

| Type | Behaviour | Use when |
|---|---|---|
| 0 | Never changes | Immutable attributes (date of birth, original channel) |
| 1 | Overwrite in place | History has no analytical value (typo fixes, display name) |
| 2 | New row per version, validity interval + current flag | The business asks "as of when" (customer segment at time of order) |
| 3 | Previous-value column | Exactly one prior value matters (rare; before/after a one-off migration) |

SCD2 shape — validity columns, current flag, surrogate key per version:

```sql
CREATE TABLE dim_customer (
    customer_sk     BIGINT NOT NULL,
    customer_id     VARCHAR(64) NOT NULL,
    segment         VARCHAR(32) NOT NULL,
    region          VARCHAR(32) NOT NULL,
    valid_from      TIMESTAMP NOT NULL,
    valid_to        TIMESTAMP,
    is_current      BOOLEAN NOT NULL
);
```

Facts join to the version valid at the event time (`event_ts >=
valid_from AND (event_ts < valid_to OR valid_to IS NULL)`), or capture
the surrogate key at load time. Default to type 1 unless someone can
name the report that needs type 2 — every type-2 dimension makes all
downstream joins interval joins.

## Medallion layering (vendor-neutral)

Bronze/silver/gold is layered ELT, not a Microsoft invention:

- **Bronze** — raw, append-only, source-shaped, plus ingestion metadata
  (loaded_at, source file/offset, batch ID). Never edited.
- **Silver** — cleaned, deduplicated, conformed types/keys, still close
  to source entities. Quality gates live at the bronze→silver boundary.
- **Gold** — dimensional models and business aggregates; the only layer
  BI and consumers touch.

Rules that hold on any platform: never skip silver; layers are
physically materialised (no view chains masquerading as layers);
consumers never read bronze. Fabric-specific mechanics (workspaces,
V-Order, Direct Lake) → `fabric-development`.

## One big table (OBT)

Pre-joined wide tables are a legitimate *last-mile* serving optimisation
on columnar engines — built *from* the star, per consumer, rebuildable.
As the primary model they fail on: SCD handling (every dimension change
rewrites the world), no conformed dimensions across marts, and
uncontrolled column sprawl. Star first, OBT as a published product.

## Naming

Pick one convention and enforce it in review: `dim_`/`fct_` (or
`_dim`/`_fact`) prefixes, snake_case, singular entity names, no
abbreviations that need a glossary. The warehouse is an API — its table
and column names are the contract surface analysts code against.
