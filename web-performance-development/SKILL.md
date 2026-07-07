---
name: web-performance-development
description: >-
  Framework-independent web performance and PWA engineering: Core Web Vitals
  (LCP, INP, CLS) with the lab-vs-field measurement discipline (Lighthouse,
  CrUX, RUM), the critical rendering path, loading strategy (code-splitting,
  defer, preload/prefetch, fetchpriority), image/font/media optimisation,
  HTTP caching and CDN strategy, service workers and PWA (offline,
  installability), runtime performance (long tasks, bfcache) and performance
  budgets in CI. Use whenever a task involves a slow page, a
  Lighthouse/PageSpeed score, bundle size, "improve performance", a
  web-vitals regression, caching headers, image or font loading, a service
  worker or manifest.json, or making a site installable or work offline.
  Triggers include LCP/INP/CLS, TTFB, render-blocking resources,
  Cache-Control decisions, lazy loading, "the site feels sluggish".
  PROACTIVELY activate when shipping user-facing pages. React render
  mechanics route to react-development, visual craft to frontend-development.
---

# Web Performance Development

Making the web platform fast, whatever the framework: how pages load, render
and respond, measured by what users experience in the field. A Vue, Blazor,
Rails or vanilla site gets the same discipline a Next.js app does — the
browser doesn't care what generated the HTML. This skill owns loading
strategy, asset delivery, caching, service workers/PWA and runtime
responsiveness; `react-development` owns React-specific render mechanics and
`frontend-development` owns visual craft (boundaries below).

Context (July 2026 — re-verify before citing): the Core Web Vitals are
**LCP** (Largest Contentful Paint, good ≤ 2.5 s), **INP** (Interaction to
Next Paint, good ≤ 200 ms — replaced FID in March 2024) and **CLS**
(Cumulative Layout Shift, good ≤ 0.1), each assessed at the **75th
percentile of field data** (CrUX aggregates over a rolling 28 days).
Lighthouse remains the lab diagnostic; its score is not the outcome.

## Non-negotiables

1. **Field data is the verdict; lab is the microscope.** Optimise the p75
   field metric (RUM/CrUX), reproduce and diagnose in the lab, then confirm
   the win back in the field. A Lighthouse score is never the goal.
2. **Measure before and after — same conditions.** Throttled CPU/network,
   cold cache, stated device class. A performance claim without numbers is
   an opinion.
3. **The fastest byte is the unshipped one.** JavaScript especially — it's
   paid for three times (download, parse/compile, execute) and it blocks the
   main thread that INP is measuring. Cutting beats optimising.
4. **Never lazy-load the LCP element; lazy-load below the fold.** The hero
   image loads eagerly, at high priority, discoverable in the initial HTML.
5. **Everything that occupies space declares its size.** Images, embeds, ads
   and dynamic slots get width/height or a reserved box — CLS is a
   layout-contract failure, not an image problem.
6. **Fonts are render-critical assets**: self-hosted WOFF2, subset,
   preloaded when critical, `font-display` chosen deliberately, fallbacks
   metric-adjusted so the swap doesn't shift layout.
7. **Cache policy is deliberate, per asset class.** Hashed immutable statics
   cached forever; HTML revalidated. No `Cache-Control` means the browser
   guesses — that's a policy too, just a bad one.
8. **A service worker without an update strategy is an outage.** Versioned
   caches, old versions cleaned on activate, a decided update UX. A broken
   SW pins users to a broken site.
9. **Third-party scripts are a budget line.** Each tag is measured, loaded
   late or façaded, and re-justified periodically — the tag manager is not
   free, and it will regress you while you sleep.
10. **Budgets in CI, or the wins regress silently.** Metric and resource-size
    budgets enforced on every build
    (`references/runtime-performance-and-budgets.md`).

## Decision tables

Failing metric → first places to look:

| Metric failing | Look at |
|---|---|
| LCP | Its sub-parts in order: TTFB (server/CDN) → resource load delay (discoverability, priority) → resource load time (size/format) → render delay (blocking CSS/JS) |
| INP | Long tasks on the main thread, oversized hydration, heavy event handlers, layout thrashing, third-party JS |
| CLS | Media without dimensions, font swaps, late-injected banners/ads, content inserted above the viewport's existing content |
| TTFB (advisory, feeds LCP) | Server time, redirects, cache misses at the CDN, cold starts |

Resource hints (use the narrowest that works):

