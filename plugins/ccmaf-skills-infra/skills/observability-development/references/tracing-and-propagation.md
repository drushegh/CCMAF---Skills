# Tracing and context propagation

A distributed trace is the request's own story — a tree of spans across
services. Traces answer the one question logs and metrics can't: *where in
this specific request did the time or the failure go?*

## The span model

A span records one operation: name, **kind**, start/end time, attributes,
events, status, and its parent. Kinds matter — backends compute
service-to-service maps from them:

| Kind | Use |
|---|---|
| SERVER | Handling an inbound request |
| CLIENT | Calling a downstream service/DB |
| PRODUCER | Publishing a message |
| CONSUMER | Processing a received message |
| INTERNAL | A unit of work inside the process |

- **Span names are low-cardinality**: `GET /users/{id}` (route template),
  `SELECT orders`, `process-payment` — never the raw URL or a record ID.
  IDs go in attributes.
- **Status discipline**: set `ERROR` only when *this* operation failed.
  A handled fallback is not span failure; a 404 on a lookup endpoint is
  usually not an error. Record the exception detail on the trace-correlated
  log, per current OTel direction.
- **Events** are timestamped annotations inside a span (retry attempted,
  cache miss); **attributes** are dimensions (semconv names first).

## W3C Trace Context

The propagation standard is two HTTP headers:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ^ver ^trace-id (16 bytes)            ^parent span     ^flags (01 = sampled)
tracestate: vendor1=value1,vendor2=value2
```

`tracestate` carries vendor extensions; don't invent your own correlation
header when `traceparent` exists. **Baggage** is a separate propagated
key-value channel — use it sparingly: it travels to *every* downstream hop
and lands in outbound headers, so no PII, no secrets, and keep it tiny
(tenant ID, experiment flag — not a user object).

## Propagation across hops

- **HTTP/gRPC**: automatic once client and server instrumentation are on.
  Verify at the seams — a proxy or hand-rolled HTTP client that drops
  headers silently splits the trace.
- **Messaging**: manual. Inject the context into message headers at the
  producer (PRODUCER span), extract at the consumer and start a CONSUMER
  span with the extracted parent — or a **span link** when one consume
  batches many messages. Broker patterns and delivery semantics →
  `event-driven-development`.
- **Scheduled jobs / background work**: start a new trace per run; if
  triggered by an upstream request, add a link rather than parenting a
  potentially hours-later execution into the original trace.
- **Async/context loss**: trace context rides the language's ambient
  context (`AsyncLocal`, `contextvars`, `AsyncLocalStorage`). Manual thread
  pools and fire-and-forget tasks are where it silently drops — mechanics
  per runtime route to the language skills.

## Sampling

| Strategy | How | Trade-off |
|---|---|---|
| **Head** (parent-based + ratio) | Decide at the root span, children follow | Cheap, consistent traces; blind — discards errors and slow requests at the same rate as noise |
| **Tail** | Buffer complete traces at a collector gateway, then decide (keep errors, keep slow, sample the rest) | Keeps what matters; costs gateway memory and needs trace-ID-aware load balancing |

Defaults that work: parent-based head sampling at a modest ratio in the SDK
*plus* tail sampling at the gateway ("100% of errors and >2 s traces, N% of
the rest" — `collector-and-pipelines.md`). Sample generously outside
production. Never let a sampling change ship without checking the SLO
queries it feeds — metrics derived from sampled spans shift with the rate.

## Pitfalls

- Trace ends at the first queue or webhook — the propagation gap, not the
  tracer, is the bug.
- One span for the whole request with no children — no better than a log.
- A span per loop iteration over 10,000 items — spans cost like logs;
  aggregate, or use events.
- Trusting inbound `traceparent` from the public internet — accept or
  restart context deliberately at the edge.
- Cross-signal drift: the route attribute on spans differs from the metric
  label, so exemplar click-through finds nothing.
