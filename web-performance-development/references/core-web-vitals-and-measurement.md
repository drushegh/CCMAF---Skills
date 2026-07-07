# Core Web Vitals and the measurement discipline

Thresholds current July 2026 — Google revises definitions occasionally
(INP replaced FID in March 2024); re-verify at web.dev/vitals before citing.

## The three metrics

| Metric | Measures | Good (p75) | Needs improvement | Poor |
|---|---|---|---|---|
| LCP | Render time of the largest text block or image in the viewport | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| INP | Worst (approx.) interaction latency across the whole visit: click/tap/keypress → next paint | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS | Sum of unexpected layout-shift scores in the worst burst (session window) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

Supporting diagnostics (not Core, still worth tracking): **TTFB** (good
≤ 800 ms — it's the floor under LCP) and **FCP** (good ≤ 1.8 s).

### Sub-parts — where the time actually goes

- **LCP = TTFB + resource load delay + resource load time + render delay.**
  Load *delay* (the gap before the browser even starts fetching the LCP
  resource) is the most commonly dominant and most fixable part —
  discoverability and priority, not bytes.
- **INP = input delay + processing duration + presentation delay.** Input
  delay means the main thread was busy (long tasks); processing is your
  handlers; presentation is rendering the update.
- **CLS attributes to specific shifting elements** — the attribution build
  of the web-vitals library names them.

## Lab vs field — different questions

| | Lab (Lighthouse, DevTools, WebPageTest) | Field (CrUX, your RUM) |
|---|---|---|
| Answers | *Why* is it slow? What would improve it? | *Is* it slow, for whom, how often? |
| Conditions | Controlled, throttled, reproducible | Real devices, networks, geographies |
| Limits | One device profile; no INP from real interactions; no cache/return-visit reality | 28-day lag (CrUX); needs traffic; can't explain root cause |

The failure mode in each direction: optimising a Lighthouse score no user
experiences, or staring at a field regression with no trace to explain it.
Use both, in the workflow order in SKILL.md.

**CrUX** (Chrome UX Report) is the public field dataset — Chrome users,
opted-in, p75 over a rolling 28 days; it's what search tooling reports.
Query it via PageSpeed Insights or the CrUX API/BigQuery. Its blind spots:
no Safari/Firefox, no logged-in-vs-anonymous split, origin/page granularity
only — your own RUM fills those.

## Building RUM with the web-vitals library

```js
import { onLCP, onINP, onCLS } from "web-vitals/attribution";

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,          // "LCP" | "INP" | "CLS"
    value: metric.value,
    rating: metric.rating,      // "good" | "needs-improvement" | "poor"
    attribution: {
      element: metric.attribution?.element,
      target: metric.attribution?.interactionTarget,
    },
    page: location.pathname,
  });
  // sendBeacon survives the page being torn down mid-send
  navigator.sendBeacon("/vitals", body);
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

Discipline that keeps RUM honest:

- **Report at the right moment**: CLS and INP finalise late — the library
  reports on `visibilitychange`/pagehide; never only on `load`.
- **Use the attribution build** — a p75 number without the offending
  element/script is unactionable.
- **Segment before averaging**: device class, connection, country, page
  template, logged-in state. A single origin-wide mean hides everything;
  distributions and percentiles, never averages.
- Sample if volume demands, but sample *sessions*, not events, or you skew
  the percentiles.
- Where the beacons land (pipeline, dashboards, alerting) →
  `observability-development`.

## SPA and soft-navigation caveats

CWV attributes the whole visit to the **hard navigation's URL** — client-side
route changes don't reset LCP/CLS, and their render cost lands on the landing
page's INP/CLS. Consequences: SPAs under-report landing-page cost spread
across routes, and route-level field comparisons mislead. A soft-navigation
reporting API has been in Chromium origin trials (status as of July 2026 —
re-verify); until it's standard, treat per-route SPA vitals as approximate
and instrument route transitions yourself if they matter.

## Lab settings that make results comparable

Throttle to your field reality (default: 4× CPU slowdown, Slow/Fast 4G —
match your RUM's device mix); test cold and warm cache separately; run
Lighthouse ≥ 3 times and take the median (variance is real); pin the device
profile in the repo so everyone measures the same thing.
