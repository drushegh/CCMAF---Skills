# The OpenTelemetry Collector and pipelines

The collector is the telemetry plumbing between instrumented services and
backends: receive, process, export. Applications export OTLP to a nearby
collector; everything operational — credentials, retries, redaction,
sampling, fan-out — lives there, not in application code.

## Why a collector at all

- **Decoupling**: swap or add backends without touching services.
- **Resilience**: local buffering and retry; the app fires-and-forgets.
- **Governance**: one enforcement point for redaction, attribute policy and
  sampling.
- **Enrichment**: host/k8s metadata attached consistently.

Direct-to-backend export is for local dev only.

## Topologies

| Tier | Runs as | Owns |
|---|---|---|
| **Agent** | Daemonset / host service / sidecar | Receiving from local apps, host metadata, first-line batching |
| **Gateway** | Horizontally scaled deployment | Redaction policy, tail sampling, fan-out, backend credentials, egress |

Small estates can run gateway-only; tail sampling and per-backend routing
always belong in the gateway tier. Deployment mechanics on Kubernetes
(operator, daemonset) route to `kubernetes-development`.

## Config anatomy

Components are *defined* then *wired* — a defined processor does nothing
until a pipeline references it:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20
  attributes/redact:
    actions:
      - key: user.email
        action: delete
      - key: http.request.header.authorization
        action: delete
  batch: {}

exporters:
  otlphttp:
    endpoint: https://otel.example.internal

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [otlphttp]
```

Processor **order matters**: `memory_limiter` first (refuse before you
OOM), `batch` last before export.

## Essential processors

| Processor | Job |
|---|---|
| `memory_limiter` | Backpressure before out-of-memory — non-negotiable in every pipeline |
| `batch` | Compress/export efficiency — always on, last |
| `attributes` / `redaction` | Delete/hash sensitive attributes — the PII backstop |
| `filter` | Drop health checks, debug-namespace spans, noisy metrics |
| `transform` (OTTL) | Rename/reshape attributes, normalise legacy names to semconv |
| `resource`/detection | Attach host/cloud/k8s identity |
| `tail_sampling` | Keep-the-errors sampling on complete traces (gateway) |

## Tail sampling

Policy-based: sample on *complete* traces — keep all error traces, all
traces slower than a threshold, a percentage of the rest. Two operational
requirements:

- All spans of a trace must reach the **same** gateway instance — scale
  with the trace-ID-aware `loadbalancing` exporter in front of the
  tail-sampling tier.
- Buffered traces cost memory (`decision_wait` × throughput) — size and
  monitor the tier.

## Operating the collector

- The collector emits its own telemetry — scrape it; alert on queue
  saturation, refused spans and export failures (silent telemetry loss is
  its worst failure mode). Enable the `health_check` extension for
  liveness/readiness.
- Pin the collector version and build/choose a distribution with only the
  components you need; config is code — review it like application code
  (July 2026: collector core is stable, contrib components vary in
  maturity — re-verify the ones you adopt).
- Capacity-test before an incident does it for you: the collector is on the
  critical path of every investigation.
