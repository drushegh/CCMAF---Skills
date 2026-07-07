# Mutations and errors

## Mutation design

- **One mutation per user intent**, named verb-plus-object:
  `createOrder`, `cancelOrder`, `addOrderLine` — not a generic
  `updateOrder(data: JSON)`. Specific mutations get targeted validation,
  targeted authorisation and typed payloads.
- **A single non-null `input` argument** per mutation. One object is
  easier to evolve (add optional fields) than a growing argument list.
- **Return a payload type**, not the bare entity — the payload is where
  evolution and errors-as-data live.
- Root mutation fields execute **serially** per the spec (unlike
  queries), but do not design multi-field mutation documents expecting
  transactionality across them — each field is its own operation; a
  cross-entity transaction belongs inside *one* mutation.

## The two error channels

GraphQL responses carry `data` and `errors` side by side, and a request
can succeed partially. Use the channels deliberately:

| Channel | For | Client handling |
|---|---|---|
| **Errors-as-data** (typed fields in the payload) | *Expected* domain outcomes: validation failure, insufficient stock, name taken | Part of the schema — typed, testable, localisable |
| **Top-level `errors`** | *Exceptional* failures: unauthenticated, internal fault, malformed query | Generic handling; retry/re-auth/report |

The failure mode to design out: expected failures thrown as top-level
errors force clients to string-match `message`. Messages are prose for
humans; the moment you reword one, clients break.

## Errors-as-data: the payload pattern

```graphql
type CreateOrderPayload {
  order: Order
  userErrors: [UserError!]!
}

type UserError {
  message: String!
  field: [String!]
  code: UserErrorCode!
}

enum UserErrorCode {
  INVALID
  OUT_OF_STOCK
  DUPLICATE
}

input CreateOrderInput {
  customerId: ID!
  lines: [OrderLineInput!]!
}

input OrderLineInput {
  productId: ID!
  quantity: Int!
}

type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}
```

`userErrors` is always non-null (empty on success); the entity is
nullable (absent on failure). `code` is the machine contract; `field`
paths let forms attach errors to inputs.

**Union results** are the stricter alternative —
`union CreateOrderResult = OrderCreated | ValidationFailed` — forcing
clients to switch on `__typename` and handle every case. More ceremony;
best where failure shapes are rich and clients are disciplined.

Pick **one** convention (payload + userErrors is the most common) and
apply it to every mutation in the graph.

## Top-level errors done properly

- Always attach a stable machine code:
  `extensions: { code: "UNAUTHENTICATED" }`. Servers ship standard codes;
  keep yours documented and stable.
- **Mask internals in production**: no stack traces, no database error
  text, no file paths. Log the full error server-side with a correlation
  ID and return the ID in `extensions` so support can join the two.
- Remember null propagation: a thrown error nulls the field and bubbles
  through non-null parents (`schema-design.md`) — another reason
  expected failures belong in data.

## Partial results

A multi-root query can return some fields resolved and others errored —
`data` and `errors` together. Clients should render what arrived and
degrade the rest; don't treat any `errors` entry as a total failure.
This is a GraphQL strength — keep it by resisting blanket non-null.

## Idempotency and retries

Mutations that create resources or move money accept a client-supplied
idempotency key (an `input` field), mirroring the `Idempotency-Key`
discipline in `api-development` — a retried mutation must not double-act.
Deduplicate in the domain layer, keyed per client + operation.
