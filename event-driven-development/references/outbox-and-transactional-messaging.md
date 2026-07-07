# Outbox and Transactional Messaging

## The dual-write problem

Any handler that must both change local state and announce it faces the
same trap:

```text
BEGIN; UPDATE orders ...; COMMIT;   -- then
producer.send(OrderPaid)            -- crash here → state changed, event never sent
```

Reversing the order fabricates events for state that never committed.
Two-phase commit is not the rescue — mainstream brokers don't participate
in XA transactions, and 2PC couples availability anyway. The fix is to
make the event part of the *local* transaction.

## The transactional outbox

Write the event to an `outbox` table in the **same transaction** as the
state change; a separate relay publishes it afterwards.

```sql
CREATE TABLE outbox (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aggregate_type TEXT        NOT NULL,
    aggregate_id   TEXT        NOT NULL,
    event_type     TEXT        NOT NULL,
    payload        JSONB       NOT NULL,
    headers        JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
```

Commit atomically: state row + outbox row. Now either both exist or
neither — the crash window is gone. The relay introduces its own
at-least-once step (it may crash between publish and marking published),
which is fine: consumers are idempotent (delivery reference), and
idempotent producer settings dedupe relay retries per session.

## Relay options

| Relay | How | Trade-off |
|---|---|---|
| **Polling publisher** | Poll unpublished rows, publish, mark published | Simple, no extra infra; adds poll latency and DB load; fine for most estates |
| **CDC / log tailing** (Debezium as the de-facto standard) | Tail the DB's WAL/binlog, emit outbox rows to Kafka | Low latency, no poll load; adds a connector platform to operate |

Polling relay discipline: publish in `id` order per aggregate to preserve
per-key ordering; multiple relay instances need coordination — single
leader, or `FOR UPDATE SKIP LOCKED` claims:

```sql
SELECT id, event_type, payload
FROM outbox
WHERE published_at IS NULL
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

Prune published rows on a schedule (the outbox is a buffer, not an
archive); table design and migration mechanics → `sql-development`.
Debezium's outbox event router reads exactly this table shape and routes
by `aggregate_type` — keeping payloads as *designed events* (schema
reference), not raw entity dumps, is what stops CDC leaking your schema.

## The inbox (consumer-side mirror)

The same move applied to consumption: record the event id in an `inbox`
table in the same transaction as the consumer's effects, skip on
conflict. Outbox makes *sending* atomic with state; inbox makes
*processing* atomic with state. The pair gives effectively-once between
two services over an at-least-once broker — full mechanics in
`references/delivery-semantics-and-idempotency.md`.

## Variants and when outbox is overkill

- **Listen-to-yourself**: publish first, and let *your own service*
  consume the event to update its state. Read-your-own-writes suffers
  (your state lags your own API responses); only viable when the UX
  tolerates it.
- **Event sourcing**: the event store *is* the state store, so
  outbox is unnecessary by construction — appending the event is the
  state change (see `references/event-sourcing-and-cqrs.md`).
- **No local state change**: a pure notifier (stateless fan-out from an
  incoming message) has no dual write — publish directly with idempotent
  producer settings.
- **Same-DB integration**: if both "services" share one database and
  transaction, events between them are architecture theatre — call the
  function.

## Pitfalls

- **Publishing inside the transaction** (before commit) — consumers see
  events for state that may roll back; the relay exists precisely to
  publish *after* commit.
- **Outbox rows as raw entities** — the outbox payload is a versioned
  contract; design it like any event.
- **Unbounded outbox growth** — no pruning job means the "buffer" becomes
  the biggest table in the database.
- **Two relays without claims/leadership** — duplicate publication at
  scale (survivable with idempotent consumers, but noisy and avoidable).
- **Forgetting relay ordering** — parallel relay workers publishing one
  aggregate's rows out of order silently breaks the per-key ordering the
  partition key was chosen for.
