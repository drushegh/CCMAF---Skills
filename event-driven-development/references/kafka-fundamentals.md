# Kafka Fundamentals

Version context (July 2026 — re-verify before asserting): Apache Kafka 4.x;
4.0 (March 2025) removed ZooKeeper — clusters are KRaft-only, so any
runbook or config mentioning ZooKeeper predates it. Client defaults cited
below are for the modern Java client family; verify against your client
library's docs.

## The log model

A **topic** is a named, append-only log split into **partitions**. Each
record lands in one partition at a monotonically increasing **offset**.
Kafka is not a queue that deletes on read: records persist per the
retention policy, and consumers track their own position — which is what
makes **replay** (rewind and re-read) a first-class operation.

- **Ordering exists per partition only.** Records with the same key hash
  to the same partition; the key therefore *is* the ordering unit. Key by
  aggregate identity (`order_id`, `customer_id`) — random keys destroy
  per-entity ordering, a constant key serialises everything through one
  hot partition.
- **Partition count sets the parallelism ceiling** for a consumer group
  (one consumer per partition, max). Plan headroom: increasing partitions
  later remaps keys (breaks key→partition stability); decreasing is not
  possible.
- **Hot partitions**: one high-volume key (a celebrity customer) skews a
  partition; symptoms are per-partition lag. Fixes are domain-level —
  sub-key the aggregate or handle the whale separately.

## Consumer groups and rebalancing

A **consumer group** shares a `group.id`; Kafka assigns each partition to
exactly one member, and committed offsets are stored per group. Distinct
services must use distinct group ids — sharing one accidentally splits
the event stream between them (each event to only one service).

**Rebalances** (member joins/leaves/dies) reassign partitions. In-flight
work at rebalance is re-delivered from the last committed offset —
duplicates by design (idempotency reference). Modern clients use
incremental cooperative rebalancing; long processing must stay under
`max.poll.interval.ms` or the member is evicted, causing a rebalance loop
(the classic "consumer keeps leaving the group" incident). For slow work:
pause/resume the partition or hand off to a bounded worker pool that
completes before commit.

## Retention and compaction

| Cleanup policy | Keeps | Use for |
|---|---|---|
| `delete` (time/size) | A rolling window (e.g. 7 days) | Event streams, integration topics |
| `compact` | The latest record per key | Changelog/latest-state topics (entity snapshots) |
| `compact,delete` | Latest per key within a window | Bounded changelogs |

Compacted topics need every record keyed; a `null`-payload record (a
**tombstone**) deletes that key. Retention is also your replay and
new-consumer-bootstrap budget — size it to the recovery story, not the
disk.

## Producer and consumer configs that matter

Producer (durability path):

- `acks=all` + `enable.idempotence=true` (default in modern clients) —
  broker dedupes producer retries per session; pair with topic
  `min.insync.replicas=2` and replication factor 3 so an ack means
  durably replicated.
- `linger.ms`/`batch.size` trade latency for throughput; compression
  (`zstd`/`lz4`) is usually free win.

Consumer (correctness path):

- `enable.auto.commit=false` and commit after processing (delivery
  reference); `auto.offset.reset` decided deliberately — `earliest` for
  new consumers that must see history, `latest` for tap-ins; a wrong
  default here silently skips or floods.
- Monitor **consumer lag** (committed offset vs log end) per partition —
  it is the single health metric of an async system; alert on sustained
  growth, not absolute numbers (dashboards → `observability-development`).

## Transactions and "exactly-once"

Kafka transactions make a *consume → transform → produce* cycle atomic:
offsets and output records commit together, and `read_committed`
consumers never see aborted results (Kafka Streams:
`processing.guarantee=exactly_once_v2`). The scope is **Kafka-in to
Kafka-out only** — the moment a side effect leaves Kafka (DB write, HTTP
call, email), you are back to at-least-once + idempotency. Claiming EOS
end-to-end because Streams is configured with it is the most common
false-safety claim in review.

## Mapping to other brokers

The discipline transfers; the primitives differ:

- **RabbitMQ** — a smart-broker *queue*: per-message ack, competing
  consumers, routing via exchanges; no offset/replay (a consumed message
  is gone) — replay needs an event store or stream plugin. DLX gives
  dead-lettering natively.
- **NATS JetStream** — lightweight streams with consumer cursors;
  replay-capable; at-least-once with explicit ack.
- **Pulsar** — Kafka-like log with per-message ack and tiered storage.
- **Azure Service Bus / Event Hubs / Event Grid** — queue / log / push
  router respectively; configuration and selection →
  `azure-development`; every pattern in this skill still applies on them.
