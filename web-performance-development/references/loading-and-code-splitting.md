# Loading strategy and code-splitting

The goal is not a small total — it's a small **initial** payload, with
everything else arriving exactly when needed and ideally before it's asked
for.

## Bundle discipline

- **Split by route first** — the highest-leverage cut in any multi-page SPA:
  each route loads its own chunk; the shared core stays small.
- **Split by feature/interaction second**: heavy components (editors,
  charts, maps, modals) load on demand via dynamic `import()` — every
  mainstream bundler code-splits on it automatically.
- **Preload on intent** to hide the load: fetch the chunk on
  hover/focus/viewport-approach, not on click:

```js
const loadEditor = () => import("./editor.js");
trigger.addEventListener("pointerenter", loadEditor, { once: true });
trigger.addEventListener("click", async () => {
  const { mountEditor } = await loadEditor();
  mountEditor(target);
});
```

- **Tree shaking preconditions**: ESM imports (`import { x }`), honest
  `sideEffects` in package.json, no `require` mixed in. Import concrete
  subpaths from barrel-heavy libraries (icons, component kits, date/utility
  libs) — an index import can drag thousands of modules into the graph.
- **Audit the graph, don't guess**: bundle-analysis tooling
  (source-map-explorer, webpack/rollup analyser plugins) before and after;
  duplicated dependencies (two versions of one lib) are the classic silent
  win.
- Set a **size budget per entry chunk** and enforce it in CI
  (`runtime-performance-and-budgets.md`).

## Resource hints, precisely

```html
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="preload" href="/fonts/display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="modulepreload" href="/js/app.js">
<link rel="prefetch" href="/js/checkout.js">
<img src="/hero.avif" fetchpriority="high" width="1200" height="600" alt="…">
```

- `preconnect` — DNS + TCP + TLS ahead of need. Each one costs a socket;
  2–4 critical origins, no more. `dns-prefetch` is the cheap wide-net
  fallback for the rest.
- `preload` — a **this-page, critical, late-discovered** fetch at high
  priority. The `as` attribute is mandatory (wrong/missing `as` = wrong
  priority or a double fetch; fonts additionally need `crossorigin`). Every
  preload steals bandwidth from something the scanner found — if it isn't
  critical, it's harming the things that are. Unused-preload warnings in
  DevTools are defects.
- `fetchpriority` — nudges priority of an already-discoverable resource
  (hero image `high`, below-fold carousel `low`). Supported across engines
  since late 2024 (re-verify if supporting older browsers).
- `prefetch` — idle-time, low-priority fetch for the **next** navigation.
- `modulepreload` — preloads *and* parses a module; use for the entry
  module's critical dependency chain.

## Speculative navigation

The Speculation Rules API (Chromium-only, July 2026 — others ignore it
harmlessly; re-verify) prefetches or fully **prerenders** likely next pages:

```html
<script type="speculationrules">
{
  "prerender": [{ "where": { "href_matches": "/product/*" }, "eagerness": "moderate" }],
  "prefetch":  [{ "where": { "selector_matches": ".nav a" }, "eagerness": "conservative" }]
}
</script>
```

A prerendered navigation is effectively instant. Costs: memory and
bandwidth on the user's device, and analytics/side-effect code running for
pages never viewed (gate side effects on `document.prerendering` +
`prerenderingchange`). Start `conservative`/`moderate`; reserve `eager` for
high-confidence flows. Respect data-saver signals when speculating.

## Third-party scripts

The least-controlled, most-regressing part of any page:

1. **Inventory and attribute**: a DevTools trace groups main-thread cost per
   origin; know each tag's LCP/INP contribution.
2. **Load late by default**: `async`, or explicitly after first interaction
   or idle for anything non-essential (consent tooling permitting).
3. **Façade heavy embeds**: replace video players, chat widgets and maps
   with a static poster + button that swaps in the real embed on click —
   hundreds of KB deferred until intent.
4. **Isolate**: iframes contain third-party layout/JS cost;
   `loading="lazy"` on below-fold iframes.
5. **Re-justify quarterly**: tags outlive their teams. Tag-manager sprawl is
   unowned code shipped to every user. Supply-chain integrity of third-party
   script (SRI, vendoring) → `secure-development`.

## Anti-patterns

- Preloading a dozen resources "to be safe" — priority inflation is
  self-cancelling.
- `prefetch` of large assets on metered/slow connections — check
  `navigator.connection.saveData` where it matters.
- Splitting so aggressively that a route needs 30 request round trips —
  group by usage correlation; HTTP/2 multiplexing is not free scheduling.
- Dynamic `import()` with computed paths the bundler can't statically see —
  the chunk graph degrades to "ship everything".
- Loading polyfills for evergreen browsers — build for your actual support
  matrix (`typescript-development` for toolchain targets).
