# Rendering and capturing

The mechanics of turning a UI into an image you can look at. Playwright (Chromium
headless) is the default for anything web/HTML; the principles transfer to other
capture tools.

## Capture a page at a real viewport

```javascript
import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // phone
const page = await ctx.newPage();
await page.goto('http://localhost:3000/checkout');
await page.getByRole('button', { name: 'Pay' }).waitFor(); // wait for a real signal
await page.screenshot({ path: 'checkout-mobile.png', fullPage: true });
await browser.close();
```

- **Viewport is the whole point.** Capture at the widths that matter — at
  minimum a phone (~390×844) and a desktop (~1280–1440 wide); add tablet
  (~768) and the project's breakpoints. A desktop-only screenshot hides most
  layout and reach bugs.
- **Device descriptors** set viewport + DPR + user-agent together:
  `browser.newContext({ ...devices['iPhone 15'] })`.
- **`fullPage: true`** captures the entire scroll height (good for reviewing the
  whole screen); omit it to capture just the viewport (good for "above the
  fold" / first impression).
- **`fullPage` only follows document scroll.** In an app shell that scrolls
  inside a container (`overflow: auto` on a main pane), `fullPage` stops at the
  first viewport. Scroll each section into view
  (`locator.scrollIntoViewIfNeeded()`) and shoot the viewport, or screenshot the
  container element; never trust `fullPage` inside a shell.

## Capture a single element or region

```javascript
await page.locator('.pricing-card').screenshot({ path: 'card.png' });
await page.screenshot({ path: 'hero.png', clip: { x: 0, y: 0, width: 1280, height: 600 } });
```

Element shots are ideal for reviewing one component in isolation and for tight
visual-regression baselines.

## Wait for the truth before you capture

A screenshot taken too early critiques a lie. Before capturing:

- **Fonts loaded** — `await page.evaluate(() => document.fonts.ready);` (web
  fonts shift layout when they swap in).
- **Content settled** — wait for the real signal: a visible selector
  (`locator.waitFor()`) or a specific response. Avoid `waitUntil: 'networkidle'`
  (Playwright discourages it as unreliable) and never a fixed `sleep`.
- **Animations off** — Playwright's screenshot assertions disable animations
  (`animations: 'disabled'`); for raw `screenshot()`, inject a stylesheet that
  zeroes transitions/animations, or wait for them to finish. Capturing
  mid-transition produces blurry, non-deterministic images.

```javascript
await page.addStyleTag({ content: `*,*::before,*::after{
  animation-duration:0s!important; transition-duration:0s!important; }` });
await page.evaluate(() => document.fonts.ready);
```

## Themes, states and motion

- **Theme**: `browser.newContext({ colorScheme: 'dark' })` to capture dark mode;
  capture both if the app supports them.
- **States**: drive the UI into each state (empty/loading/error/populated) before
  shooting — interact, mock the response, or load the relevant fixture (see
  `state-and-viewport-coverage.md`).
- **Reduced motion / locale / RTL**: `reducedMotion`, `locale`, and a `dir="rtl"`
  pass catch a class of layout bugs.

## Serving and environment traps

When a capture hangs, times out or renders with the wrong font, check the
environment before the code:

- **`python -m http.server` speaks HTTP/1.0** by default (one request per
  connection). A page that fetches dozens of ES modules concurrently can stall
  indefinitely with zero console errors. Serve previews with an HTTP/1.1
  keep-alive server (the project's dev server, `npx serve`, or
  `python -m http.server --protocol HTTP/1.1` on Python 3.11+), and check the
  server's PID and protocol before suspecting the page.
- **Is the server still alive?** A backgrounded dev server can be reaped
  between steps; a probe returning status `000` / connection refused means the
  server died, not that the page broke. Confirm with a request before each
  capture batch.
- **Vite + a junctioned/symlinked `node_modules`** (common in extra git
  worktrees): Vite serves dependency assets such as `@fontsource` fonts via
  `/@fs/<real path>`; the real path lies outside `server.fs.allow`, so the
  request gets a 403 and the page silently falls back to a system font — every
  text screenshot then diffs by a few per cent. Run visual gates in the main
  checkout, or add the real `node_modules` path to `server.fs.allow`.
- **A hidden tab suspends `requestAnimationFrame`.** In a background or
  preview tab that is not visible, screenshots time out and it looks like an
  infinite render loop; the tell is that synchronous `evaluate` calls still
  answer. Check `document.visibilityState` first; if `hidden`, capture in a
  visible tab or a headless browser.
- **Firefox prefs:** pass `firefoxUserPrefs` to
  `firefox.launchPersistentContext()`; prefs passed to `launch()` were observed
  not to take effect in a context made with `newContext()` (verify on your
  Playwright version). When a repro "can't reproduce", inspect the profile
  actually in use, and simulate the failure condition directly (e.g. blocked
  storage) instead of hoping the environment matches.
- **Playwright empties `test-results/`** (its `outputDir`) at the start of every
  run. Review screenshots saved there by an earlier step vanish before anyone
  reads them — save them elsewhere (a scratch directory) or capture after the
  e2e run.
- **Watch the console and failed requests while capturing.** A 404 stylesheet
  (for example a framework's generated bundle that is only emitted when source
  styles exist) renders as plain, unstyled markup that an HTTP smoke check
  reports as 200 OK. `page.on('requestfailed')` and `page.on('response')` with
  `status >= 400` catch it.

## In this environment

You can render and **view** directly: drive a headless browser (Playwright, or
the Chrome tools), save the PNG, then open the image to look at it — the capture
is only useful once you actually view it (`the-critique-loop.md`). For a static
HTML file, serve it (or `file://`) and screenshot the same way. Test
infrastructure and CI wiring → `testing-development`.
