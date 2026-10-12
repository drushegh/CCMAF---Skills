# Messaging and Storage

Load when wiring communication between the worker, extension pages and
content scripts, or designing what is stored where.

## One-Off Messages

```js
// content script → worker
const reply = await chrome.runtime.sendMessage({ type: "snippet:save", text });

// worker → a content script in a specific tab (and optionally frame)
await chrome.tabs.sendMessage(tabId, { type: "snippet:insert", id }, { frameId: 0 });
```

```js
// receiver — reply asynchronously
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isTrustedSender(sender) || !isValid(msg)) return false;
  if (msg.type === "snippet:save") {
    saveSnippet(msg.text).then(
      (id) => sendResponse({ ok: true, id }),
      (err) => sendResponse({ ok: false, error: String(err) }),
    );
    return true;              // keep the channel open for sendResponse
  }
  return false;               // not handled here — let other listeners reply
});
```

- **`return true`** is the portable way to reply later. Returning a Promise
  from the listener is honoured from Chrome 148 (rolling out) and in
  Firefox; an `async` listener *always* returns a Promise, so in older
  Chrome it replies `undefined`/`null` immediately and may pre-empt another
  listener. Avoid `async` listeners for `onMessage` unless your minimum
  version supports Promise responses.
- Only the **first** listener to respond wins; design one handler per
  message type.
- From Chrome 146 (rolling out), a throw or rejected Promise in the
  listener rejects the sender's `sendMessage` with the error message — use
  `Error` instances. Do not depend on it across browsers; send explicit
  `{ ok: false, error }` replies.
- Chrome serialises messages as **JSON** (`undefined` → `null`, `Date` →
  string, `Map`/`Set`/class instances lose their type); Firefox uses
  structured clone. Send plain JSON-safe objects so both behave the same.
  Limit is 64 MiB in Chrome — send references (storage keys, blob URLs from
  extension pages) for big payloads.

## Common Errors

| Error | Usual cause | Fix |
|---|---|---|
| "Could not establish connection. Receiving end does not exist." | No listener in the target: content script not injected (pre-existing tab, restricted page, wrong frame), or the page was closed | Inject on demand; catch and treat as "not available here" |
| "The message port closed before a response was received." | Listener did not `return true` before replying async, or the receiving page unloaded | `return true`; keep the receiver alive until it replies |
| "Extension context invalidated." | Old content script after the extension reloaded/updated | Detect and shut the orphan down (see content-scripts-and-ui.md) |
| "Could not serialize message." | Non-serialisable value in a response | Send plain data |

## Long-Lived Ports

```js
// side panel or content script
const port = chrome.runtime.connect({ name: "panel" });
port.onMessage.addListener(render);
port.onDisconnect.addListener(() => { /* worker restarted or panel closed */ });
```

- Use for streams of messages and for **presence**: `onDisconnect` fires
  when the other end goes away (page closed, frame unloaded, `disconnect()`
  called, no `onConnect` listener). It can fire more than once when there
  are several receivers.
- A port does **not** keep the worker alive by existing; messages on it do
  (Chrome 114+). When the worker restarts, ports break — the page must
  reconnect on `onDisconnect` (with backoff) and re-send its state.
- Check `chrome.runtime.lastError` (or catch) in `onDisconnect` to clear
  the "Unchecked runtime.lastError" console noise.

## Trust Boundaries

- `sender.id === chrome.runtime.id` — the message is from your extension.
- `sender.tab` present — it came from a content script in that tab; the
  page may have influenced it. `sender.origin`/`sender.url` tell you which
  site.
- Content-script messages may be crafted by a hostile page: validate shape
  and size (a schema validator works well), allowlist message types, and
  never let a message choose a URL to fetch with your credentials, code to
  run, or a file to read without checks.
- Assume anything you send *to* a content script can be read by the page.
- Web pages can message you only through `externally_connectable`
  (`onMessageExternal`) — treat those as fully untrusted.

## chrome.storage Areas

| Area | Persistence | Quota (Chrome) | Content scripts |
|---|---|---|---|
| `local` | Until uninstall | 10 MB (`unlimitedStorage` lifts it) | Yes |
| `sync` | Synced via the browser account | ~100 KB total, 8 KB per item, 512 items; 120 writes/min, 1,800/hour | Yes |
| `session` | Memory; cleared on browser restart, extension reload/update/disable | 10 MB | No, unless `setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })` |
| `managed` | Set by enterprise policy, read-only | — | Yes |

- **`sync` writes fail when you exceed the rate limits** — batch, debounce
  and never write on every keystroke. Store settings in `sync`, content in
  `local`.
- **Values are JSON-serialised** — no `Date`, `Map`, `Blob`. Store ISO
  strings and plain objects; use IndexedDB for binary data.
- **Read-modify-write is not atomic.** Two contexts updating the same key
  (popup and worker, two tabs' content scripts) lose writes. Make one
  context the owner of each key and send it change requests by message, or
  serialise updates through a promise chain within one context; prefer one
  key per record over one giant array.
- **React to changes, don't poll:**
  `chrome.storage.onChanged.addListener((changes, area) => …)` reaches
  every context, including content scripts.
- **Version your stored schema** (`{ schemaVersion: 2, … }`) and migrate in
  `onInstalled` when `reason === "update"`.
- Never store secrets in `sync`; treat `local` as readable by anyone with
  access to the profile.
