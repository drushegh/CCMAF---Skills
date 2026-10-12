# Cross-Browser: Firefox, Edge, Safari

Load when an extension must run outside Chrome, or when porting one in.
Build Chrome-first, but keep the differences below in mind from day one —
retrofitting is harder than designing for them.

## Namespace and Promises

- Firefox exposes `browser.*` with Promises (and `chrome.*` as an alias).
  Chrome MV3 APIs return Promises when the callback is omitted; Chrome
  also exposes the `browser` namespace from Chrome 148 (verify for your
  minimum version).
- For older Chrome targets, Mozilla's `webextension-polyfill` gives you
  `browser.*` everywhere. Pick one style per codebase and wrap the few APIs
  that differ behind your own small module.

## Firefox

| Area | Firefox behaviour |
|---|---|
| Background | **No `background.service_worker`** in MV3. Uses event pages: `background.scripts` (non-persistent, with a DOM). Same discipline applies — top-level listeners, state in storage, alarms not timers. |
| Cross-browser background | Declare both: `"background": { "scripts": ["sw.js"], "service_worker": "sw.js" }`. Chrome 121+ ignores `scripts` in MV3 (older Chrome refuses to load the manifest); Firefox 121+ uses `scripts`. The shared file must not rely on DOM or on `self.registration`. |
| Add-on id | `browser_specific_settings.gecko.id` (e.g. `"snippet-shelf@example.test"`) is required to sign and publish MV3. Set `strict_min_version` too. |
| Data collection | New add-ons (from November 2025) must declare `browser_specific_settings.gecko.data_collection_permissions` — `none`, or the required/optional categories collected; shown at install. |
| Host permissions | Shown and granted at install from Firefox 127 (earlier MV3 builds treated them as opt-in). Users can revoke them at any time, and updates that add hosts are not prompted — always check `permissions.contains()` and request when missing. |
| Content scripts | Xray vision instead of a strict isolated `window`; `onclick` property assignments collide with the page's; relative URLs in `fetch` must be absolute; cross-origin fetch from content scripts is not allowed in MV3 — do it in the background. |
| Messaging | Structured clone, not JSON — so code tested only in Firefox may send values Chrome mangles. Test in Chrome. |
| Requests | Blocking `webRequest` still supported in MV3; `declarativeNetRequest` also available. Chrome store extensions only get DNR. |
| UI | `sidebar_action` / `sidebarAction` instead of `side_panel` / `sidePanel`. No `offscreen` API (the event page has a DOM). |
| Web-accessible resources | `moz-extension://<random-UUID>/` per install; `use_dynamic_url` not supported. Never hard-code an extension origin. |
| Background dialogs | No `alert`/`confirm`/`prompt` in background pages. |
| Lifecycle | On navigation, Chrome destroys content scripts (and re-injects on back/forward cache restore); Firefox keeps the script injected while page window properties are destroyed. |
| Tooling | `web-ext lint`, `web-ext run` (auto-reload), `web-ext build`, `web-ext sign` for self-distribution. |

## Edge

- Chromium-based: the same MV3 package generally runs unchanged, including
  `chrome.*` APIs. Check any API gated by a recent Chrome version against
  Edge's release, and test features that depend on Google services
  (`identity.getAuthToken` relies on a Google account — use
  `identity.launchWebAuthFlow` for portable OAuth).
- Published separately through Microsoft Partner Center (Edge Add-ons),
  with its own review, listing, and privacy-policy requirements; extension
  ids differ from the Chrome Web Store build, so allowlists keyed on the id
  (OAuth redirect URIs, `externally_connectable` peers) need both.
- Branded Edge, like branded Chrome, removed the command-line flags for
  side-loading unpacked extensions — automate tests with Chromium.

## Safari

- Safari Web Extensions are packaged inside a native app built with Xcode
  (`xcrun safari-web-extension-converter` bootstraps one from an existing
  extension) and distributed through the App Store; this needs Apple
  developer tooling on macOS.
- Uses event pages by default (`background.scripts`), like Firefox; API
  coverage lags Chrome — check each API's compatibility table on MDN
  before relying on it.

## Cross-Browser Checklist

- [ ] Background declares `scripts` and `service_worker`; the shared file
      avoids DOM and worker-only globals.
- [ ] `browser_specific_settings.gecko` has `id`, `strict_min_version` and
      `data_collection_permissions`.
- [ ] All messages are plain JSON-safe objects.
- [ ] Host access is checked at runtime, not assumed from the manifest.
- [ ] No hard-coded `chrome-extension://` or `moz-extension://` URLs —
      `runtime.getURL()` everywhere.
- [ ] Side panel vs sidebar behind a small adapter.
- [ ] Event handlers via `addEventListener`, never `on*` properties, in
      content scripts.
- [ ] Ran in each target browser from a cold start, not only Chrome.
