# Metrics and cardinality

Metrics are the cheap, always-on signal — pre-aggregated numbers you can
afford to keep for every request forever. Their power and their failure mode
are the same thing: aggregation. Design the dimensions before you emit.

## Instrument types

| OTel instrument | Prometheus shape | Use for |
|---|---|---|
| **Counter** | counter | Things that only go up: requests, errors, bytes. Query as a rate |
| **UpDownCounter** | gauge | In-flight/level values you add and subtract: active requests, pool size |
| **Histogram** | histogram | Distributions you'll quote percentiles on: latency, payload size |
| **Gauge** (async/observable) | gauge | Sampled last-value readings: queue depth, temperature, config value |

Rules: anything you will quote a percentile for is a **histogram** (an
average latency metric hides every incident); rates come from counters +
`rate()`, never from a gauge you computed yourself; don't create a counter
and a log line for the same event unless you need both.

## Naming and units

- Follow **semantic conventions** where they exist:
  `http.server.request.duration`, `db.client.operation.duration`,
  `messaging.client.consumed.messages`. Backends and dashboards key off
  these names.
- OTel names use dots and carry the **unit as metadata** (`s`, `By`);
  Prometheus renders them with underscores and may append the unit
  (`_seconds`). Don't encode the unit twice.
- OTel semconv durations are **seconds** (floating point), not
  milliseconds. Mixed units across services make every comparison wrong.
- House metrics get a namespace prefix (`checkout.orders.placed`), a unit,
  and a description at creation time.

## RED, USE and the golden signals

- **RED** (Rate, Errors, Duration) — the standard trio for every
  request-driven service; one RED row per service is the backbone of the
  triage dashboard.
- **USE** (Utilisation, Saturation, Errors) — for resources: CPU, memory,
  disks, pools, queues.
- Google's four golden signals (latency, traffic, errors, saturation) are
  the union; pick one framing and apply it uniformly.

## Cardinality budgeting

Active series ≈ metric count × the **product** of each attribute's distinct
values. Worked example for one histogram:

```text
http.server.request.duration
  route (30 templates) × method (5) × status_class (5) = 750 series
+ user_id as an attribute (50,000 users)               = 37,500,000 series
```

One unbounded attribute multiplies everything. Discipline:

- Attributes must be **bounded and enumerable**: route *templates* not raw
  paths, status *class* (or code) not response bodies, region/tier/type.
- High-cardinality detail (user, order, request ID) belongs on **spans and
  logs**, which you sample and retain differently — never on metrics.
- Review new attributes like schema changes: each one multiplies cost and
  slows every query that touches the metric.
- Backends bill by active series/ingest; a cardinality explosion is a cost
  incident *and* an availability risk for the metrics platform itself.

## Histograms in practice

- Fixed ("explicit bucket") histograms need boundaries chosen around your
  decision points — put a bucket edge **at the SLO threshold** so "fraction
  under 300 ms" is exact, not interpolated.
- Exponential/native histograms (OTel exponential histogram, Prometheus
  native histograms) remove manual bucket choice and cut series count —
  prefer them where the backend supports them (July 2026: broadly
  supported; re-verify your backend).
- Percentiles cannot be averaged across instances — aggregate histogram
  buckets, then compute the quantile.

## Exemplars

Exemplars attach sampled trace IDs to histogram buckets — the click-through
from "p99 spiked on this dashboard" to an actual slow trace. Enable them in
the SDK/backend where supported; they are the strongest metric↔trace
correlation you can buy for near-zero cost.

## Pitfalls

- Timestamped-value logging pretending to be metrics — 1000× the cost.
- Deleting and recreating counters on config reload — resets break rates.
- Per-instance dashboards instead of aggregations with an instance drill-in.
- A metric nobody queries — telemetry is a product; prune it.
