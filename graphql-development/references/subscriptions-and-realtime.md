# Subscriptions and real-time

## Do you need a subscription?

Subscriptions are the most operationally expensive part of a GraphQL
estate — long-lived stateful connections, fan-out, backplanes. Reach for
them last:

| Need | Reach for |
|---|---|
| Data freshness on user action (navigate, submit) | Plain refetch — no real-time machinery |
| Low-frequency updates, tolerant of seconds of lag | Polling with cache headers (cheap, stateless, cacheable) |
| Progressive delivery of one large response | `@defer`/`@stream` — incremental delivery, still experimental (July 2026 — re-verify spec/server status) |
| Genuine server push: chat, live scores, collaborative cursors, monitoring feeds | Subscriptions |

## Transport

The maintained protocol is **graphql-transport-ws**, implemented by the
`graphql-ws` library; the older `subscriptions-transport-ws` is
unmaintained legacy — do not start new work on it, and treat its
presence as a migration flag (July 2026 — re-verify). Server-sent events
(SSE) is a lighter alternative some servers support for
subscription-over-HTTP; it survives proxies that mishandle WebSockets.

## Server architecture

A subscription resolver has two parts: a **source stream** (subscribe to
an event source, e.g. a pub/sub topic) and a **per-event resolver**
(filter, authorise, map the event to the selection set).

- **In-memory pub/sub is development-only.** It works on exactly one
  process; behind a load balancer, events published on node A never
  reach subscribers on node B — silently. Production needs a shared
  backplane (Redis pub/sub, a broker, or your event backbone).
- Publish **domain events**, not pre-shaped payloads: let the per-event
  resolver shape data per subscriber (each may select different fields
  and have different permissions).
- **Filter server-side, per subscriber** — a tenant-scoped subscription
  must filter on the subscriber's tenant, not trust an argument.
- Designing the event backbone itself (delivery semantics, ordering,
  replay) → `event-driven-development`.

## Delivery semantics: push is a hint, not a ledger

A subscription is **at-most-once**: a dropped connection, a restarted
pod or a slow consumer loses events, and the protocol does not replay.
Design accordingly:

- On (re)connect, clients **re-query for a snapshot**, then apply
  subsequent events — never reconstruct state from the event stream
  alone.
- If missing an event is unacceptable, the subscription is the wrong
  tool: use a durable log/queue consumer (`event-driven-development`)
  or include a sequence number so clients can detect gaps and refetch.

## Authentication and authorisation

- Authenticate at **connection init** (the `connection_init` payload in
  graphql-transport-ws) — browsers cannot set WebSocket headers, so the
  token rides in that payload. Reject unauthenticated sockets early.
- Long-lived sockets outlive short-lived tokens: decide the policy —
  re-validate per event (safest), or close the socket at token expiry
  and let the client reconnect with a fresh token.
- Authorise **per event**, not only at subscribe time: entitlements can
  change mid-stream (user removed from a channel must stop receiving).

## Scaling and operations

- Every subscriber holds server memory and a socket; cap subscriptions
  per connection and per user.
- Fan-out cost = events × subscribers × resolver work; measure it, and
  push heavy shaping into the event producer if it's identical for all.
- Load-balance WebSockets with care (idle timeouts on proxies kill quiet
  sockets — keep-alive pings are part of the protocol; configure both
  sides).
- Emit metrics for active subscriptions, events published vs delivered,
  and reconnect rates → `observability-development`.

## `@defer` / `@stream`

Incremental delivery lets one query return the fast fields immediately
and stream the slow ones — often removing the need for a subscription or
client-side request splitting. It remains in the spec-proposal stage
with experimental server support (July 2026 — re-verify before relying
on it in a public contract).
