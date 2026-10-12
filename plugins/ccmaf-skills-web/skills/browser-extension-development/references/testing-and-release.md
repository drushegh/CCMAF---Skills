# Testing, Packaging and Store Review

Load when setting up tests, building a release, or preparing a store
submission.

## Test Layers

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest/Jest with a `chrome` mock (hand-rolled fakes or a maintained mock package) | Pure logic, message handlers, storage migrations |
| Integration (real browser) | Playwright persistent context with the unpacked build | Worker events, messaging, injection, UI |
| Manual | Loaded unpacked in each target browser | Gesture-bound APIs, permission prompts, store-like install |

Keep business logic in plain modules that take their dependencies
(storage, messaging) as parameters, so most tests need no browser and no
`chrome` global.

## Playwright Recipe (Chromium)

```ts
import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";

const extPath = path.resolve("dist");

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",                       // bundled Chromium; allows headless
      args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    await use(new URL(worker.url()).host);
  },
});
```

- Extensions need a **persistent context** and **Chromium**; branded Chrome
  and Edge removed the side-loading flags, so `channel: "chrome"` will not
  load your build.
- Open extension pages directly: `chrome-extension://${extensionId}/popup.html`
  or `sidepanel.html` — but a page opened in a tab is not the popup (no
  auto-close, different size, no gesture context). Test the logic there and
  the gesture-bound path (`sidePanel.open`, `permissions.request`) manually
  or through a real click on an in-page trigger.
- Test the cold path: evaluate in the worker
  (`worker.evaluate(...)`) to seed storage, then reload the page and
  assert behaviour after the worker restarts. Do not keep DevTools-like
  handles that hold the worker alive and mask lifecycle bugs.
- Serve test pages from a local server on a host your `matches` cover —
  `file://` URLs need the user-granted "Allow access to file URLs".
- Firefox: `web-ext run` for manual checks; real-browser automation of
  Firefox extensions is less mature — keep Firefox-specific behaviour thin
  and unit-tested.

## Builds

- One build output per target when manifests differ (`dist/chrome`,
  `dist/firefox`); generate manifests from one source with a per-target
  overlay rather than maintaining copies.
- **No remote code in the bundle**: no CDN script tags, no runtime-loaded
  JS. Check the output for `eval`, `new Function`, and remote `import`
  URLs, including inside dependencies (some analytics and UI libraries
  inject scripts).
- Minify if you like; **never obfuscate** — store policies forbid it.
  Keep source maps out of the package or make sure they contain no
  secrets; reviewers may ask for source for minified code (AMO requires
  readable sources plus build instructions when you ship generated code).
- Zip the *contents* of the build directory (manifest at the zip root).
- Bump `version` for every upload; stores reject a version that is not
  higher than the published one.

## Store Submission (Chrome Web Store first)

The dashboard's privacy section asks you to describe a **single purpose**,
justify **each permission** and host permission, declare whether you use
**remote code**, and disclose **what user data** you collect and how it is
used; a privacy policy URL is required when you handle user data. Answer
from the code, not from memory — reviewers compare the two.

What slows or fails review:
- Broad hosts (`<all_urls>`, `*://*/*`) and sensitive permissions (`tabs`,
  `cookies`, `webRequest`, `downloads`, `history`) without a clear need.
  Narrow `matches`, `activeTab`, and optional permissions shorten review.
- Remote code, obfuscation, or functionality reviewers cannot determine
  from the package.
- Unused permissions left in the manifest.
- Listing claims that do not match behaviour; keyword stuffing; a
  misleading name or icon.
- New developer accounts and large code changes get closer review. Most
  reviews take days; plan for longer, and do not time a launch to an
  approval.

After publishing, periodic re-review can warn (with a fix window) or remove
an item. Keep the permission justifications in the repo next to the
manifest so they stay true as code changes.

## Release Checklist

- [ ] Version bumped; changelog entry written.
- [ ] Manifest reviewed: every permission justified; unused ones removed;
      `minimum_chrome_version` / `strict_min_version` match the APIs used.
- [ ] Clean build from a fresh clone; zip contains only the build output.
- [ ] Cold-start test: fresh profile, install, use each feature with the
      worker stopped first.
- [ ] Update test: install the previous version, use it, upgrade, confirm
      stored data migrates and nothing needs re-approval unexpectedly.
- [ ] Tested in every target browser (Chrome, Edge, Firefox as applicable).
- [ ] Privacy disclosures and policy match current behaviour.
- [ ] Rollback plan: the previous package kept, and data migrations
      tolerate a downgrade or are additive.
