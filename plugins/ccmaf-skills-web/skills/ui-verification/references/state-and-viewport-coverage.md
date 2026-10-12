# Coverage: states × viewports × variants

Most "looks broken" bugs aren't in the happy-path desktop view you naturally
build — they're in a state or viewport you never rendered. Verification means
covering the matrix, not one cell of it.

## The states every component has

Render and view each applicable state, not just the populated one:

- **Empty** — no data yet / first run. Is there a designed empty state
  (explanation + next action), or a blank void?
- **Loading** — skeletons/spinners; does layout hold so content doesn't jump
  (layout shift) when it arrives?
- **Populated (typical)** — the normal case.
- **Populated (extreme)** — long names, huge numbers, many items, tiny amounts,
  missing optional fields. This is where layouts break.
- **Error** — failed load, validation error, no network. Is it a designed,
  recoverable state with a clear message?
- **Zero results** — search/filter that matches nothing (distinct from empty).
- **Partial / mixed** — some items loaded, some failed; some permissions.
- **Interactive states** — hover, focus, active, disabled, selected (focus is
  also an accessibility requirement).

**Sign off on populated captures, in the live mount.** An empty shell hides
styling that was never ported (dozens of missing classes passed an empty-state
review), and a component test can pass while the component is not mounted in
the live layout at all; mocked transport (IPC, fetch) hides reload, StrictMode
and timing bugs. Acceptance needs fixture-populated captures **and** one check
of the real mount path in the running app.

## The viewports

At minimum **mobile (~390 px)** and **desktop (~1280–1440 px)**; add **tablet
(~768 px)** and the project's actual breakpoints (just below and just above
each). At each: does it reflow, are targets reachable, any horizontal scroll or
clipped content?

Breakpoints are not enough on their own: fluid type against a fixed-width
track can collide at widths *between* breakpoints with no overflow reported.
For text-heavy layouts, sweep a width range and measure glyph rects
(`dom-probes-and-input.md`).

## The variants

- **Theme** — light and dark (and high-contrast if supported).
- **Locale / length** — a longer language (German is the classic layout-breaker)
  and **RTL** (`dir="rtl"`) — catches truncation and mirroring bugs.
- **Reduced motion** — respect the OS setting; verify nothing essential is lost.
- **Density / zoom** — browser zoom to 200% (a11y) shouldn't break layout.

## Prioritise — don't shoot everything

The full cross-product is large; be deliberate:

- Always cover: the **primary screens** × {mobile, desktop} × {empty, populated,
  error}.
- Add theme/RTL/extreme-content for the **highest-traffic or highest-risk**
  components.
- A small data-heavy table needs the extreme/overflow pass; a static marketing
  hero needs the viewport/theme pass more than the state pass.

## Driving the states for capture

Get the UI *into* each state before screenshotting:

- **Empty/error/loading** — point at a fixture or mock the response (route
  interception), or use the component's Storybook story if one exists.
- **Extreme content** — feed long/edge-case fixture data.
- **Interactive** — `hover()`, `focus()`, click to reach active/selected, then
  capture.

Record which cells you covered so "verified" is evidenced, not assumed. The act
of viewing each → `the-critique-loop.md`; locking them as baselines →
`visual-regression.md`.
