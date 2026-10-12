---
name: browser-extension-development
description: >-
  Browser extension engineering on Manifest V3: the extension service worker
  lifecycle, permissions and host access, content scripts and isolated
  worlds, messaging, chrome.storage, extension-page CSP, popups and side
  panels, and store review — Chrome first, with Firefox, Edge and Safari
  differences. Use whenever a task touches a browser extension or add-on:
  manifest.json with manifest_version 3, background service_worker,
  content_scripts, chrome.* or browser.* APIs (runtime, tabs, scripting,
  storage, alarms, sidePanel, offscreen, declarativeNetRequest), "my
  extension stops working after a while", "Receiving end does not exist",
  injecting UI into a web page, publishing to the Chrome Web Store, Edge
  Add-ons or addons.mozilla.org, porting an MV2 extension, or making an
  extension work in Firefox. Also use when reviewing an extension's
  permissions or security.
---

# Browser Extension Development

Manifest V3 (MV3) extensions for Chromium browsers first, then Firefox and
Safari. The rules in this file always apply; load `references/` only for the
topic at hand. Extension APIs move every few Chrome releases — **check the
official reference for the API and the minimum browser version you target
before relying on a behaviour** (read-the-damn-docs); this skill marks
version-gated facts with the version that introduced them.

## The Mental Model

| Context | Lives | Can use | Cannot |
|---|---|---|---|
| Service worker (background) | Starts on events, stopped when idle | All permitted `chrome.*` APIs | DOM, `window`, `localStorage`, long-running timers |
| Extension pages (popup, side panel, options, offscreen) | While open | `chrome.*` APIs (offscreen: `runtime` only) | Remote code, inline script |
| Content script | Per page, per frame | DOM of the page; `runtime` messaging, `storage`, `i18n` | Most `chrome.*` APIs, page JS objects (isolated world) |
| Page main world (`world: "MAIN"`) | In the page | Page JS objects | Any `chrome.*` API; it is untrusted page code |

Everything privileged happens in the service worker or an extension page;
content scripts ask by message. Treat the web page — and anything a content
script reports from it — as **untrusted input** (untrusted-input-handling).

## Non-Negotiable Rules

1. **The service worker will die.** Chrome stops it after ~30 s idle, after
   a single event runs over 5 minutes, or when a `fetch()` takes over 30 s
   to respond. Globals vanish. Persist state to `chrome.storage`
   (`session` for ephemeral, `local` for durable) and rebuild on wake.
2. **Register every listener synchronously at the top level** of the worker
   script. A listener added after an `await` or inside a callback misses the
   event that woke the worker.
3. **No timers for scheduling.** `setTimeout`/`setInterval` die with the
   worker; use `chrome.alarms` (30 s minimum period). Check
   `alarms.get(name)` before `alarms.create(name, …)` — creating an existing
   name replaces it and resets its schedule.
4. **Least privilege.** Prefer `activeTab` + `scripting` over broad host
   permissions; move anything non-essential to `optional_permissions` /
   `optional_host_permissions` and request it from a user gesture. Broad
   hosts (`<all_urls>`) and sensitive permissions (`tabs`, `cookies`,
   `webRequest`, `downloads`) trigger slower, stricter store review.
5. **No remote code.** Everything executable ships in the package. No
   `<script src="https://…">`, no `eval`/`new Function` on fetched strings,
   no interpreter for fetched commands. Fetching *data* and config is fine.
   The extension-page CSP enforces `script-src 'self' 'wasm-unsafe-eval'`
   at minimum and refuses `'unsafe-eval'` at install.
6. **Validate every message.** Messages from content scripts can be forged
   by a compromised page; check `sender.id`, `sender.tab`, `sender.origin`,
   and validate the payload shape before acting. Never pass message data
   into `innerHTML`, `eval` or `scripting.executeScript` code strings.
7. **User-gesture APIs must be called synchronously** inside the gesture
   handler — `sidePanel.open()`, `permissions.request()`. One `await`
   before the call loses the gesture.

## High-Frequency Pitfalls

- **"Could not establish connection. Receiving end does not exist."** — the
  target has no listener: content script not injected in that tab (Chrome
  does not inject manifest content scripts into tabs that were already open
  at install/update), the tab is a restricted page (`chrome://`, the Web
  Store), or the worker/page was torn down. Catch it, and inject on demand
  with `scripting.executeScript` when appropriate.
