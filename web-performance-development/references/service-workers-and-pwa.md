# Service workers and PWA

A service worker is a programmable network proxy the browser keeps after the
tab closes. It buys offline support, instant repeat loads and installability
— and it is the one web technology where a shipped bug can outlive your fix,
because the broken version controls whether the fix arrives.

## Lifecycle — internalise before writing one

1. **Register** → browser fetches the SW script.
2. **Install** — the new SW precaches; it then **waits** while any previous
   version still controls open pages.
3. **Activate** — old pages gone (or `skipWaiting()` called): clean up old
   caches, take control (`clients.claim()` for immediately-controlled pages).
4. **Update check** — the browser refetches the SW script on navigation
   (byte-diff triggers a new install cycle). The SW script itself must be
   served `Cache-Control: no-cache` — a far-future-cached SW is unupdatable.

`skipWaiting()` is a decision, not a default: activating mid-session mixes
old pages with a new cache set. The safe pattern: detect the waiting worker,
show "Update available — refresh", call `skipWaiting()` on consent, reload on
`controllerchange`.

## Versioned caches — the non-negotiable skeleton

```js
const CACHE = "app-v42"; // bump per deploy (inject from the build)
const SHELL = ["/", "/offline.html", "/css/site.css", "/js/app.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate") {
    // Network-first navigations: users get deploys; offline gets the fallback
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((hit) => hit ?? caches.match("/offline.html")),
      ),
    );
  }
});
```

Strategy per resource class — the table in SKILL.md (cache-first shell,
stale-while-revalidate statics, network-first data). **Workbox** is the
reference implementation of all of them (routing, expiry, quota handling);
prefer it over hand-rolling once you're past the skeleton. Enable
**navigation preload** when using network-first navigations, so the network
request starts in parallel with SW boot.

HTTP caching semantics still apply *underneath* the SW
(`caching-and-cdn.md`) — the Cache Storage API stores what the HTTP layer
handed it, including a stale response you then serve forever. Bound
everything you cache (expiry/quota — storage is finite, eviction per-origin).

## Kill switch — decide before you need it

A misbehaving SW persists until replaced. Keep deployable escape hatches: a
no-op SW shippable at the same URL, plus a server-controlled flag the SW
checks to bypass caching — and test the recovery path once before trusting it.

## Installability (PWA)

Minimum manifest for install prompts (validate in DevTools → Application):

```json
{
  "name": "Field Ops Console",
  "short_name": "FieldOps",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "theme_color": "#101418",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Plus HTTPS and (Chromium) a fetch-handling SW. Provide a maskable icon or
Android crops yours badly. iOS/Safari installed-app caveats shift by release
(July 2026 — verify push, storage persistence and lifecycle before promising
parity). Capture `beforeinstallprompt` (Chromium) to offer install at a
sensible moment instead of the browser's.

## Background capabilities (support as of July 2026 — re-verify)

- **Background Sync** (Chromium-only): the SW's `sync` event fires when
  connectivity returns — the offline-write-queue pattern (queue in
  IndexedDB, replay on sync; at-least-once, so idempotency →
  `api-development`).
- **Periodic Background Sync** (Chromium-only, installed PWAs,
  engagement-gated): opportunistic freshness, never guaranteed.
- **Web Push**: cross-engine, including iOS Safari (installed PWAs);
  permission UX and payload encryption are the real work — decision-level.

Feature-detect all of it; the app must work without any of it.

## Offline as a product decision

Decide what offline *means* before caching: read-only shell + last-synced
data? Queued writes? Full offline-first with IndexedDB as source of truth
and conflict handling? Each tier is an order of magnitude more work — state
the tier in the plan; "we added a service worker" is not an offline strategy.
Sync-conflict semantics land in the API design (→ `api-development`); heavy
offline-first architectures deserve a design review (→ `architecture-review`).
