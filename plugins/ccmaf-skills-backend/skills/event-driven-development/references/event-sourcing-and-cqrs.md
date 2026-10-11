# Event Sourcing and CQRS

Two independent decisions, routinely conflated:

- **Event sourcing (ES)**: events are the system of record — current
  state is derived by replaying an aggregate's event stream. An
  *architecture commitment*, expensive to adopt and harder to leave.
- **CQRS**: separate write model from read model(s). Useful *without* ES
  (most CQRS systems are state-stored); ES effectively requires it for
  reads, since querying raw event streams doesn't scale.

Adopt them separately, on separate justifications.

## When event sourcing earns its cost

Genuine drivers: audit/traceability as a *first-class requirement*
(finance, healthcare, compliance — "what did we know and when"), temporal
queries (state as-of a date), retroactive correction by compensating
events, event-native domains (ledgers, bookings) where the events *are*
the business language.

Not drivers: "we might want audit later" (an audit log table is 5% of
the cost), "replay sounds useful", CV-driven architecture. For CRUD-shaped
domains, state-stored + outbox gives integration events at a fraction of
the complexity. ES is near-impossible to retrofit *away* — treat adoption
as a one-way door, per aggregate, not system-wide.

## Event store mechanics

- **Append-only streams per aggregate** (`order-42`): events are
  immutable facts; the stream is the aggregate's history.
- **Optimistic concurrency**: append carries the expected stream version;
  a conflict means another writer won — reload, re-decide, retry. This
  *is* the aggregate's transactional boundary.
- **Rebuild**: load events, fold over them
  (`state = apply(state, event)`) — the fold must be pure and total (every
  historical event type still applies).
- **Snapshots** are a cache, only when replay is measurably slow (streams
  in the thousands of events): persist state + version every N events,
  rebuild = snapshot + tail. Snapshots are disposable and *never* the
  source of truth; resist adding them pre-emptively.
- **Design events as behaviour, not deltas of tables**: `OrderPaid {
  amount, method }` — not `OrderUpdated { field, old, new }`. CRUD-shaped
  events are the surest sign ES was the wrong pattern for the aggregate.
- **Integration ≠ history**: the fine-grained internal events are not
  automatically your public contract — publish deliberate integration
  events (translated, versioned) rather than exposing the store
  (schema reference).

## Projections and read models

Projections consume the event stream and maintain denormalised read
models — one per query shape (a SQL table, a search index, a cache).

- **Rebuildable by definition**: a projection you cannot drop and replay
  from the stream is state, not a projection. Keep a per-projection
  checkpoint (last event position) so rebuilds and restarts resume.
- **Asynchronous by default** → reads lag writes (typically ms, sometimes
  more under backlog). That lag is the CQRS tax; monitor it as a metric.
- **Read-your-own-writes** over an async projection: return the new state
  from the command response; pin the user's session to
  read-after-version (client sends the version it wrote, query waits or
  falls back); or update a session-local cache optimistically. Choosing
  "the UI might show stale data for a second" is legitimate — choosing it
  *silently* is not (surface it as UX/product decision).

## Evolving history

Events live forever; code changes weekly.

- **Never mutate or delete stored events.** Corrections are new
  compensating events (`OrderPaymentCorrected`).
- **Upcasting**: on read, transform old event versions to the current
  shape (v1 → v2 upcasters chained); keeps the fold total without
  rewriting history. Weak-schema reading (tolerant deserialisation with
  defaults) covers additive change; a genuinely new shape gets a new
  event type/version (schema-evolution reference owns the rules).
- **GDPR / right-to-erasure vs immutability**: keep PII out of events
  where possible (reference a profile store); otherwise **crypto-shred** —
  encrypt per-subject PII fields with a per-subject key and delete the key
  on an erasure request, leaving the stream intact but unreadable.
  Decide this *before* the first PII-bearing event is written.

## Pitfalls

- ES as the default architecture rather than a per-aggregate decision.
- Querying event streams to serve reads ("we'll add projections later" —
  you won't; you'll add caching heuristics).
- Two-way coupling: consumers reading another service's event *store*
  directly instead of its published integration events.
- Fold logic with side effects — replays then re-send every email the
  system ever sent.
- Snapshot schemas treated as durable — a code change that alters state
  shape must invalidate/rebuild snapshots, or folds diverge from history.
