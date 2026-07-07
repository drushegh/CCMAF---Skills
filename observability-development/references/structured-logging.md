# Structured logging

Logs are the highest-fidelity signal and the easiest to ruin. The discipline:
emit machine-parseable events with bounded fields, correlated to the trace,
at levels that mean something.

## Events, not prose

Log a **message template plus attributes**, never data interpolated into the
message string — interpolation destroys grouping, search and dedup:

```json
{
  "timestamp": "2026-07-07T09:14:02.113Z",
  "severity": "ERROR",
  "body": "Payment authorisation failed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service.name": "checkout",
  "payment.provider": "stripe",
  "payment.decline_code": "insufficient_funds",
  "order.id": "ord_8821"
}
```

The message answers "what happened"; attributes answer "to what, where,
why". Every logging stack supports this (Serilog/`ILogger` templates, Python
`extra`/structlog, pino, slog, logback+MDC) — route mechanics to the
language skills.

**The canonical log line (wide event):** emit one rich event per request at
completion — route, status, duration, caller, key domain fields — instead of
ten thin lines scattered through the handler. One queryable record per unit
of work is worth more than a narrative.

## Levels that mean something

| Level | Meaning | Production default |
|---|---|---|
| ERROR | Operation failed; someone may need to act | On — but an ERROR is not automatically a page |
| WARN | Unexpected but handled; degraded path taken | On |
| INFO | State changes an operator would care about | On — sparse |
| DEBUG | Developer diagnostics | Off; enable per-scope on demand |

Rule of thumb: if it fires on every request on the hot path, it is not INFO
— it's a metric, a span, or the canonical log line's job. Retry attempt 1 of
3 succeeding is DEBUG; exhausting retries is ERROR.

## Correlation

Every log emitted inside a request context carries `trace_id` and `span_id`.
The OTel log bridge does this automatically once the logger is bridged —
**bridge your existing framework to OTel** (appender/handler), don't run a
parallel logging stack. This one field turns "grep and hope" into "show me
every log line for this exact failed request".

Jobs and consumers without an inbound trace still get a correlation scope:
start a span for the unit of work so its logs correlate too.

## What never goes in a log

- Secrets, tokens, passwords, connection strings, session cookies.
- Payment data, government identifiers, health data.
- Full request/response payloads by default — log identifiers and
  decisions; the trace links the detail.
- Personal data you have no retention basis for — logs are personal-data
  stores under GDPR; deletion requests apply to them (depth →
  `secure-development`).

Redact at source first; the collector's redaction processor is the backstop,
not the plan (`collector-and-pipelines.md`).

## Cost and retention

Log volume is usually the largest observability bill. Controls, in order:

1. **Levels per environment** — DEBUG off in production, always.
2. **Stop logging what a metric already counts** — a counter is thousands
   of times cheaper than a log line per event.
3. **Sample repetitive success logs** (keep all errors); the canonical log
   line makes most per-step INFO logging redundant.
4. **Tiered retention** — days hot/searchable, weeks warm, archive or drop
   after; align with compliance needs, not habit.

## Pitfalls

- Multi-line stack traces emitted as separate log records — configure the
  handler to keep the exception with its event.
- `printf` debugging left in as INFO — remove or demote before merge.
- Logging inside a tight loop — aggregate outside the loop.
- Inconsistent field names across services (`userId` vs `user_id` vs `uid`)
  — adopt semconv names where they exist, one house convention where not.
