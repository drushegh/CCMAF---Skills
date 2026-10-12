# DOM probes and real input

Screenshots show what painted; probes measure it. Both lie when the probe
measures the wrong thing. These are the traps that let a broken UI pass a
green check.

## Drive real input, not synthetic events

- **Real input** goes through the browser's hit-testing: Playwright
  `locator.click()` / `page.mouse.click()` (Playwright checks the element is
  the hit target at the action point and fails if an overlay intercepts it),
  or raw CDP `Input.dispatchMouseEvent` paired with
  `document.elementFromPoint(x, y)` to confirm what is actually on top.
- **Synthetic events** skip hit-testing: `el.click()` inside `evaluate`,
  `locator.dispatchEvent('click')` (no actionability checks at all), and
  `click({ force: true })`. They "work" on an element covered by a backdrop,
  a stacked drawer, or a `backdrop-filter` layer that swallows real clicks.
- **Rule:** an interaction pass that used only synthetic events is not
  accepted. If you had to `force` a click, the overlay is the finding.
- **Stacked overlays** (a modal opened over a drawer, a popover inside a
  dialog): the lower layer's backdrop often intercepts the upper layer's
  clicks. jsdom has no layout or hit-testing, so component tests cannot see
  this — only a real browser can.

## Visibility is not `offsetParent`

`offsetParent` is `null` for `display: none` **and** for `position: fixed`
elements whose containing block is the viewport (MDN), so it reports every
fixed toolbar, toast and FAB as hidden. Use:

```javascript
const visible = el => !el.hidden && el.getClientRects().length > 0;
```

and, where it matters, `getComputedStyle(el).visibility !== 'hidden'` plus a
non-zero rect. Playwright's `toBeVisible()` already does the right thing.

## Collisions hide between breakpoints

Checking only at breakpoints misses overlaps that exist at widths between
them — typically fluid (`vw`/`clamp`) text growing into a fixed-px grid track.
`scrollWidth > clientWidth` stays false because nothing overflows the page; the
glyphs simply sit on top of the neighbour.

- **Scan a width range** (e.g. 768 → 1440 in 16–32 px steps), not just the
  named breakpoints.
- **Measure glyphs, not boxes:** `const r = document.createRange();
  r.selectNodeContents(textEl); r.getClientRects()` gives the painted line
  boxes; assert none intersects the neighbour's `getBoundingClientRect()`.
- **Fix:** let fixed tracks yield (`min(21rem, 30vw)`, `minmax(0, 1fr)`)
  rather than tuning one width.

## Computed style beats source text

A unit test that greps the stylesheet proves a rule **ships**, not that it
**wins**. A `.tab:focus-visible` rule loses silently to a more specific
`.root button:focus-visible`. Verify with `getComputedStyle()` on the element,
in the real state (focused via keyboard, hovered via real mouse), in a real
engine (Chromium at least) — not jsdom, which does not apply the cascade
faithfully.

## Computed style is not paint

Some failures leave every computed property intact:

- **Focus ring not painted** — `clip-path`, `overflow: hidden` on a parent, or
  a ring the same colour as its backdrop leaves `outline` set but draws
  nothing visible. Gate focus visibility on a pixel diff of the element
  focused vs unfocused (→ `accessibility-development`).
- **Stacking-context side effects** — adding `isolation`, an empty fixed
  pseudo-element, `will-change` or `backdrop-filter` can switch text from LCD
  (subpixel) to greyscale anti-aliasing with no computed-style change. For any
  stacking change, pixel-diff a screenshot of HEAD against the working tree.

## Waits that cannot hang silently

- **Don't wait for a permanent live region to detach.** A toast container with
  `role="status"` usually stays in the DOM for life; waiting for it to disappear
  never resolves. Wrapping that wait in `.catch(() => {})` turns it into a
  silent fixed timeout. Add a dedicated hook (`data-loading="true"` toggled by
  the app) and let timeouts throw.
- **Animated numerals** (count-up stats) read mid-tween. Call
  `page.emulateMedia({ reducedMotion: 'reduce' })` before navigating (if the
  app honours it), or wait for the final value with `toHaveText`.
- **Navigation choice in SPAs:** `page.goto()` is a full reload — in-memory
  state (theme toggle, unsaved form, store) resets. Use `goto` to enter a route
  deterministically (e.g. a hash route instead of clicking a tab component
  that races state updates); use in-app controls when the check depends on
  in-memory state, and wait for a state signal after the click.
- **Storage survives `goto`.** localStorage/sessionStorage persist across
  navigations in the same context, so one probe contaminates the next (a
  remembered draft makes "submit as rendered" differ from "submit empty"). Use
  a fresh `browser.newContext()` per probe, or clear storage in
  `context.addInitScript()`.

## Record what you observed, not what you asked for

A capture harness's sidecar (JSON, filename, log line) must read the
configuration back from the running system — viewport from
`window.innerWidth`, theme from the computed `color-scheme`, renderer/backend
from the engine — not echo the flag it was passed. A harness that wrote its
input flag reported one renderer while the captures came from another.
