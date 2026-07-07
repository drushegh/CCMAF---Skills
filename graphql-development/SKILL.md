---
name: graphql-development
description: >-
  GraphQL engineering in depth: schema design in SDL (nullability
  discipline, connections/cursor pagination, deprecation-driven
  evolution), resolver architecture and the N+1 problem with DataLoader
  batching, mutation and error design (errors-as-data, partial results),
  subscriptions, federation vs a single schema, security (depth and
  complexity limits, trusted/persisted documents, introspection control)
  and caching. Use whenever a task designs, reviews, extends, secures or
  debugs a GraphQL API or client. Triggers include .graphql/.gql files,
  SDL, typeDefs, "resolver", "DataLoader", "N+1", "mutation payload",
  "subscription", "subgraph/supergraph", "persisted query",
  "introspection", Apollo/Yoga/Relay/urql work, and slow or
  duplicate-query GraphQL endpoints. PROACTIVELY activate before defining
  any GraphQL type or resolver. Owns the GraphQL discipline; the
  REST-vs-GraphQL style decision stays with api-development.
---

# GraphQL Development

Engineering discipline for GraphQL APIs, end to end. A GraphQL schema is
a **typed, executable contract**: clients compose queries against it, the
runtime enforces it, and every design decision — nullability, pagination,
error shape — is visible to consumers forever. Choose GraphQL
deliberately (the REST-vs-GraphQL decision lives in `api-development`);
once chosen, this skill owns the discipline.

Standards context (July 2026 — re-verify before asserting): the current
ratified **GraphQL specification** is the October 2021 edition, with the
next edition in draft under the GraphQL Foundation. The **GraphQL over
HTTP** specification (first stable release 2025) standardises transport —
POST/GET semantics, status codes, and the
`application/graphql-response+json` media type. **graphql-js 16.x** is
the reference implementation; Apollo Server 5 is current (Apollo Server 4
reached end of life January 2026). `graphql-ws` is the maintained
subscription transport (`subscriptions-transport-ws` is legacy).
Incremental delivery (`@defer`/`@stream`) is still moving through the
spec process — treat server support as experimental.

## Non-negotiables

1. **Design the schema from client use-cases, not the database.** The
   graph models the domain as consumers need it; it is not a table
   mirror and not a thin veneer over an existing REST API. Never expose
   storage detail through type or field names.
2. **Nullability is a promise, not a default habit.** Fields are
   nullable by spec default; make a field non-null only when you can
   *always* honour it — a failing non-null field nulls its parent and
   propagates up, so one over-promised field can destroy the whole
   response (`references/schema-design.md`).
3. **Paginate every list that can grow** with cursor-based connections
   (Connection/Edge/PageInfo). No unbounded lists; enforce a maximum
   page size at the schema or validation layer.
4. **Resolvers stay thin.** Business logic, authorisation and data
   access live in a domain layer that resolvers call — a resolver is a
   mapping, not a home for logic.
5. **Batch every child-field data access with a per-request
   DataLoader.** N+1 is GraphQL's *default* failure mode, not an edge
   case; a loader shared across requests is a data-leak and staleness
   bug (`references/resolvers-and-dataloader.md`).
6. **Mutations follow the input/payload convention with
   errors-as-data.** One focused mutation per user intent, a single
   non-null `input`, and a payload type carrying expected domain
   failures as typed data — top-level GraphQL errors are for exceptional
   failures only (`references/mutations-and-errors.md`).
7. **Evolve additively; never fork the graph into versions.** Add
   fields, deprecate with `@deprecated(reason:)`, and remove only with
   field-usage telemetry showing zero traffic. Schema-diff checks gate
   CI so a breaking change cannot ship silently.
8. **Authorise in the business layer, once.** Per-resolver ad-hoc checks
   guarantee that one forgotten field leaks data. Every path to an
   object (root fields, nested fields, node/ID lookups) must hit the
   same policy.
9. **Harden production endpoints.** Depth and complexity limits, alias
   and batch caps, trusted (persisted) documents where you control the
   clients, introspection and field suggestions gated, and raw errors
   masked (`references/security-and-complexity.md`).

## Choosing the estate shape

| Situation | Reach for |
|---|---|
| One team, one product graph | A single schema, modularised by domain — no federation ceremony |
| Multiple teams own domains in one graph | Federation: subgraphs + router (`references/federation-and-composition.md`) |
| Aggregating services you don't own | Schema stitching — the gateway owns the merge |
| First-party clients only (app/web you ship) | Trusted persisted documents — an allow-list shrinks the attack surface |
| Public API, arbitrary third-party clients | Cost-based limiting + rate limiting; weigh whether REST serves better (`api-development`) |
| Real-time updates | Subscriptions only for genuine server push; otherwise refetch/poll (`references/subscriptions-and-realtime.md`) |

