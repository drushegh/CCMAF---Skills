# Targeting elements and waiting for state

Most failed browser runs fail in one of two ways: the agent acted on the
wrong element, or it acted before the page was ready. Both are avoidable.

## Target by meaning, not position

Order of preference:

1. **A ref from a fresh accessibility read.** `read_page` / `find` (Claude
   in Chrome) or `browser_snapshot` (Playwright MCP) return elements with
   role, accessible name and a reference. Act on the ref.
2. **Role plus accessible name.** "button 'Download statement'",
   "textbox 'Postcode'". Stable across restyles, and what a screen-reader
   user hears.
3. **A unique, purpose-named attribute** (`data-testid`, `name`, `id` that
   reads like a word) when passing a selector to Playwright MCP.
4. **Visible text** for links and buttons, scoped to a region if the text
   repeats ("the 'Edit' link in the row for order 1047").
5. **Coordinates from a screenshot**: last resort, for canvas widgets or
   controls with no accessible name. Take a screenshot immediately before,
   aim for the centre, and verify after.

Avoid: generated class names (`css-1x9z3k`), deep positional paths
(`div > div:nth-child(3) > span`), and anything that only works at the
current window size.

## Disambiguation

- `find` returns up to 20 matches; if there are more, narrow the query
  rather than guess.
- When several elements share a name ("Delete" on every row), identify the
  container first (the row, card or dialog), then the control inside it.
  `read_page` with `ref_id` reads one subtree.
- If two candidates remain equally likely, ask the user. A wrong click on
  "Remove" is worse than a question.

## Refs go stale

A ref describes the page at the moment it was read. Re-read after:

- any navigation or URL change;
- opening or closing a modal, drawer, menu or accordion;
- submitting a form or applying a filter;
- infinite scroll loading more items;
- anything that re-renders a list (sorting, pagination, live updates).

If an action reports "element not found" or hits the wrong thing, the first
fix is a fresh read, not a different selector strategy.

## Wait for proof, not for time

The page is ready when the thing you need is present and stable, not after
N seconds.

| Waiting for | How |
|---|---|
| A result to appear | Wait for its text or element (`browser_wait_for` with `text`; or re-read until `find` returns it) |
| A spinner or "Loading…" to go | Wait for that text to be gone (`textGone`) |
| A navigation to finish | Check the URL and page title changed, then read |
| A download or upload | Look for the page's own confirmation, then check the file |

Rules:

- Bound every wait (seconds, not minutes) and re-read when it ends,
  whatever happened.
- A short fixed wait (Claude in Chrome `computer` `wait`, max 10 s per call)
  is acceptable only to let an animation settle before a screenshot, never
  as the readiness check itself.
- Long-polling and analytics traffic mean "network idle" may never arrive;
  wait on content instead.

## Single-page apps

- The URL may change without a page load, or not change at all. Verify by
  content.
- Inputs bound to a framework may ignore a value set programmatically.
  If `form_input` sets a value but the form still says the field is empty,
  type into the field instead (click, then type), and confirm the app shows
  the value.
- Virtualised lists only render visible rows. Scroll the container (or use
  `scroll_to` with a ref) and re-read; do not assume the tree contains every
  row.

## Frames, shadow DOM, new tabs

- Content inside iframes and shadow roots may or may not appear in the
  accessibility read depending on the tool and version (verify). If an
  element is visible in a screenshot but missing from the tree, it is
  probably in a frame; try `find`, then coordinates as a last resort.
- Links that open new tabs: check the tab list (`tabs_context_mcp`,
  `browser_tabs`) and switch deliberately. Close tabs you opened when done.
- Payment fields are often cross-origin iframes. That is a stop condition
  anyway ([stop-conditions.md](stop-conditions.md)).

## Dialogs and overlays

- JavaScript `alert`/`confirm`/`prompt` block the page. Playwright MCP:
  `browser_handle_dialog`. Claude in Chrome: the docs advise the user
  dismiss it manually, then continue.
- A `confirm` dialog asking "Are you sure you want to delete…" is an
  irreversible-action gate: the user decides.
- Overlays (newsletter pop-ups, chat widgets) can intercept clicks. Close
  them with their close control; do not sign up to anything to make them go
  away.

## Batching

Batch only what you can predict, and end every batch with a read or
screenshot so the next decision is made on fresh state. Claude in Chrome's
`browser_batch` runs items in order and stops at the first error; any
coordinates in a batch refer to the screenshot taken before the batch. Never
put a submit, send or purchase inside a batch: those are single, confirmed
actions.

## Typing

- Clear a field before typing into it (select all, then type) unless
  appending is intended.
- After typing, read the field back. Autocomplete and input masks change
  what was typed.
- Press Enter only when submitting is the intent; in many forms Enter
  submits.
- Never type a password, one-time code or card number
  ([sessions-and-logins.md](sessions-and-logins.md)).
