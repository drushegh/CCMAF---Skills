# Service Worker Lifecycle

Load when writing background logic, debugging "works for a while then
stops", scheduling work, or needing DOM APIs from the background.

## Termination Rules (Chrome)

The extension service worker is stopped when:
- it has been idle for **30 seconds** (no events, no extension API calls);
- a single event or API call runs for more than **5 minutes**;
- a `fetch()` response takes more than **30 seconds** to arrive.

What resets the idle timer (version-gated):
- Handling an event or calling an extension API (Chrome 110+; earlier only
  running event handlers counted).
- Messages from an offscreen document (Chrome 109+).
- Sending a message over a long-lived port (Chrome 114+; merely *holding*
  a port open no longer counts).
- Active WebSocket traffic (Chrome 116+).
- An active `runtime.connectNative()` connection (Chrome 105+); reconnect in
  `onDisconnect` or the worker will stop when the timers run out.
- An attached `debugger` session (Chrome 118+).

DevTools attached to the worker **keeps it alive**, which hides
lifecycle bugs. Test with DevTools closed.

## Shape of a Correct Worker

```js
// sw.js — every listener registered synchronously, at top level
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onStartup.addListener(ensureAlarms);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.runtime.onMessage.addListener(onMessage);
chrome.contextMenus.onClicked.addListener(onMenuClick);

async function onInstalled({ reason }) {
  // Context menus and default settings belong here (they persist).
  chrome.contextMenus.create({ id: "save-snippet", title: "Save as snippet",
                               contexts: ["selection"] });
  if (reason === "install") await chrome.storage.local.set({ settings: DEFAULTS });
  await ensureAlarms();
}

async function ensureAlarms() {
  // create() on an existing name replaces it and restarts the schedule
  if (!(await chrome.alarms.get("sync"))) {
    await chrome.alarms.create("sync", { periodInMinutes: 15 });
  }
}
```

- **Never** `await` something and then add a listener; the waking event is
  dispatched as soon as top-level code finishes.
- **No module-level caches that matter.** A `let cache = new Map()` is fine
  as an optimisation that is rebuilt on demand; it is a bug if correctness
  depends on it surviving.
- Initialisation that every handler needs: wrap in a lazily-created
  promise (`const ready = loadState();`) and `await ready` inside each
  handler.

## State Persistence

| Need | Store |
|---|---|
| Survives worker restart, cleared on browser restart/extension reload | `chrome.storage.session` (in memory, not exposed to content scripts by default) |
| Survives everything until uninstall | `chrome.storage.local` |
| Large or structured data, blobs | IndexedDB |
| Responses for offline | Cache Storage |

`localStorage`/`sessionStorage` do not exist in the worker. Write state
**as it changes**, not on a "shutdown" hook — there is no reliable one.

## Alarms

- Minimum period and delay: **30 seconds** (0.5 minutes) for packed
  extensions; shorter values are clamped with a warning. Unpacked
  extensions are not limited, so production timing differs from dev.
- Alarms may be cleared on browser restart or extension update depending
  on browser and version (Chrome 150 adds `persistAcrossSessions`; other
  browsers ignore it). Call `ensureAlarms()` from `onStartup` and
  `onInstalled` so they always exist.
- Alarms due while the machine sleeps do not catch up period by period;
  expect at most one late firing on wake (verify for your target browsers).
- For a deadline ("remind at 17:00"), store the target time and compare on
  each alarm instead of trusting the alarm to be precise.

## Keep-Alive: Don't, Mostly

Patterns like a 20 s `setInterval` calling `chrome.runtime.getPlatformInfo()`
or a port reconnect loop do keep the worker up, but they waste resources,
are brittle across versions, and look suspicious in review. Prefer:

1. **Make the work resumable** — record progress in `storage.session` and
   continue on the next event or alarm.
2. **Offscreen document** for work that needs a living page (audio,
   clipboard, DOM parsing, WebRTC). Its messages also keep the worker alive.
3. **An extension page the user has open** (side panel, options tab) can do
   long work itself; the worker need not.

Genuine long-lived connections (a WebSocket to your own service, native
messaging) are the legitimate exceptions — they extend lifetime by design.

## Offscreen Documents (Chrome 109+)

```js
async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({      // Chrome 116+
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")],
  });
  if (existing.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Parse saved HTML snippets into plain text",
  });
}
```

- Needs the `offscreen` permission. **One document at a time** per profile;
  creating a second throws, so always check first (guard concurrent callers
  with a shared in-flight promise).
- Only `chrome.runtime` is available inside; everything else goes through
  messages to the worker.
- Some reasons have lifetimes (`AUDIO_PLAYBACK` closes after 30 s of
  silence). Close it when done with `offscreen.closeDocument()`.
- Firefox has no offscreen API; event pages there already have a DOM.

## Debugging the Lifecycle

- `chrome://extensions` → your extension → "Inspect views: service worker"
  for the console; "Errors" for uncaught errors from all contexts.
- `chrome://serviceworker-internals` shows status and lets you stop the
  worker to test cold starts.
- Log `Date.now()` at top level to see each restart in the console.
