# Resolvers and DataLoader

## The execution model

The runtime resolves a query field by field: each field has a resolver
`(parent, args, context, info)`; objects returned by a parent become the
`parent` of their child resolvers; sibling fields resolve concurrently,
parent-before-child sequentially. Fields without an explicit resolver
fall back to reading the property of the same name off `parent` — lean
on that default rather than writing pass-through resolvers.

## Thin resolvers over a domain layer

A resolver maps the graph onto your domain API — nothing more:

```js
// Thin: translate graph → domain call. Logic and authz live below.
const resolvers = {
  Query: {
    order: (_, { id }, ctx) => ctx.orders.getById(id),
  },
  Order: {
    customer: (order, _, ctx) => ctx.loaders.customer.load(order.customerId),
  },
};
```

Business rules, authorisation and persistence live in the domain layer
(`ctx.orders`), which is shared with any REST endpoints, jobs or CLIs —
the graph is one consumer of it, not its home.

## Context: per-request, always

Build a fresh `context` per request carrying (a) the authenticated
identity, (b) domain services, (c) **new DataLoader instances**. Context
is the only sanctioned side channel between resolvers — never module-level
mutable state, which is shared across concurrent requests.

## The N+1 problem

```graphql
query {
  orders(first: 50) {
    edges { node { customer { name } } }
  }
}
```

With a naive `Order.customer` resolver, this executes 1 query for the
orders and **50 queries for customers** — one per node. Nesting deeper
multiplies it. This is the default behaviour of any per-field data
access; it appears as duplicate queries in your database logs and slow
list screens.

## DataLoader: batch and cache per request

DataLoader (the `graphql/dataloader` reference library) collects every
`.load(key)` issued in one tick of the event loop and calls your batch
function once:

```js
import DataLoader from 'dataloader';

export function makeLoaders(db) {
  return {
    customer: new DataLoader(async (ids) => {
      const rows = await db.customers.findByIds(ids);
      const byId = new Map(rows.map((r) => [r.id, r]));
      // MUST return one result per key, in key order; missing -> null/Error
      return ids.map((id) => byId.get(id) ?? null);
    }),
  };
}
```

The batch-function contract is strict: **return an array the same length
and order as `keys`**, with `null` or an `Error` in the slot for any
missing key. Violating it silently mis-assigns data across objects.

Rules:

- **One loader instance per request** (construct in the context
  factory). DataLoader also memoises per key — sharing an instance
  across requests leaks one user's data into another's response and
  serves stale reads.
- Loader per *access pattern*, not per type: `customerById`,
  `ordersByCustomerId` (a one-to-many batch returns an array per key).
- After a mutation writes an entity, `loader.clear(key)` (or
  `prime(key, value)`) so later fields in the same operation don't read
  the stale cached value.
- Keys must be scalar-comparable or given a `cacheKeyFn`.

Ecosystem equivalents exist for the same pattern in other stacks —
Python (`aiodataloader`), .NET (Hot Chocolate's GreenDonut), Go
(`dataloaden`/`dataloadgen`) — the per-request lifecycle and batch
contract carry over unchanged (July 2026 — re-verify library choice).

## Beyond DataLoader

- **Lookahead/projection:** inspect `info` to select only requested
  columns or pre-join child data at the root. Powerful but couples
  resolvers to query shapes — reserve for measured hot paths.
- **Don't hand-roll joins in resolvers** as a first fix; you rebuild the
  batching problem with more code.

## Resolver errors

Throw (or return an error) for exceptional failures — the runtime
records it in `errors` and nulls the field per nullability rules.
*Expected* domain failures belong in the schema as data
(`mutations-and-errors.md`). Ensure production masks internal error
detail (`security-and-complexity.md`).
