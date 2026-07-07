# Security and complexity control

GraphQL's threat surface is peculiar: one endpoint, and **the client
composes the workload**. A REST endpoint has a fixed cost; a GraphQL
query's cost is decided by whoever writes it. Everything below follows
from that.

## Query-shape attacks and their controls

| Attack | Control |
|---|---|
| Deep nesting (`friends { friends { friends … } }`) | Depth limit — validate AST depth before executing; typical ceiling 8–15 for product graphs |
| Wide/expensive selections on list fields | Cost analysis — static estimate per query, reject over budget |
| Alias amplification (same expensive field aliased 1,000×) | Cap aliases per query (and per field); cost analysis also catches it |
| Operation-batching floods (array of operations per request) | Cap batch size, or disable batching for anonymous clients |
| Introspection-guided probing | Introspection and suggestion control (below) |

Note: circular *fragments* are already illegal — spec validation rejects
fragment-spread cycles — so depth attacks use plain nesting; don't
mistake the validator for a depth limit.

**Cost analysis** assigns each field a weight and multiplies through
list arguments (`first: 100` ⇒ children × 100), rejecting queries over a
budget *before* execution — the same number can drive cost-based rate
limiting (clients spend budget per window, not requests per window).
Prefer it over depth limits alone; shallow-but-wide queries pass depth
checks. Mature server ecosystems ship cost/complexity plugins; a
standardised cost-directive spec exists as a community draft (July
2026 — re-verify your server's option).

Always pair with **execution timeouts** and **response size caps** as
the backstop for whatever the static estimate misses.

## APQ vs trusted documents — not the same thing

- **Automatic persisted queries (APQ):** client sends a hash, server
  asks for the full text on cache miss and caches it. A *bandwidth
  optimisation only* — any client can register any query. **Not a
  security control.**
- **Trusted (persisted) documents:** operations are extracted from
  first-party client code at build time and registered server-side; at
  runtime the server accepts **only registered document IDs** and
  rejects arbitrary GraphQL. This converts your API from
  "execute anything" to a fixed set of endpoints — the single strongest
  hardening step available when you control the clients.

If your clients are first-party, run trusted documents in production and
keep free-form queries for development. Public APIs can't — rely on cost
limiting + rate limiting instead, and reconsider surface design
(`api-development`).

## Introspection and schema leakage

- Private/internal APIs: **disable introspection in production** (or
  gate it behind an authenticated, authorised role).
- Disable "did you mean" **field suggestions** in errors — they leak the
  schema even with introspection off.
- Accept that trusted documents make both moot: with an allow-list,
  schema knowledge doesn't help an attacker execute anything.
- Deliberately public APIs may keep introspection on — that's a product
  decision, not an oversight; record it.

## Authorisation placement

- Enforce in the **business layer**, per object/action, so root fields,
  nested fields and node-style `node(id:)` lookups all hit one policy.
  Per-resolver ad-hoc checks fail open on the field someone forgot.
- **Global ID lookups are the classic hole**: any entity reachable by
  `node(id:)`/`entityById` must check the caller's right to *that*
  object (IDOR), not merely authentication.
- Schema directives (`@auth`-style) are acceptable as *declarations*
  that route into the central policy; they must not be the policy.
- Distinguish 401-shaped (`UNAUTHENTICATED` error) from 403-shaped
  outcomes — and decide deliberately when "not authorised" should be
  indistinguishable from "does not exist" (return null) to avoid
  existence leaks.
- AuthN itself (tokens, sessions, OAuth/OIDC) → `identity-development`.

## Error masking

Production returns generic messages plus stable `extensions.code`, with
a correlation ID; full detail goes to server logs only
(`mutations-and-errors.md`). Unmasked resolver errors are an internals
tour: stack traces, SQL, hostnames.

## Transport hygiene

- Queries over GET must be protected like any GET: no mutations via GET
  (the GraphQL-over-HTTP spec forbids it), CSRF-safe by requiring
  non-simple content types (`application/json`) or explicit CSRF
  defences.
- Standard web/API floor still applies — TLS, rate limiting, request
  size limits, input validation in the domain layer; injection and
  secrets depth → `secure-development`. OWASP publishes a GraphQL cheat
  sheet worth running as a checklist.
