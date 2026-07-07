# HTTP caching and CDN strategy

The fastest request is the one never made; the second fastest is answered
14 ms away at the edge. Caching failures are silent in both directions —
stale bugs users can't shift-reload away, or a CDN serving 2% hit rates
nobody noticed.

## Cache-Control taxonomy (the directives that matter)

| Directive | Meaning |
|---|---|
| `max-age=N` | Fresh for N seconds — no revalidation until then |
| `s-maxage=N` | Same, but for shared caches (CDN) only; lets edge TTL exceed browser TTL |
| `no-cache` | Cache it, but **revalidate before every use** (misnamed, very useful) |
| `no-store` | Never cache — also disables the bfcache; reserve for genuinely sensitive responses |
| `private` / `public` | Browser-only vs shared-cache eligible — `private` on anything per-user |
| `immutable` | Never revalidate within `max-age` — for hashed URLs |
| `stale-while-revalidate=N` | Serve stale instantly while refreshing in the background |
| `must-revalidate` | No serving stale after expiry (correctness-critical data) |

## The two-bucket pattern (covers 90% of sites)

1. **Fingerprinted statics** (`app.3f2a1c.js`, hashed images/fonts):
   `Cache-Control: public, max-age=31536000, immutable`. The URL changes
   when the content does — cache invalidation solved by construction.
2. **HTML and other unhashed entry points**:
   `Cache-Control: no-cache` (or `max-age=0, must-revalidate`). Every load
   revalidates; deploys propagate immediately; conditional requests make it
   cheap (a 304 is header-sized).

Everything else (APIs, unhashed images) is a deliberate per-class decision —
the table in SKILL.md.

## Revalidation

`ETag` (hash-based) or `Last-Modified` (timestamp) let the server answer
`304 Not Modified` to `If-None-Match`/`If-Modified-Since`. Notes: strong
ETags break across multi-server deployments when they encode
inode/build-host detail — derive from content; pair `no-cache` with an
ETag or you've built "download everything every time".

`stale-while-revalidate` is the sweet spot for semi-static content
(catalogue pages, avatars, dashboards that tolerate seconds of staleness):
user-perceived latency of a cache hit, freshness one request behind.

## CDN strategy

- Put the CDN in front of **everything**, not just images — cached HTML
  (even 60 s of `s-maxage` absorbs traffic spikes) and dynamic passthrough
  still gain TLS termination near the user and warmed origin connections.
- **Split TTLs**: browser short, edge long (`s-maxage`) + purge-on-deploy —
  you can purge the edge, you cannot purge browsers.
- **Cache keys**: every `Vary` header multiplies variants. `Vary:
  Accept-Encoding` is fine; `Vary: Cookie` is a cache-miss generator —
  normalise at the edge (strip irrelevant query params, ignore non-session
  cookies for anonymous traffic) per your CDN's key configuration.
- **Purge discipline**: deploys purge HTML paths (hashed assets never need
  it); prefer soft purge (serve-stale-while-refetching) where offered.
  Tiered caching/origin shield cuts origin load for global audiences.
- Compression at the edge (Brotli), HTTP/3 termination, and image
  transformation are standard CDN wins — enable deliberately, verify with
  response headers. Provider provisioning (Front Door, CloudFront config)
  → `azure-development` / `devops-development`.

## API responses

- Per-user data: `Cache-Control: private, no-store` unless measured need —
  then `private, max-age` + `ETag` per endpoint semantics
  (design → `api-development`).
- Shared reference data (lookups, catalogues): `public, s-maxage` +
  `stale-while-revalidate` at the edge is legitimate and hugely effective.
- Never let a shared cache store an authenticated response without
  deliberate keying — cache-poisoning and cross-user leakage risks →
  `secure-development`.

## The back/forward cache (bfcache)

The browser keeps a full page snapshot for instant back/forward — the
fastest "load" that exists, and free unless you break it. The common
breakers: `Cache-Control: no-store` on the HTML, `unload` handlers (use
`pagehide`), open connections held at navigation. Listen for `pageshow` with
`event.persisted` to re-sync state on restore. Check eligibility in DevTools
(Application → Back/forward cache); RUM should distinguish bfcache restores
(they make your LCP look better than new visitors experience).

## Verifying cache behaviour

Response headers are claims; behaviour is truth. Verify with DevTools
(size column: memory/disk cache), a second cold visit, and the CDN's
hit-rate analytics per path class. A cache policy nobody has watched serve
a real 304/HIT is untested code.
