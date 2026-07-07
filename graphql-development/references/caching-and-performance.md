# Caching and performance

GraphQL forfeits HTTP's URL-keyed caching by default (one POST endpoint,
infinite query shapes) — so caching is a **layered design decision**,
not a header you add later.

## The cache-layer stack

| Layer | Keyed by | Use for |
|---|---|---|
| Client normalised cache | `__typename` + `id` | UI consistency; instant renders from cached entities |
| HTTP/CDN | URL of a GET persisted query | Public, shared, read-heavy data |
| Server response cache | Operation + variables (+ session scope) | Expensive whole-query results with a tolerable TTL |
| Per-request DataLoader | Entity key, one request's lifetime | Deduplication within a single operation (`resolvers-and-dataloader.md`) |
| Domain/data layer | Whatever the domain owns | Cross-request entity caching, the usual invalidation rules |

Start at the bottom (DataLoader is non-negotiable), add layers upward
only as measurements demand.

## Getting HTTP/CDN caching back

- Send **queries as GET** with a **persisted document ID** (hash) —
  the URL becomes a stable cache key a CDN can hold. APQ or trusted
  documents both produce the ID (`security-and-complexity.md` for the
  crucial difference); mutations remain POST, always.
- Only cache responses that are safe to share: no per-user fields in
  publicly cached operations. Split "public shell + private query"
  rather than poisoning a shared cache with `me { … }`.
- Respect `Cache-Control` discipline from `api-development` — GraphQL
  doesn't change HTTP, it just needs the stable URL first.

## Client normalised caches

Relay, Apollo Client and urql (with graphcache) normalise responses
into an entity store keyed by `__typename` + `id`. The **schema**
enables or breaks this:

- Every cacheable type exposes a stable, graph-unique `id: ID!`
  (`schema-design.md`), and clients always select it.
- **Mutations return every entity they changed** in the payload — the
  cache updates by identity, no refetch needed. A mutation that returns
  only `success: Boolean` forces refetch storms.
- For adds/removes to lists, return enough context to update the
  connection (the new edge, the deleted ID) or document the refetch.

## Server-side response caching

- Scope is the hard part: a response is cacheable **public**, **per
  session**, or **not at all** — one per-user field makes the whole
  response per-user. Field-level cache-hint mechanisms (TTL + scope per
  field, the response inheriting the *most restrictive*) exist in major
  servers; treat exact syntax as server-specific (July 2026 —
  re-verify).
- Entity-level invalidation of cached responses is hard (a response is
  a join of many entities) — prefer short TTLs over clever
  invalidation, and cache the layers below for correctness.

## Resolver performance beyond N+1

- **Waterfalls**: parent-then-child resolution serialises I/O down the
  tree; batching flattens each level, but a 6-level query is still ≥ 6
  sequential round trips. Flatten hot paths by resolving deeper data at
  a higher level (lookahead/projection) when measured.
- **Pagination limits are a performance control**: max `first`, max
  depth and cost budgets bound the worst-case query
  (`security-and-complexity.md` — the security and performance ceilings
  are the same mechanism).
- **Measure per resolver**: tracing with per-field timings shows exactly
  which field burns the time, and duplicate-query counters expose missed
  batching. Instrumentation and SLOs → `observability-development`;
  load-testing the graph → `testing-development`.
- The database behind a slow resolver is usually the actual problem —
  indexing and query design → `sql-development`.
