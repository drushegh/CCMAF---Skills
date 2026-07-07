---
name: observability-development
description: >-
  Vendor-neutral observability engineering: structured logging, metrics and
  distributed tracing as one correlated discipline, OpenTelemetry
  instrumentation (API vs SDK, zero-code agents, semantic conventions, OTLP),
  the Collector pipeline (agent/gateway topologies, redaction, tail sampling),
  W3C trace-context propagation, cardinality and telemetry-cost control,
  SLIs/SLOs/error budgets with burn-rate alerting, page-vs-ticket alert
  design, dashboard craft, and debugging production from telemetry. Use
  whenever a task instruments code or shapes telemetry: "add
  logging/metrics/tracing", OpenTelemetry/OTel/OTLP, collector configs, trace
  or correlation IDs, defining or reviewing SLOs, noisy or missing alerts, or
  Prometheus/Grafana/Jaeger/Tempo/Loki-shaped work. Triggers include
  otel-collector YAML, Prometheus alert rules, Grafana dashboards,
  tracer/meter/logger APIs in any language, "why is prod slow", and incident
  reviews that found blind spots. PROACTIVELY activate when a new service
  ships without telemetry.
---

# Observability Development

Instrumenting systems so production behaviour is explainable — the
cross-cutting discipline the language and cloud skills each hold a fragment
of. This skill owns the three telemetry signals (structured logs, metrics,
traces) correlated into one story, OpenTelemetry as the instrumentation
substrate, SLOs as the reliability contract, and alerting that pages a human
only when users hurt. Per-language wiring routes to the language skills;
backend platforms route to the cloud/ops skills (boundaries below).

Context (July 2026 — re-verify): OpenTelemetry (CNCF) is the
industry-standard instrumentation layer — traces, metrics and logs are all
stable signals; OTLP is the wire protocol (gRPC 4317 / HTTP 4318); W3C Trace
Context is the propagation standard. Prometheus + Grafana remain the de-facto
open-source metrics/dashboard stack. Semantic conventions still stabilise
domain by domain — pin the semconv version you adopt.

## Non-negotiables

1. **Instrument with OpenTelemetry; export OTLP.** The backend (Grafana
   stack, Jaeger, Azure Monitor, a commercial APM) is a swappable exporter
   decision; instrumentation is code you keep. Don't couple application code
   to a vendor SDK where the OTel API covers it.
2. **Logs are structured events, not prose.** Key-value/JSON with a message
   template — never data interpolated into strings. Every log emitted in a
   request context carries `trace_id`/`span_id`.
3. **One correlation spine.** W3C `traceparent` propagates across every hop
   — HTTP, gRPC, message queues, scheduled jobs. A trace that dies at the
   first queue is half a trace.
4. **Cardinality is a budget.** No unbounded values (user IDs, raw URLs,
   GUIDs) as metric attributes; route templates, not paths. Cost and query
   speed are functions of series count.
5. **Telemetry never takes the service down.** Sampling, batching and memory
   limits are mandatory; export failure degrades to dropped telemetry, never
   to blocked requests.
6. **No secrets or PII in telemetry.** Redact at source, enforce again at
   the collector. Logs and spans are data stores under GDPR — retention is a
   decision, not a default.
7. **SLOs before dashboards and alerts.** Define SLIs from user-visible
   behaviour, set targets from history, alert on error-budget burn. Alerts
   without an SLO behind them are opinions.
8. **Page on symptoms, ticket on causes.** Every page is urgent,
   user-visible and actionable, with a linked runbook. Anything else is a
   ticket or a deletion.
9. **Semantic conventions over invented names.**
   `http.server.request.duration` exists; `myapp_http_time_ms` breaks every
   cross-service query and backend feature that relies on the standard name.

## Decision tables

| Question you're answering | Signal |
|---|---|
| Is it happening? How often? Trend over time (cheap at scale) | **Metric** |
| Where in this request did the time/failure go, across services | **Trace** |
| What exactly happened here — inputs, decisions, error detail | **Structured log** |
| Which code path burns CPU/allocations | **Profile** (continuous profiler — decision-level here) |

| Situation | Instrumentation route |
|---|---|
| Standard frameworks (HTTP, DB, queues) | **Zero-code/auto-instrumentation** first |
| Domain operations worth seeing (checkout, sync run) | **Manual spans + metrics** via the OTel API |
| A library you publish | **OTel API only** — never bundle the SDK/exporters |
| Code you can't modify | Collector/agent-side enrichment; eBPF-based tools — decision-level |

