# OpenTelemetry instrumentation

OTel splits into an **API** (the facade code depends on), an **SDK** (the
wiring the application configures) and **OTLP** (the wire protocol). Getting
the split right is most of the architecture.

## API vs SDK

- **Libraries depend on the API only.** The API is no-op without an SDK, so
  an instrumented library costs nothing to consumers who don't enable
  telemetry. Never bundle the SDK or an exporter in a published library.
- **Exactly one place configures the SDK** — the application entry point
  (or a zero-code agent). Exporters, sampling, resource identity and
  processors live there, driven by environment variables, not scattered
  through code.

## Resource identity

Resource attributes describe *what is emitting* — set them or every backend
view degrades into `unknown_service`:

- `service.name` — **mandatory**, stable, human-chosen (not the pod name).
- `service.version` — the build/release identifier.
- `deployment.environment.name` — `production`, `staging`, ...
- Platform detectors add host/container/cloud attributes automatically —
  enable them rather than hand-setting.

## Zero-code vs manual

Start with zero-code/auto-instrumentation for frameworks, add manual
instrumentation for domain operations (per-language mechanics route to the
language skills):

| Runtime | Zero-code route (July 2026 — re-verify) |
|---|---|
| Java/JVM | `opentelemetry-javaagent` (attach, no code change) |
| .NET | Built-in `AddOpenTelemetry()` wiring or the automatic-instrumentation agent |
| Python | `opentelemetry-instrument` wrapper + instrumentor packages |
| Node.js | `@opentelemetry/auto-instrumentations-node` via `--require`/register |
| Go | Manual-first (compile-time; no mature agent) — instrument libraries explicitly |

Kubernetes estates can inject zero-code instrumentation via the OTel
Operator — wiring routes to `kubernetes-development`.

## Semantic conventions

Use registry names for attributes and metrics (`http.request.method`,
`db.system.name`, `messaging.operation.type`, `error.type`) instead of
inventing your own:

- Cross-service queries and vendor features (latency breakdowns, service
  maps, SLO templates) key off these exact names.
- Stability varies by domain: HTTP conventions are stable; some domains
  (GenAI, some messaging details) are still stabilising as of July 2026 —
  pin the semconv version (`OTEL_SEMCONV_STABILITY_OPT_IN` during
  migrations) and re-verify before relying on an unstable name.
- House attributes get a namespace prefix (`checkout.*`) so they can never
  collide with future standard names.

## OTLP configuration

Configuration is environment-first — the same build runs everywhere:

| Variable | Meaning |
|---|---|
| `OTEL_SERVICE_NAME` | Sets `service.name` |
| `OTEL_RESOURCE_ATTRIBUTES` | `key=value,key=value` resource extras |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector/backend endpoint (gRPC 4317, HTTP 4318) |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` or `http/protobuf` — mismatched protocol/port is the classic "no data" bug |
| `OTEL_EXPORTER_OTLP_HEADERS` | Auth headers for direct-to-backend export |
| `OTEL_TRACES_SAMPLER` (+`_ARG`) | e.g. `parentbased_traceidratio` |
| `OTEL_SDK_DISABLED` | Kill switch |

Export to a **local collector** (localhost/node agent) in production rather
than direct to the backend — retries, buffering and credentials then live in
one place (`collector-and-pipelines.md`).

## Instrumentation quality checklist

- Spans arrive named by route template, kind set, semconv attributes on.
- Logs carry `trace_id`; metrics use semconv names and units.
- Health-check and readiness traffic filtered out at the source.
- One SDK setup path; configuration via environment; no exporter creds in
  code.
- A new engineer can find "the slow query behind this endpoint" without
  asking anyone.
