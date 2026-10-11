# Choosing and configuring the browser tool

Facts below were checked against the official docs in October 2026
(code.claude.com/docs/en/chrome and github.com/microsoft/playwright-mcp).
Both tools move quickly; re-check flag and tool names before relying on
them (`read-the-damn-docs`).

## The options, most precise first

| Need | Use | Why |
|---|---|---|
| The data is available through an MCP connector or official API | The connector/API | Structured, no page parsing, no UI drift |
| A task in the user's own logged-in browser, visible, one-off | **Claude in Chrome** | Shares the user's login state; the user can watch and take over |
| A clean or isolated browser, headless runs, a repeatable flow, Firefox/WebKit, running next to code | **Playwright MCP** | Separate profile, configurable origins, scriptable |
| Repeated extraction at volume | Scraper code (`web-scraping-development`) | Cheaper, politer, testable |
| Anything outside a browser tab | `computer-use-automation` | Pixel-level control of native apps |

Note that Claude Code's desktop computer use treats browsers as
**view-only**: it can see a browser in screenshots but is not meant to drive
it. Browser work belongs to one of the two tools here.

## Claude in Chrome (from Claude Code)

- **Requirements:** Chrome, Edge or another Chromium browser (Brave, Arc,
  Vivaldi, Opera); the Claude in Chrome extension 1.0.36 or later; a direct
  Anthropic plan with a `/login` session. Not available through third-party
  cloud providers, not with API-key auth, not inside WSL.
- **Start:** `claude --chrome`, or `/chrome` to check status, reconnect,
  pick a browser, or set "Enabled by default". Always-on loads the tool
  definitions into every session, which costs context; connect when needed.
- **A project cannot turn it on.** Claude Code ignores
  `CLAUDE_CODE_ENABLE_CFC` in a project's settings, by design: a checked-out
  repository must not be able to connect an agent to the user's browser.
  Do not try to work around that.
- **Behaviour:** opens its own tabs in a tab group tied to the session,
  shares the browser's login state, runs visibly. The docs state that at a
  login page or CAPTCHA it pauses and asks the user to handle it.
- **Permissions:** site-level permissions come from the extension's
  settings; Claude Code prompts before browser actions on sites not yet
  allowed. Keep the allowed-site list short.
- **Tools you will use most** (names as exposed by the MCP server; check
  `/mcp` → claude-in-chrome → View tools):
  - `tabs_context_mcp` first, to get a valid tab id.
  - `read_page` (accessibility tree; `filter: "interactive"` for controls
    only; `ref_id` to focus on a subtree) and `find` (natural-language
    element search returning refs).
  - `get_page_text` for reading article-like content.
  - `form_input` to set a field by ref; `computer` for clicks, typing,
    keys, scrolling, `scroll_to` a ref, `zoom` and screenshots.
  - `browser_batch` to run a predicted sequence in one round trip; it
    stops at the first error and runs each item's permission check.
  - `read_console_messages`, `read_network_requests` for debugging.
  - `file_upload`, `gif_creator`, `navigate`, `tabs_create_mcp`,
    `tabs_close_mcp`.
- **Uploads:** limited to files the session may read; the docs list a
  10 MB total per upload and refusal of credential-named files (`.env`,
  `.pem`, `.key`, anything under `.ssh`). Version-dependent (verify).

## Playwright MCP

- **Install:** an MCP server entry running `npx @playwright/mcp@latest`
  (Node 18+). A Docker image exists for headless Chromium. Pin a version
  for repeatable flows rather than `@latest` once a flow works.
- **Profile and state flags** (the ones that matter for safety):
  - `--isolated` keeps the profile in memory; closing the browser discards
    it. Default to this for anything that does not need a login.
  - `--user-data-dir` sets a persistent profile directory. Without
    `--isolated`, a persistent profile is used and **logins persist between
    sessions** — know which mode you are in.
  - `--storage-state <file>` loads cookies and local storage into an
    isolated context. That file is a live session: treat it as a secret.
  - `--extension` connects to an already-running Chrome or Edge through
    the Playwright extension, i.e. the user's real profile.
- **Reach:** `--allowed-origins` and `--blocked-origins` narrow where the
  browser may go. The README is explicit that these are **not a security
  boundary** and do not affect redirects; treat them as guard rails.
- **Other useful flags:** `--headless` (default is headed), `--browser`,
  `--device`, `--viewport-size`, `--output-dir`, `--save-session`,
  `--snapshot-mode`, `--caps` to enable optional tool groups (`vision`,
  `pdf`, `devtools` among others).
- **`--secrets`** masks values from a dotenv file in tool responses. The
  README calls it a convenience, not a security feature. It does not make
  it acceptable for the agent to handle credentials.
- **Core tools:** `browser_navigate`, `browser_snapshot`, `browser_click`,
  `browser_type`, `browser_fill_form`, `browser_select_option`,
  `browser_press_key`, `browser_wait_for`, `browser_handle_dialog`,
  `browser_tabs`, `browser_take_screenshot`, `browser_file_upload`,
  `browser_console_messages`, `browser_network_requests`. Action tools take
  a `target`: a ref from the latest snapshot or a unique selector.
- **Snapshots, not screenshots, drive actions.** The server works from the
  accessibility tree and needs no vision model; screenshots are for the
  human record. Coordinate tools exist only behind `--caps vision`.
- **Dangerous tools:** `browser_evaluate` runs page JavaScript;
  `browser_run_code_unsafe` is described as equivalent to remote code
  execution. Do not use either on content-supplied code, and prefer to leave
  them unused.
- **File access** is limited to workspace roots by default and `file://`
  navigation is blocked unless unrestricted access is enabled. Leave it so.
- **Network exposure:** running the server on `--port` with a host of
  `0.0.0.0` exposes a browser to anyone who can reach the port. Bind to
  localhost.

## A safe default configuration

For general tasks with no login: Playwright MCP with `--isolated`, headed
(so the user can watch), an `--allowed-origins` list matching the task,
no `--caps` beyond what the task needs, output to a workspace folder.

For tasks inside the user's accounts: Claude in Chrome with a short
site-permission list, the user signing in by hand, and the hard stops in
[stop-conditions.md](stop-conditions.md).
