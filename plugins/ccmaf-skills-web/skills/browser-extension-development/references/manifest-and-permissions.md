# Manifest and Permissions

Load when writing or reviewing `manifest.json`, choosing permissions, setting
CSP, exposing resources to pages, or porting from Manifest V2.

## A Minimal, Honest MV3 Manifest

```jsonc
{
  "manifest_version": 3,
  "name": "Snippet Shelf",
  "version": "1.4.0",                     // 1-4 dot-separated integers; no "-beta"
  "description": "Save and insert text snippets.",
  "minimum_chrome_version": "116",        // set it when you rely on a gated API
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" },
  "action": { "default_title": "Snippet Shelf" },
  "background": { "service_worker": "sw.js", "type": "module" },
  "permissions": ["storage", "activeTab", "scripting", "alarms"],
  "optional_host_permissions": ["https://*/*"],
  "content_scripts": [{
    "matches": ["https://notes.example.test/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

Rules of thumb:
- **`version` is integers only**; use `version_name` for a display string
  such as "1.4 beta".
- **Set `minimum_chrome_version`** to the highest version any API you use
  requires (for example 116 for `runtime.getContexts`). Users on older
  browsers then cannot install a build that would fail at runtime.
- **`"type": "module"`** lets the worker use static `import`. Dynamic
  `import()` is not available in service workers — bundle or import
  statically.
- Keep the manifest in source as the single truth; if a build tool generates
  it, review the emitted file, not just the template.

## Permissions vs Host Permissions

| Key | Holds | Granted |
|---|---|---|
| `permissions` | API permissions (`storage`, `alarms`, `tabs`, `scripting`, …) | At install (some show warnings) |
| `host_permissions` | Match patterns for sites | At install in Chrome; users can restrict per site |
| `optional_permissions` / `optional_host_permissions` | Either kind, requested later | `permissions.request()` from a user gesture |

- **`activeTab`** grants temporary access to the current tab when the user
  invokes the extension (action click, context menu, keyboard shortcut). It
  shows no install warning and covers most "do something to this page"
  features. Access ends when the tab navigates away.
- **`tabs`** is only needed to read `url`/`title`/`favIconUrl` of arbitrary
  tabs. You can query and message tabs without it. Host permission for a
  site also exposes those fields for matching tabs.
- **`scripting`** is the injection API; it still needs host access (host
  permission or `activeTab`) for the target.
- **Users can withdraw host access at any time** (site access menu in
  Chrome, per-site controls in Firefox). Check with
  `permissions.contains()` before relying on it and degrade gracefully.
- Adding a permission that carries a warning in an update **disables the
  extension until the user re-approves**. Prefer optional permissions for
  new capabilities on an installed base.

## Content Security Policy

```jsonc
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
}
```

- Default for extension pages is `script-src 'self'; object-src 'self';`
  (WebAssembly off). The enforced minimum is
  `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';` — you can
  tighten it, not loosen it. `'unsafe-eval'` or remote script hosts fail at
  install.
- **No inline script** in popup/options/side-panel HTML: move
  `<script>…</script>` and `onclick="…"` into bundled files. Frameworks
  that inject inline scripts in dev mode need their extension-specific
  build plugin.
- **Sandboxed pages** (`"sandbox": { "pages": [...] }`) may use `eval` and
  inline script but get no extension APIs; talk to them with
  `postMessage`. This is the route for template engines that compile
  strings — still subject to the no-remote-code rule.
- Cross-origin `fetch` from a content script is treated as coming from the
  page's origin (CORS applies) in Chrome, and is not allowed in Firefox MV3
  — route such requests through the service worker/background, which uses
  your host permissions. Scripts injected into the main world run under the
  page's CSP.

## Web-Accessible Resources

Pages cannot load files from your package unless you list them:

```jsonc
"web_accessible_resources": [{
  "resources": ["ui/panel.css", "img/logo.svg"],
  "matches": ["https://notes.example.test/*"]
}]
```

Listing a resource lets any matching site detect that the extension is
installed (fingerprinting) and load the file. Expose the minimum, scope
`matches` narrowly, and never expose HTML pages that perform privileged
actions on load. Chrome's `use_dynamic_url` rotates the URL per session;
Firefox ignores it and already randomises the extension origin.

## Other Keys Worth Knowing

- `commands` — keyboard shortcuts; `_execute_action` opens the action.
  Suggested shortcuts can collide; users rebind at
  `chrome://extensions/shortcuts`.
- `options_ui` (`open_in_tab`), `side_panel.default_path`,
  `devtools_page`, `chrome_url_overrides` (one override per page type).
- `declarative_net_request.rule_resources` — static rule sets; enable or
  disable them at runtime with `updateEnabledRulesets`.
- `externally_connectable` — which sites or extensions may message you;
  without it, no web page can.
- `key` — pins the extension id for unpacked development (so OAuth redirect
  URLs and allowlists stay stable). Never commit the private signing key.

## Porting from MV2

| MV2 | MV3 |
|---|---|
| `background.page` / persistent scripts | `background.service_worker` (Chrome); event page `background.scripts` (Firefox) |
| `browser_action` / `page_action` | `action` |
| Host patterns inside `permissions` | `host_permissions` |
| `chrome.tabs.executeScript` / `insertCSS` | `chrome.scripting.executeScript` / `insertCSS` |
| Blocking `webRequest` | `declarativeNetRequest` (Chrome); Firefox still supports blocking `webRequest` |
| String CSP | Object CSP with `extension_pages` / `sandbox` |
| Remote code tolerated | Remote code banned |
| `localStorage` in background page | `chrome.storage` |
| DOM in background | Offscreen document |

Port the background first and test from a cold worker; most MV3 port bugs
are state that used to live in a never-dying background page.
