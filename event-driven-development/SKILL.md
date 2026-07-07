---
name: event-driven-development
description: >-
  Vendor-neutral event-driven and asynchronous architecture: delivery
  semantics (at-least-once vs at-most-once vs the exactly-once myth),
  idempotent consumers, the transactional outbox pattern, sagas and
  compensation, event sourcing and CQRS as deliberate decisions, ordering
  and partitioning, dead-letter and poison-message handling, event schema
  evolution with registries, and Kafka as the reference broker. Use
  whenever a task involves messages or events between services — designing
  or reviewing producers, consumers, topics or queues; Kafka, RabbitMQ,
  NATS or cloud-bus integration; duplicate, lost or out-of-order messages;
  retry storms; distributed transactions across services; or eventual
  consistency. Triggers include "publish an event", "message queue",
  "consumer group", "outbox", "saga", "event sourcing", "CQRS",
  "at-least-once", "idempotent", "dead letter", "poison message", "schema
  registry", "replay", and AsyncAPI documents. PROACTIVELY activate before
  designing any cross-service asynchronous flow.
---

# Event-Driven Development

Architecture discipline for asynchronous, message-driven systems,
independent of broker. Going async signs you up for a physics: delivery is
at-least-once (or lossy), duplicates and reordering happen, and
consistency is eventual. The discipline is designing *for* those facts —
idempotency, transactional messaging, explicit compensation — not
pretending the broker abstracts them away. Kafka serves as the reference
implementation (the same precedent as k6/Playwright in
testing-development); the patterns are broker-portable.

Standards context (July 2026 — re-verify before asserting): Apache Kafka
4.x is current — 4.0 (March 2025) removed ZooKeeper entirely (KRaft-only),
so guidance mentioning ZooKeeper is outdated. CloudEvents 1.0 is the
CNCF-graduated event-envelope standard; AsyncAPI 3.x is the contract
format for documenting async interfaces (the OpenAPI counterpart).

## Non-negotiables

1. **Design for at-least-once.** Exactly-once delivery across arbitrary
   systems does not exist; what exists is *effectively-once processing* =
   at-least-once delivery + idempotent consumers. Every consumer must
   survive receiving the same event twice.
2. **No dual writes.** Never update the database and publish to the
   broker as two separate operations — a crash between them loses or
   fabricates events. State change and event publication share one
   transaction via the outbox pattern (or CDC).
3. **Events are past-tense facts** (`OrderPaid`), owned by the producer,
   with any number of consumers; **commands** (`TakePayment`) are
   imperatives addressed to one handler. Don't disguise commands as
   events — it inverts ownership and hides coupling.
4. **Ordering is per-key, not global.** Choose the partition key to match
   the unit that needs ordering (aggregate ID, not random, not constant);
   consumers must tolerate reordering *across* keys.
5. **Events are versioned contracts.** Schema them (Avro/Protobuf/JSON
   Schema), register them, and evolve under an enforced compatibility
   mode — a renamed field is a breaking change to consumers you cannot
   see.
6. **Every retry path ends somewhere.** Bounded retries with backoff →
   dead-letter with diagnostics → alert + documented replay. A poison
   message must neither block the partition forever nor vanish silently.
7. **Carry correlation.** Every event carries a stable event `id`,
   correlation/causation IDs and a timestamp — dedupe, tracing and
   debugging all depend on them.
8. **Eventual consistency is a product decision.** Surface the staleness
   window to UX and SLAs (read-your-own-writes strategies exist); don't
   let it be discovered in production.

## Choosing the event pattern

| Pattern | Use when | Cost |
|---|---|---|
| **Notification event** (thin: id + type) | Consumers need to *react*, payload coupling must stay minimal | Consumers call back for state — read load + race with newer changes |
| **Event-carried state transfer** (fat: relevant state included) | Consumers keep a local copy; producer availability decoupled | Payload becomes a wide contract; PII spreads to every consumer |
| **Delta/domain event** (what changed, in domain terms) | Default for domain integration — `OrderPaid` with payment facts | Requires real domain modelling, not table dumps |
| **Event sourcing** (events ARE the store) | Audit/temporal queries are first-class requirements | Highest — see `references/event-sourcing-and-cqrs.md`; deliberate decision only |