- **"The message port closed before a response was received."** — an
  `onMessage` listener meant to reply asynchronously did not `return true`.
  An `async` listener returns a Promise, which only newer Chrome (148+,
  rolling out) treats as the response — keep `return true` + `sendResponse`
  for compatibility.
- **Keep-alive hacks** — pinging the worker with a 20 s `setInterval`, or
  opening a port and holding it, is fragile and a review smell. Design for
  termination instead; if a long task is genuine, use an offscreen document
  or split it into resumable steps keyed in storage.
- **Read-modify-write races on `chrome.storage`** — two contexts doing
  `get` → mutate → `set` lose updates. Serialise writes through one owner
  (the worker) or a promise queue; listen to `storage.onChanged` instead of
  polling.
- **Content scripts in framework-managed pages** — the host re-renders and
  removes your node. Inject once, re-inject only when absent (a
  `MutationObserver` check), and never reposition on every frame.
- **Hidden extension-page failures** — errors in the worker show only on
  `chrome://extensions` ("Errors" / "Inspect views: service worker"), not in
  the page console. Check there before guessing.

## Decision Points

| Need | Use |
|---|---|
| Act on the current tab when the user clicks | `activeTab` + `scripting.executeScript` |
| Always-on behaviour on known sites | Static `content_scripts` with narrow `matches` |
| Sites chosen at runtime | `optional_host_permissions` + `scripting.registerContentScripts` |
| Block/redirect/modify requests | `declarativeNetRequest` (blocking `webRequest` is not available to store extensions in Chrome MV3) |
| DOM APIs, clipboard, audio, `DOMParser` from background | Offscreen document (Chrome 109+, one at a time) |
| Persistent UI beside the page | Side panel (Chrome 114+); Firefox uses `sidebar_action` |
| Transient UI | Action popup (closes on blur — persist drafts) |
| UI inside the page | Content-script UI in a Shadow DOM root |
| Periodic work | `chrome.alarms` |
| Talk to a local app | Native messaging (`connectNative`) |

## How to Verify

- Load unpacked from the build output (`chrome://extensions`, Developer
  mode) and **reload the extension and the target tab** after every build —
  content scripts in open tabs are orphaned by a reload ("Extension context
  invalidated").
- Exercise termination: in `chrome://serviceworker-internals` or the
  extensions page, stop the worker, then trigger each feature from cold.
  A feature that only works while DevTools holds the worker open is broken.
- Automate with Playwright's persistent Chromium context
  (`--load-extension`); branded Chrome and Edge removed the side-loading
  flags, so use the bundled Chromium. Details in
  [references/testing-and-release.md](references/testing-and-release.md).
- Before submitting: walk the permission list and justify each one in a
  sentence; anything you cannot justify comes out.
- Firefox: run `web-ext lint` and `web-ext run` against the same source.

## Boundaries

- TypeScript tooling and typing → typescript-development (`@types/chrome`
  or `webextension-polyfill` types).
- React in popups/side panels → react-development; styling and Shadow-DOM
  CSS → frontend-development; a11y of injected UI →
  accessibility-development.
- Security review, threat modelling, supply chain → secure-development.
- Driving a browser to automate websites (not building an extension) →
  browser-automation; scraping → web-scraping-development.
- Electron/Tauri desktop shells → electron-development / tauri-development.
- E2E strategy and flake control → testing-development; screenshots of
  extension UI → ui-verification.

## Reference Index

| Load when the task involves... | File |
|---|---|
| manifest.json keys, permissions vs host permissions, optional permissions, `activeTab`, CSP, web-accessible resources, MV2→MV3 port | [references/manifest-and-permissions.md](references/manifest-and-permissions.md) |
| Service worker lifecycle, top-level listeners, alarms, state persistence, offscreen documents, keep-alive questions | [references/service-worker-lifecycle.md](references/service-worker-lifecycle.md) |
| Content scripts, isolated vs main world, injection, injected UI, popups and side panels | [references/content-scripts-and-ui.md](references/content-scripts-and-ui.md) |
| `runtime`/`tabs` messaging, ports, error strings, `chrome.storage` areas and quotas | [references/messaging-and-storage.md](references/messaging-and-storage.md) |
| Firefox, Edge and Safari differences; cross-browser manifests and polyfills | [references/cross-browser.md](references/cross-browser.md) |
| Testing (Playwright, unit), packaging, store submission and review | [references/testing-and-release.md](references/testing-and-release.md) |