## High-frequency pitfalls

- **N+1 everywhere** — a list field whose child resolvers each hit the
  database; visible as duplicate queries per request. Batch with
  DataLoader; don't "fix" it by hand-rolling joins inside resolvers.
- **Non-null over-promising** — decorating everything with `!` until one
  degraded backend nulls out entire responses.
- **Generic CRUD mutations** (`updateUser(data: JSON)`) — intent is
  lost, validation and authorisation can't be targeted, the payload
  can't carry typed errors.
- **Clients string-matching error `message`** — always give machine
  clients a stable `extensions.code` or errors-as-data; messages are for
  humans and will change.
- **Leaking internals** — stack traces in errors, introspection plus
  "Did you mean" field suggestions enabled on a private production API.
- **POST-only queries** — forfeits HTTP/CDN caching; persisted documents
  over GET restore it (`references/caching-and-performance.md`).
- **In-memory pub/sub in production subscriptions** — works on one node,
  silently drops events the moment you scale out.
- **Unbounded alias/batch amplification** — one request repeating an
  expensive field 1,000 times via aliases or batched operations.

## Workflow

1. **Confirm the style.** GraphQL earns its complexity when diverse
   clients shape their own payloads or aggregate many back ends —
   `api-development` owns this call.
2. **Design the schema from client operations.** Draft the queries and
   mutations consumers actually need, then the SDL behind them. Review
   nullability, naming, pagination and input/payload shapes
   (`references/schema-design.md`).
3. **Validate mechanically.** Parse the SDL (graphql-js or equivalent),
   lint it, and validate example operations against it — in CI, not
   just locally.
4. **Implement thin resolvers** over a domain layer, wiring per-request
   context with identity and DataLoaders.
5. **Harden** before exposure: limits, trusted documents, introspection
   policy, error masking (`references/security-and-complexity.md`).
6. **Wire caching deliberately** at each layer — client normalised
   cache, GET + CDN for persisted queries, per-request batching
   (`references/caching-and-performance.md`).
7. **Gate evolution in CI** with schema diff/compatibility checks and
   operation validation against the live schema.
8. **Observe per-resolver** — tracing and duplicate-query detection
   route to `observability-development`.

## Reference index

Load on demand:

- `references/schema-design.md` — SDL conventions, nullability rules,
  interfaces/unions/enums, custom scalars, connections and cursor
  pagination, input design, additive evolution and deprecation
- `references/resolvers-and-dataloader.md` — execution model, thin
  resolvers, context design, the N+1 mechanics, DataLoader batching and
  per-request lifecycle, ecosystem equivalents
- `references/mutations-and-errors.md` — input/payload convention,
  errors-as-data vs top-level errors, result unions, partial results,
  idempotency, error masking
- `references/subscriptions-and-realtime.md` — when to subscribe,
  graphql-ws transport, pub/sub backplanes, delivery semantics, auth on
  long-lived connections, `@defer`/`@stream`
- `references/federation-and-composition.md` — single schema vs
  federation vs stitching, entities and keys, composition checks,
  graph-level N+1, ownership pitfalls
- `references/security-and-complexity.md` — depth/complexity/cost
  limits, alias and batch abuse, APQ vs trusted documents,
  introspection control, authorisation placement, masking, rate limits
- `references/caching-and-performance.md` — the cache-layer stack,
  persisted queries over GET + CDN, normalised client caches, response
  caching, resolver performance beyond N+1

## Boundaries

- **API style selection, REST/OpenAPI design, webhooks** →
  `api-development` — it holds GraphQL at decision level and routes the
  depth here; this skill assumes GraphQL is chosen.
- **OAuth/OIDC flows, token lifetimes, session engineering** →
  `identity-development`; **threat modelling, injection, secrets
  hygiene** → `secure-development`. This skill owns GraphQL-specific
  hardening only.
- **Database query design and indexing behind resolvers** →
  `sql-development`.
- **Server/client language mechanics** → `typescript-development`,
  `python-development`, `dotnet-development`, `go-development`; **React
  data-layer integration** → `react-development`.
- **Message broker/backbone for subscription fan-out at scale** →
  `event-driven-development`.
- **Tracing, metrics and SLOs for the graph** →
  `observability-development`; **browser loading performance** →
  `web-performance-development`.
- **E2E, load and contract testing strategy** → `testing-development`.