| Context | Collector topology |
|---|---|
| Local dev | Direct export to a local backend (or stdout exporter) |
| Production | **Agent** (daemonset/sidecar/host) → **gateway** tier |
| Redaction, tail sampling, fan-out to multiple backends | Gateway owns it |

## High-frequency pitfalls

- **Unbounded metric attributes** — one `user_id` tag turns 50 series into 5
  million. Trace/log attributes are where high-cardinality detail belongs.
- **Logs and traces uncorrelated** — no `trace_id` on log lines means two
  disconnected debugging tools instead of one story.
- **Context lost at the queue** — HTTP hops traced, messaging hops not;
  inject/extract explicitly (`tracing-and-propagation.md`).
- **Health checks polluting telemetry** — filter them from traces and
  request metrics; they drown real traffic.
- **Alerting on every ERROR log or a static CPU threshold** — cause-based
  noise; page on SLO burn instead.
- **100% trace sampling in production** (cost surprise) or blind head
  sampling that discards the errors (use tail sampling for "keep all
  failures").
- **Collector without `memory_limiter`** — telemetry OOMs during the exact
  incident you needed it for.
- **A dashboard per developer per week** — sprawl nobody trusts; curate a
  hierarchy instead (`alerting-and-dashboards.md`).
- **Logging the payload "just in case"** — cost, PII exposure, and noise;
  log decisions and identifiers, link detail via the trace.

## Workflow (instrument a service)

1. **Identity first**: set `service.name`, `service.version`,
   `deployment.environment.name` as resource attributes.
2. **Turn on auto-instrumentation** for the runtime and frameworks; verify
   spans and metrics arrive with semconv names.
3. **Bridge the existing logger** to OTel (appender/bridge, not a rewrite),
   emit structured JSON, confirm `trace_id` appears on request-scoped logs.
4. **Add manual instrumentation** for domain operations: spans around
   units of work, counters/histograms for business-relevant events.
5. **Route through a collector** — memory limiter, redaction, batching,
   sampling policy — and export OTLP to the backend(s).
6. **Define SLIs/SLOs** for the user journeys the service serves; wire
   multi-window burn-rate alerts; write the runbook each page links to.
7. **Verify end to end**: break the service in staging and walk
   alert → dashboard → trace → logs. If the walk needs tribal knowledge,
   the instrumentation isn't done.

## Reference index

Load on demand:

- `references/structured-logging.md` — events not prose, levels, correlation, what never to log, cost
- `references/metrics-and-cardinality.md` — instrument types, naming/units, RED/USE, cardinality budgeting, histograms, exemplars
- `references/tracing-and-propagation.md` — span model, W3C Trace Context, baggage, messaging/async propagation, head vs tail sampling
- `references/opentelemetry-instrumentation.md` — API vs SDK, resource identity, zero-code per runtime, semantic conventions, OTLP config
- `references/collector-and-pipelines.md` — topologies, config anatomy, essential processors, tail sampling, operating the collector
- `references/slos-and-error-budgets.md` — SLI selection, SLO targets, error budgets, burn-rate maths and alert windows
- `references/alerting-and-dashboards.md` — page vs ticket, alert hygiene, dashboard hierarchy, debugging production from telemetry

## Boundaries

- **Per-language OTel wiring** (packages, DI, `Program.cs`/`main`) →
  `dotnet-development` (its observability reference), `python-development`,
  `typescript-development`, `go-development`. This skill owns what to
  instrument and why; those own the language mechanics.
- **Host/server-level logging and metrics** (journald, log shipping,
  node_exporter) → `linux-administration`.
- **Cluster observability wiring** (managed Prometheus, Container Insights,
  scraping) → `kubernetes-development`.
- **Azure Monitor / App Insights platform specifics** → `azure-development`;
  **the KQL language** → `sentinel-development` (houses the general KQL
  reference).
- **The debugging method** (reproduce → isolate → hypothesise → verify) →
  `systematic-debugging` — this skill builds the telemetry that method
  consumes.
- **Delivery semantics and broker patterns** behind traced messaging →
  `event-driven-development`.
- **Load/performance testing against SLOs** → `testing-development`;
  **secrets/PII handling depth** → `secure-development`;
  **runbook and postmortem writing** → `technical-writing`.
