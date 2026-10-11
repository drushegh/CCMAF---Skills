# Federation and composition

## The composition decision

Federation exists to solve an *organisational* problem — multiple teams
contributing to one graph without a shared deployable — not a technical
itch. Adopting it for a single team adds a router, a composition
pipeline and cross-service query planning for zero benefit.

| Situation | Choice |
|---|---|
| One team, however large the schema | Single schema, modularised in code (schema modules per domain) |
| Several teams each owning a domain, one client-facing graph | Federation: subgraphs + a router executing query plans |
| Composing external/legacy GraphQL (or REST) APIs you don't control | Schema stitching: the gateway owns the merge and the glue resolvers |
| One team but multiple deployables sharing types | Usually still a single schema published from one service; federate only when ownership actually splits |

Standards note (July 2026 — re-verify): **Apollo Federation v2** is the
de-facto federation specification, with a router/gateway executing
composed supergraphs; the GraphQL Foundation's **Composite Schemas
specification** is standardising the pattern vendor-neutrally but is
still in development. The concepts below are spec-portable.

## The federation model

- **Subgraph** — a service owning part of the schema, published
  independently.
- **Supergraph** — the composed schema; composition is a *build step*
  that either succeeds or fails with conflicts.
- **Router/gateway** — plans a client query across subgraphs and
  executes the plan; clients see one endpoint.
- **Entity** — a type resolvable across subgraphs, declared with a key:

```graphql
# orders subgraph — owns Order, references Customer by key
type Order @key(fields: "id") {
  id: ID!
  total: Int!
  customer: Customer!
}

type Customer @key(fields: "id") {
  id: ID!
}
```

```graphql
# customers subgraph — owns Customer's fields
type Customer @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}
```

The referencing subgraph returns just the key; the owning subgraph
implements a **reference resolver** (resolve-by-key, e.g.
`__resolveReference`) that the router calls to fill in the rest.
Reference resolvers receive *batches* of keys — batch them like any
DataLoader (`resolvers-and-dataloader.md`), or you recreate N+1 at the
graph level.

Field-sharing directives (Federation v2 vocabulary): `@shareable`
(several subgraphs may resolve this field), `@external` + `@requires`
(this field's resolver needs data owned elsewhere), `@provides` (this
path can short-cut fields it happens to have). Use them sparingly —
every shared field is a coordination point between teams.

## Composition discipline

- **Composition runs in CI for every subgraph change** against the
  current supergraph — a subgraph that composes locally can still break
  the composed graph (key mismatches, type conflicts, satisfiability).
- **Schema checks before deploy**: diff the composed supergraph against
  live client operations so a "safe" subgraph change that breaks a
  cross-subgraph query is caught. A schema registry (Apollo GraphOS and
  its `rover` CLI are the reference tooling; self-hosted registries
  exist — July 2026, re-verify) is the mechanism.
- Deploy order matters: publish the subgraph schema, verify composition,
  then roll the service — never let the router hold a plan for fields a
  subgraph no longer serves.

## Pitfalls

- **Entity boundaries that ignore data ownership** — an entity's key
  fields must be stable, shared identifiers; if two teams disagree on
  what identifies a `Customer`, federation will surface it as permanent
  friction.
- **Chatty query plans** — a client query touching k subgraphs in
  sequence inherits the latency of the chain. Inspect query plans for
  hot operations; move fields (or add `@provides`) where the plan shows
  ping-pong.
- **Value-type drift** — shared enums/inputs duplicated across subgraphs
  slowly diverge; own each in one subgraph or accept `@shareable` with a
  contract test.
- **The router as an unmanaged single point of failure** — it is a
  production service: capacity, timeouts per subgraph, and circuit
  behaviour when one subgraph is down (partial data + errors, not total
  failure).
- **Stitching drift** — stitched schemas re-merge at the gateway on
  every upstream change; pin upstream schema versions and test the merge
  in CI, because you don't control when upstreams change.
