# Schema Evolution and Registries

Events outlive the code that produced them, and producers and consumers
deploy independently — so every event schema is a public contract under
change-control, whether you formalise it or not. Formalise it.

## Choosing the schema format

| Format | Strengths | Watch for |
|---|---|---|
| **Avro** | Compact binary, schema-registry-native, rich evolution rules, dynamic (schema travels via registry id) | JVM-centric tooling gravity; readers need the writer schema |
| **Protobuf** | Cross-ecosystem codegen, gRPC affinity, field numbers make wire compat explicit | Evolution rules are positional (field numbers), see below |
| **JSON Schema** | Human-readable, no codegen barrier, easiest adoption | Verbose on the wire; loosest evolution semantics; validation ≠ compatibility |

Pick per estate and stay consistent; the *discipline* (registry +
compatibility checks) matters more than the format.

## Compatibility modes — direction matters

Registry compatibility is checked between a new schema and its
predecessors. The names encode *who can upgrade first*:

| Mode | Guarantees | Deployment order |
|---|---|---|
| **BACKWARD** | New-schema consumers read old-schema data | Upgrade **consumers first** |
| **FORWARD** | Old-schema consumers read new-schema data | Upgrade **producers first** |
| **FULL** | Both | Any order |
| `*_TRANSITIVE` | Same, checked against **all** prior versions, not just the latest | Use these — non-transitive modes rot quietly |

Default for topics with many independent consumers: `FULL_TRANSITIVE` if
you can afford the constraint, `BACKWARD_TRANSITIVE` at minimum.

## Safe vs breaking changes

Safe (under backward compatibility):

- Add an **optional** field with a default (Avro: default value declared;
  Protobuf: all fields are optional, new field numbers; JSON Schema: not
  `required`).
- Remove a field that had a default; widen a numeric type where the
  format allows promotion.
- Add a new **event type** — new subjects/streams don't break old ones.

Breaking (always):

- **Rename** — every rename is a delete + add wearing a disguise.
- Change a field's type; make an optional field required; change the
  *meaning* of a field while keeping its name (semantic break — no
  registry catches it; only review does).
- Protobuf-specific: **never reuse or renumber field numbers**; `reserved`
  the numbers and names of deleted fields, forever.
- Enum handling: adding a value breaks consumers that reject unknowns —
  consumers must treat unknown enum values as "other/unknown" by
  contract, or enum growth is breaking.

## Registry workflow

- **CI is the gate**: schema-compatibility check runs against the
  registry in the pipeline, *before* deploy — not discovered by a
  serialisation exception in production.
- **Producers never auto-register in production** (`auto.register.schemas`
  off): registration is a reviewed, pipeline-owned act.
- Subject naming: per-topic (TopicNameStrategy — one schema per topic) vs
  per-record (RecordNameStrategy — several event types on one topic;
  needed for per-aggregate event streams). Decide once per estate.
- The registry serves Avro/Protobuf/JSON Schema alike; consumers resolve
  the writer schema by the id embedded in each record.

## When compatibility can't hold: versioning events

A genuinely new shape (restructure, semantic change) gets a **new
version**, not a forced migration of the old one:

- New event type/subject (`OrderPaid` → `OrderPaidV2`) or a new topic
  (`orders.v2`); explicit and registry-friendly.
- **Dual-publish window**: producers emit both versions while consumers
  migrate; retire v1 by consumer-lag evidence, announced deprecation, and
  a date — the `api-development` deprecation discipline, applied to
  topics.
- Consumer-side **upcasters** (v1→v2 transform at read time) centralise
  tolerance of old shapes — same mechanism event sourcing uses for stored
  history.

## Envelope and documentation

- **CloudEvents 1.0** (CNCF-graduated) standardises the envelope: `id`,
  `source`, `type`, `time`, `specversion`, plus `data` — giving every
  event the dedupe/tracing fields the delivery reference depends on, in
  a shape gateways and brokers increasingly understand natively. Add
  correlation/causation ids as extension attributes.
- **AsyncAPI 3.x** documents channels, operations and message schemas —
  the OpenAPI counterpart for async interfaces (July 2026 — re-verify the
  current minor version). Generate it from, or validate it against, the
  registry rather than hand-maintaining a second truth.
- Payload hygiene: domain language, no internal DB column names, no PII
  that consumers don't need (each field added is a field you must evolve,
  secure, and eventually deprecate).