| Need | Hint |
|---|---|
| Early connection to a critical third-party origin | `preconnect` (sparingly — sockets aren't free) |
| Critical late-discovered asset (hero image in CSS, critical font) | `preload` + correct `as` |
| Raise/lower priority of a discoverable resource | `fetchpriority` (`high` / `low`) |
| ES module needed soon | `modulepreload` |
| Likely next navigation | `prefetch`, or the Speculation Rules API (Chromium — `references/loading-and-code-splitting.md`) |

Caching, per asset class (`references/caching-and-cdn.md`):

| Asset | Policy |
|---|---|
| Hashed static (app.3f2a1.js) | `public, max-age=31536000, immutable` |
| HTML / app shell | `no-cache` (cache but always revalidate) — never `no-store` (kills bfcache) |
| API responses (private) | `private, no-store` or short `max-age` + `ETag` per endpoint semantics |
| Images/fonts (unhashed) | Moderate `max-age` + `stale-while-revalidate` |

Service-worker strategy, per resource
(`references/service-workers-and-pwa.md`):

| Resource | Strategy |
|---|---|
| Precached app shell | Cache-first |
| Static assets | Stale-while-revalidate |
| API / dynamic data | Network-first with timeout → cached fallback |
| Navigations | Network-first + offline fallback page; enable navigation preload |

## High-frequency pitfalls

- **Preload spam** — a dozen `preload`s deprioritise each other and the
  things the parser found on its own; preload only what's critical *and*
  late-discovered.
- **Hero image as a CSS background or behind JS** — invisible to the preload
  scanner; the LCP resource belongs in the initial HTML (or is preloaded).
- **`loading="lazy"` on the LCP image** — adds a full discovery-to-load
  delay to the one image that matters most.
- **Font swap shifting layout** — missing `size-adjust`/metric-adjusted
  fallback turns every webfont arrival into CLS.
- **`Cache-Control: no-store` on HTML** — disables the back/forward cache;
  the snappiest navigation the platform offers, thrown away.
- **SW caching HTML cache-first "for offline"** — users pinned to a stale
  app until the SW updates; use network-first for navigations.
- **Layout reads inside write loops** (`offsetHeight` after style changes) —
  forced synchronous reflows; batch reads, then writes.
- **Animating layout properties** (`top`/`left`/`width`) — main-thread jank;
  animate `transform`/`opacity`.
- **Measuring on the dev machine** — an M-series laptop on fibre is nobody's
  p75; throttle 4× CPU / Slow 4G and test a mid-range Android profile.
- **Infinite scroll injecting above existing content** (or pagination
  without reserved space) — self-inflicted CLS.

## Workflow (attacking a performance problem)

1. **Field first**: pull CrUX/RUM for the failing origin — which metric,
   which page group, which device/connection split. No field data? Ship a
   RUM beacon before optimising
   (`references/core-web-vitals-and-measurement.md`).
2. **Reproduce in the lab**: DevTools performance trace + Lighthouse under
   throttling that matches the field profile.
3. **Attribute**: break the metric into its sub-parts (LCP phases; INP's
   input delay / processing / presentation; CLS's shifting elements) and
   name the dominant contributor.
4. **Fix the biggest lever first**, in this order of typical leverage:
   server/TTFB → render-blocking resources → asset weight → JavaScript
   execution. Not the reverse — micro-optimising JS under a 3 s TTFB is
   theatre.
5. **Verify in the lab, ship, confirm in the field** over the following
   28-day window.
6. **Lock the win in**: set or tighten the CI budget so the regression can't
   land quietly.

## Reference index

Load on demand:

- `references/core-web-vitals-and-measurement.md` — LCP/INP/CLS anatomy and thresholds, lab vs field, CrUX, building RUM, attribution, SPA caveats
- `references/critical-rendering-path.md` — parser → paint pipeline, render-blocking CSS/JS, critical CSS, TTFB, compression, 103 Early Hints
- `references/loading-and-code-splitting.md` — bundle discipline, code-splitting, tree shaking, resource hints in depth, speculation rules, third-party management
- `references/images-fonts-media.md` — formats, responsive images, lazy loading, LCP image rules, font loading playbook, video
- `references/caching-and-cdn.md` — Cache-Control taxonomy, revalidation, immutable pattern, CDN behaviour, stale-while-revalidate, bfcache
- `references/service-workers-and-pwa.md` — SW lifecycle and update model, caching strategies, offline, installability, background sync, kill switches
- `references/runtime-performance-and-budgets.md` — long tasks and INP, yielding, layout thrashing, animation, memory, budgets and Lighthouse CI

## Boundaries

- **React render mechanics** — waterfalls, re-renders, RSC boundaries,
  Next.js specifics → `react-development`. This skill owns the
  platform-level loading/runtime discipline both share.
- **Visual craft** — semantic HTML, CSS architecture, design tokens,
  Tailwind → `frontend-development`; **perceived-performance UX** (skeletons,
  optimistic UI, the Doherty threshold) → `ux-design`.
- **3D/WebGL performance** (draw calls, instancing) → `threejs-development`.
- **Backend load/stress testing** (k6, workload models, SLO gating) →
  `testing-development`; **API payload/pagination design** feeding TTFB →
  `api-development`.
- **Telemetry pipelines and SLOs** — RUM beacons feed the observability
  stack; the collection/alerting discipline → `observability-development`.
  This skill owns *which* web-vitals signals to capture.
- **CDN/edge provisioning** (Front Door, CDN profiles) →
  `azure-development`; **CI wiring** for budget gates → `devops-development`.
- **JS/TS language and tooling standards** → `typescript-development`.
