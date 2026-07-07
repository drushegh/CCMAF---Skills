# Runtime performance and performance budgets

Loading gets users to a rendered page; runtime performance is whether the
page then responds. INP is the field metric; long tasks, layout thrashing
and death-by-listener are the mechanisms.

## Long tasks — the INP mechanism

The main thread runs JS, style, layout, paint and input dispatch. Any task
> 50 ms means an interaction arriving mid-task waits (input delay) before
your handler even starts. The discipline:

- **Do the minimum synchronously in handlers**: update what the user must
  see, defer the rest (analytics, recomputation, prefetch) past the paint.
- **Yield inside long work**: chunk loops and await a yield point between
  chunks so input can interleave.

```js
async function processChunked(items, fn) {
  const yieldToInput =
    typeof scheduler !== "undefined" && scheduler.yield
      ? () => scheduler.yield() // Chromium; cross-engine status: re-verify (July 2026)
      : () => new Promise((r) => setTimeout(r, 0));
  for (const item of items) {
    fn(item);
    if (navigator.scheduling?.isInputPending?.()) await yieldToInput();
  }
}
```

- **Move real computation off-thread**: Web Workers for
  parsing/crypto/search/image work; the main thread is for UI.
- Attribute before optimising: a DevTools trace's flame chart names the long
  tasks; the web-vitals attribution build names the slow interaction
  (`core-web-vitals-and-measurement.md`). Framework-level render cost
  (hydration, re-renders) → `react-development` for React;
  the method for chasing a specific slow path → `systematic-debugging`.

## Layout thrashing

Reading layout (`offsetHeight`, `getBoundingClientRect`) after writing
styles forces a synchronous reflow; alternating read/write in a loop forces
one per iteration. Batch all reads, then all writes; cache measurements;
prefer CSS classes over per-element inline style writes;
`IntersectionObserver`/`ResizeObserver` over scroll/resize handlers that
measure.

## Animation and rendering

- Animate **`transform` and `opacity`** only — compositor-driven, off the
  main thread. Animating `top/left/width/height/margin` re-runs layout every
  frame.
- `will-change` sparingly and temporarily — each promotion costs memory;
  blanket use degrades.
- `content-visibility: auto` + `contain-intrinsic-size` skips rendering
  off-screen sections (long pages, lists) — cross-engine since 2024.
- Respect `prefers-reduced-motion` (implementation craft →
  `frontend-development`; perception/UX reasoning → `ux-design`).

## Memory

Leaks degrade INP long before they crash: growing heaps mean longer GC
pauses. The usual suspects — listeners added per render/navigation and never
removed (`AbortController`s or framework cleanup hooks), detached DOM held
by closures, unbounded module-level caches (bound them or use `WeakMap`),
observers never disconnected, timers never cleared. Verify with DevTools
Memory: three heap snapshots across repeated navigation; monotonic growth =
leak.

## Performance budgets — making wins permanent

A budget is a CI-enforced ceiling, agreed before the work, not aspiration:

| Budget type | Example |
|---|---|
| Metric (lab, throttled) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, TBT ≤ 200 ms |
| Resource size | Initial JS ≤ 200 KB compressed; entry CSS ≤ 50 KB; per-route chunk ceilings |
| Count/behaviour | ≤ N third-party origins; zero unused preloads; bfcache-eligible |

Set from the current baseline minus a margin, tighten as you improve, and
treat a budget failure as a broken build — the entire point is that
regressions can't land quietly.

**Lighthouse CI** is the reference enforcement tool: run against built
pages in CI with assertions:

```json
{
  "ci": {
    "collect": { "numberOfRuns": 3, "url": ["http://localhost:4173/"] },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["error", { "maxNumericValue": 512000 }]
      }
    }
  }
}
```

Bundle-size gates (size-limit, bundlesize or the bundler's own budget
config) are cheaper and less flaky than full Lighthouse runs — use both:
size gates on every PR, Lighthouse assertions on main/nightly. Lab variance
is real: multiple runs, medians, and thresholds with margin, or the team
learns to ignore red. CI wiring → `devops-development`.

## Regression triage, quickly

1. Confirm in field data (or the CI trend) — one noisy lab run is not a
   regression.
2. Bisect the deploy range; diff the bundle-analysis output between the two
   builds — most regressions are a dependency or an accidental import.
3. Trace the specific metric sub-part that moved; fix; add the budget that
   would have caught it. The bisect method → `git-workflow`.
