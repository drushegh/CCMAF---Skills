# Content Scripts and Extension UI

Load when injecting into pages, building UI inside a host page, or working
on popups and side panels.

## Worlds

- **Isolated world (default)** — shares the DOM with the page but not its
  JavaScript: page globals, prototypes and framework instances are
  invisible, and the page cannot see your variables. In Chrome,
  `element.onclick = …` set from the isolated world is separate from the
  page's; in Firefox it overwrites — use `addEventListener` everywhere.
- **Main world** (`world: "MAIN"` in `content_scripts` or
  `scripting.executeScript`) — runs as page code under the page's CSP, can
  read page objects, and has **no extension APIs**. Treat it as untrusted;
  communicate with your isolated script through `window.postMessage` or
  DOM `CustomEvent`s and validate what comes back (the page can send the
  same messages).

## Three Ways to Inject

| Method | When | Needs |
|---|---|---|
| Manifest `content_scripts` | Fixed sites, always on | `matches` (implies host access) |
| `scripting.registerContentScripts` (Chrome 96+) | Sites chosen at runtime | Host permission for those sites; `persistAcrossSessions` controls survival |
| `scripting.executeScript` | On demand (action click, menu) | `scripting` + host permission or `activeTab` |

- `run_at`: `document_idle` (default, prefer it), `document_end`, or
  `document_start` (before the page's own scripts; DOM mostly absent).
- Order within one `run_at` stage: manifest scripts first in array order,
  then registered/programmatic scripts. CSS is injected before the DOM is
  built.
- `all_frames: true` to reach iframes; `match_about_blank` /
  `match_origin_as_fallback` for `about:blank`/`blob:` frames.
- **Already-open tabs**: Chrome does not inject manifest content scripts
  into tabs that existed before install, update or reload. After
  `onInstalled`, either inject programmatically into matching tabs or
  accept that the feature starts after the next page load. Handle the
  "Receiving end does not exist" error on first message.
- `executeScript({ func })` serialises the function — it cannot close over
  variables; pass `args`. Return values must be serialisable.

## Orphaned Content Scripts

Reloading or updating the extension leaves old content scripts running in
open tabs with a dead connection: any `chrome.*` call throws "Extension
context invalidated". Detect it (`chrome.runtime?.id` becomes undefined),
remove your UI and listeners, and stop. A newly injected copy may be running
alongside, so tag your root node and remove stale ones on start-up.

## Bootstrap Discipline

- **Inject once.** Guard with a marker
  (`if (document.documentElement.dataset.snippetShelf) return;`) — programmatic
  injection can run the same file several times per page.
- **IIFE ordering**: in a single-file content script wrapped in an IIFE,
  `const`/`let` values read by the synchronous bootstrap must be declared
  above the call, or the bootstrap hits the temporal dead zone and throws
  "Cannot access '…' before initialization" — silently, from the page's
  point of view.
- Wait for the element you need with a `MutationObserver` (disconnect when
  found, with a timeout), not a polling loop.

## UI Inside a Host Page

- **Isolate styles with a Shadow DOM root** attached to your own host
  element. Page CSS cannot reach in (except inherited properties such as
  `font` and `color`, so set them on `:host`); your CSS cannot leak out.
  Load CSS into the shadow root (constructable stylesheet or a `<link>` to a
  web-accessible file) rather than `content_scripts.css`, which styles the
  whole page.
- **Pages built with React, Vue or similar re-render and delete foreign
  nodes.** Anchor to a stable layout wrapper (often a custom element or a
  landmark with a stable attribute) rather than a deep generated class;
  re-insert only when your node is missing; never reposition every
  animation frame.
- **Do not fight the host's layout.** When inserting into a flex row, pin
  your element with `flex: 0 0 auto` so the host does not shrink or grow it;
  prefer an overlay (`position: fixed` in the shadow root) when the host
  layout is volatile.
- **Selectors are a contract you do not control.** Centralise them, fail
  soft (feature hidden, not page broken) and log a diagnostic when they stop
  matching.
- Keyboard and focus: injected UI must be reachable and must not trap focus
  or steal the page's shortcuts (accessibility-development).
- Never insert untrusted strings with `innerHTML`; build nodes or use
  `textContent`.

## Popups

- The popup is destroyed on blur. Persist drafts to `storage.session` as
  the user types and restore on open.
- It cannot be opened from a content script; `action.openPopup()` exists in
  newer Chrome (check the reference for your minimum version).
- Size is capped by the browser (roughly 800×600); design for it.

## Side Panels (Chrome 114+)

- Requires the `sidePanel` permission; set `side_panel.default_path` for a
  global panel, or `sidePanel.setOptions({ tabId, path, enabled })` for
  per-tab panels.
- `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` makes the
  toolbar icon open it — the simplest correct option when the panel is the
  main UI.
- `sidePanel.open({ windowId | tabId })` (Chrome 116+) **only works in
  response to a user action** — action click, keyboard command, context
  menu, or a gesture in an extension page or content script. Call it
  synchronously in that handler: an `await` (a storage read, a message
  round-trip) before it loses the gesture and the call rejects. Read what
  you need beforehand, or open first and load afterwards.
- Closing and open-state:
  - Chrome 141+ has `sidePanel.close()` and `sidePanel.onOpened`; Chrome
    142+ adds `sidePanel.onClosed`.
  - For older targets there is no close API: the panel page closes itself
    with `window.close()`, and the worker tracks open state through a
    long-lived port the panel opens with `runtime.connect()` — the port's
    `onDisconnect` is the reliable "panel closed" signal.
- The panel is an extension page: full extension APIs, the extension CSP,
  and it survives tab switches (global panel) — a good home for long-lived
  work that would otherwise need the worker kept alive.
- Firefox uses `sidebar_action` and the `sidebarAction` API instead; Edge
  supports the Chromium side panel (verify per version).
