# Schema design

The schema is the product. Whether you author SDL first or generate it
from code, the SDL is the review artefact — read it as consumers will.

## Naming and shape conventions

- Types `PascalCase`; fields and arguments `camelCase`; enum values
  `SCREAMING_SNAKE_CASE`.
- Fields are nouns or questions (`orders`, `isArchived`) — behaviour
  belongs in mutations, named as verb-plus-object (`createOrder`).
- Don't mirror storage: `Order.customer: Customer`, not
  `Order.customerId: ID` plus a second round trip (expose the ID *and*
  the object where clients need both).
- Every object type that clients cache or refetch gets a stable `id: ID!`
  that is unique graph-wide (client normalised caches key on
  typename + id — `caching-and-performance.md`).

## Nullability discipline

Spec default is nullable, and that default is correct more often than
not. A non-null (`!`) field that fails at runtime **nulls its parent
object**, and the null propagates upward until it hits a nullable field —
one over-promised field can wipe out an entire response.

| Make it | When |
|---|---|
| Non-null (`!`) | Identity (`id`), invariants the type cannot exist without, enum-like flags the server always computes |
| Nullable | Anything backed by a separate service or table, expensive/fallible computed fields, fields added after launch, cross-boundary references in a federated graph |
| `[Item!]!` | The usual list shape: the list always exists (maybe empty), members are never null |

Rule of thumb: non-null is a *promise of availability*, not a statement
that the data is usually present. When in doubt, nullable — you can
tighten later (non-breaking); loosening non-null is a breaking change.

## Interfaces, unions, enums

| Construct | Use when |
|---|---|
| Interface | Types share fields *and* clients query them polymorphically (`Node`, `Actor`) |
| Union | Alternatives share no fields — result types, search results, errors-as-data payloads |
| Enum | A closed set the server owns; add values freely but treat *removing* one as breaking |

Clients must handle unknown enum values and new union/interface members
defensively — say so in the schema description of any set you expect to
grow.

## Custom scalars

Define semantics, don't overload `String`: `DateTime` (ISO 8601, UTC),
`URL`, `EmailAddress`. Point at a definition with `@specifiedBy(url:)`.
Avoid a catch-all `JSON` scalar in the public graph — it defeats typing,
validation and tooling; if an escape hatch is unavoidable, quarantine it
to admin/internal fields.

## Connections — cursor pagination

The Relay connection convention is the de-facto standard shape; use it
even without Relay clients:

```graphql
type Order {
  id: ID!
  total: Int!
}

type OrderEdge {
  cursor: String!
  node: Order!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  orders(first: Int!, after: String): OrderConnection!
}
```

- Cursors are **opaque** (encode the sort key server-side; clients never
  parse them) and only stable under a stable sort.
- Enforce a maximum `first` (e.g. 100) in validation.
- `totalCount` is optional and often expensive — include it deliberately,
  nullable.

## Input design

- One non-null `input` object per mutation (`mutations-and-errors.md`).
- Prefer specific inputs over reusing output types; inputs evolve on a
  different axis.
- For "exactly one of these" inputs, the `@oneOf` input-object directive
  is in the draft spec and shipped in recent graphql-js releases (July
  2026 — re-verify support in your server before relying on it);
  otherwise validate mutual exclusion in the domain layer and document it.

## Evolution without versions

- **Additive is safe:** new types, new fields, new optional arguments,
  new enum values (with the client caveat above).
- **Breaking:** removing/renaming anything, retyping a field, tightening
  an argument to non-null, loosening a field to nullable.
- Deprecate first — `@deprecated(reason: "Use totalV2. Removal tracked
  in TICKET-123.")` — then watch per-field usage telemetry, and remove
  only at zero traffic.
- Gate CI with a schema diff/compatibility check so breaking changes are
  a deliberate, reviewed event, never a side effect.
