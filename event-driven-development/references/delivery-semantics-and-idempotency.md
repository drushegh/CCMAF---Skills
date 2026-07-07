# Delivery Semantics, Idempotency, and Dead Letters

## The three semantics

| Semantics | Mechanism | Failure mode | Use when |
|---|---|---|---|
| **At-most-once** | Ack/commit *before* processing | Loss on crash mid-work | Loss is acceptable (metrics ticks, presence pings) |
| **At-least-once** | Ack/commit *after* processing | Duplicates on crash/redelivery | The default for anything that matters |
| **Exactly-once** | Only within one system's transaction boundary | Believing it extends beyond that boundary | Kafka→Kafka stream processing; a single DB transaction |

**Exactly-once delivery across arbitrary systems is a myth** — the
network can always fail between "processed" and "acknowledged" (the Two
Generals problem). The achievable target is **effectively-once
processing**: at-least-once delivery, plus consumers whose side effects
are idempotent. Design every consumer on the assumption it *will* see
duplicates: producer retries, redelivery after a crash before commit,
consumer-group rebalances and operational replays all produce them.

## Idempotency strategies (strongest fit first)

1. **Natural idempotency** — make the operation a set-based write:
   `UPSERT`/`MERGE` keyed on the entity, "set status = paid", not
   "increment balance". Free and unbeatable when the domain allows it.
2. **Inbox / dedupe table** — record the processed event `id` in the
   *same transaction* as the side effects; a duplicate hits the primary
   key and is skipped:

```sql
CREATE TABLE inbox (
    event_id     UUID PRIMARY KEY,
    consumer     TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

   Atomicity is the point: effects committed ⇔ event marked processed.
   Prune old rows past the maximum replay window.
3. **Optimistic version check** — event carries the aggregate version;
   consumer applies only if `expected_version` matches (stale/duplicate
   events fail the check harmlessly).
4. **Idempotency keys downstream** — when the side effect is a
   third-party call (payments), pass the event id as the provider's
   idempotency key so *their* dedupe protects you (same discipline as
   `api-development`'s Idempotency-Key).

Dedupe by event `id` — never by payload hash (two legitimate identical
payments hash identically).

## Retry design

- **Classify first**: transient (timeout, 5xx, lock contention) → retry;
  permanent (validation failure, business rejection) → *don't* — route to
  failure handling immediately. Retrying a permanent failure is how retry
  storms start.
- **Exponential backoff + jitter**, bounded attempts (typically 3–5
  in-line). For partition-ordered consumers, blocking retries stall the
  partition — beyond a short in-line budget, move the message to a
  **retry topic** (`orders.retry.5m`) with a delay, keeping the main
  partition flowing; accept that this trades away ordering for the
  retried key.
- Retries change duplicate maths: every retry layer multiplies delivery
  attempts — idempotency (above) is what makes retries safe at all.

## Dead letters and poison messages

A poison message fails deterministically on every attempt (bad schema,
impossible state). Without a dead-letter path it head-of-line blocks its
partition forever; with a silent one, it's invisible data loss.

- **Park after bounded retries** to a DLQ/parking topic, carrying
  diagnostics: original topic/partition/offset, error class + message,
  attempt count, first/last failure timestamps (headers, not payload
  mutation).
- **Alert on DLQ depth > 0** — a dead-lettered event is an incident-grade
  signal, not background noise.
- **Replay is a designed, tested procedure**: fix the cause (deploy the
  consumer fix, or repair the event), re-publish from the DLQ to the
  original topic, rely on consumer idempotency to make overlap safe.
  Document who may replay and how — an untested replay runbook fails
  exactly when needed.
- Never auto-requeue a poison message to the head of the same queue —
  that is an infinite loop with billing attached.

## Commit discipline (Kafka-flavoured, portable idea)

Disable auto-commit; commit offsets only after side effects are durable.
Batch consumers commit up to the last *fully processed* record. On
rebalance, expect to re-process from the last commit — which is just
at-least-once behaving as documented. If you need the effects and the
offset recorded atomically, store the offset *in the database* with the
effects and seek to it on start (turning the DB into the source of truth
for progress).