| Saga coordination | Use when | Risk |
|---|---|---|
| **Choreography** (services react to each other's events) | Few steps (≤3), linear flow, autonomous teams | Invisible process, accidental cycles |
| **Orchestration** (process manager issues commands) | Many steps, branching, compensation logic, need visibility/timeouts | Orchestrator drifting into a god-service |

## High-frequency pitfalls

- **Dual write** — DB commit then publish (or worse, publish then
  commit). The crash window between them is a data-integrity bug, not an
  edge case. Outbox.
- **Auto-commit before processing** — consumer acknowledges on receipt,
  crashes mid-work: silent at-most-once. Commit offsets *after* side
  effects.
- **Treating Kafka "exactly-once" as end-to-end** — EOS covers
  Kafka-in → Kafka-out stream processing, not your database writes or
  HTTP calls.
- **Random or constant partition keys** — random destroys per-entity
  ordering; constant creates one hot partition and caps throughput.
- **Database rows as events** — internal schema leaks to every consumer;
  renaming a column becomes a cross-team breaking change.
- **No DLQ** — one poison message head-of-line blocks the partition;
  **DLQ as a graveyard** — dead-lettering without alerting and a tested
  replay procedure just hides loss.
- **Schema registry with compatibility checks off** (or producers
  auto-registering in prod) — the contract exists but isn't enforced.
- **Event sourcing by default** ("we might want audit") — it is the most
  expensive pattern here and hard to retrofit *away*.
- **Saga without designed compensation** — the failure path is the
  design; discovering compensation during an incident is too late.
- **Sleep-and-hope tests** — async tests that `sleep(2)` then assert are
  flake factories; poll with timeout or use deterministic harnesses.

## Workflow for designing / reviewing an async flow

1. **Justify async.** Decoupling, load-levelling, fan-out, audit — name
   the driver. A synchronous call is simpler and consistent; don't pay
   the async tax for nothing.
2. **Model the events**: past-tense domain facts, producer-owned; pick
   thin/fat/delta deliberately (table above); separate commands from
   events.
3. **Define the contract**: schema + registry + compatibility mode,
   envelope fields (event id, correlation/causation, time), AsyncAPI
   document for consumers.
4. **Choose keys and topology**: partition key = ordering unit; estimate
   throughput and retention; decide compaction vs time-based retention.
5. **Producer side**: outbox or CDC so publication is transactional;
   idempotent producer settings.
6. **Consumer side**: idempotency strategy (natural, inbox/dedupe table,
   optimistic version), offset-commit discipline, retry policy, DLQ with
   replay runbook.
7. **Cross-service flows**: saga coordination style, compensations,
   timeouts, and who owns the process state.
8. **Verify like an adversary**: kill the consumer mid-batch and prove no
   loss and no double effects; inject duplicates and out-of-order events
   in tests; watch consumer lag and DLQ depth as first-class metrics.

## Reference index

Load on demand:

- `references/delivery-semantics-and-idempotency.md` — at-most/at-least/exactly-once, effectively-once, dedupe strategies, retries/backoff, DLQ and poison messages, replay
- `references/kafka-fundamentals.md` — topics/partitions/offsets, consumer groups and rebalancing, keys and ordering, retention/compaction, producer/consumer configs, EOS scope, lag; other brokers mapped
- `references/outbox-and-transactional-messaging.md` — the dual-write problem, outbox table + relay (polling vs CDC/Debezium), inbox pattern, idempotent producers
- `references/sagas-and-process-managers.md` — choreography vs orchestration, compensation design, pivot transactions, isolation countermeasures, timeouts
- `references/event-sourcing-and-cqrs.md` — when each earns its cost, event store mechanics, projections, snapshots, read-your-own-writes, GDPR/erasure strategies
- `references/schema-evolution-and-registries.md` — Avro/Protobuf/JSON Schema, compatibility modes, safe vs breaking changes, event versioning, CloudEvents/AsyncAPI

## Boundaries

- **Public webhooks to external consumers** (HMAC signing, delivery
  contract) → `api-development` (webhooks); this skill owns
  service-to-service messaging behind your boundary.
- **Azure Service Bus / Event Grid / Event Hubs configuration** →
  `azure-development`; the discipline (idempotency, outbox, DLQ policy)
  stays here and applies to those brokers unchanged.
- **Consumer/producer implementation mechanics** → the language skills
  (`go-development`, `dotnet-development`, `python-development`,
  `typescript-development`); this skill owns the architecture they
  implement.
- **Outbox/inbox table design, transactions, migrations** →
  `sql-development`.
- **Running brokers on Kubernetes** (operators, StatefulSets) →
  `kubernetes-development`.
- **Streaming analytics and data pipelines** (the events land in a
  warehouse/lakehouse) → `data-engineering-development`; Microsoft-flavoured
  eventhouse/Fabric → `fabric-development`.
- **Tracing async flows, lag dashboards, SLOs** →
  `observability-development`.
- **Contract testing of consumers** (Pact-style) → `testing-development`.
- **Threat modelling the bus** (who can publish, payload injection,
  secrets in events) → `secure-development`.
