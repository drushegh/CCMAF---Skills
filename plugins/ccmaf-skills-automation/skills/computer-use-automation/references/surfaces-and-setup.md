# Surfaces, setup and approval

Checked against the official docs in October 2026
(code.claude.com/docs/en/computer-use, code.claude.com/docs/en/desktop,
platform.claude.com computer-use tool page). Computer use is a research
preview on the Claude Code surfaces; plans, platforms and controls change.
Re-check before relying on any detail (`read-the-damn-docs`).

## The three surfaces

| | Claude Code CLI | Claude Desktop app | Claude API toolset |
|---|---|---|---|
| Runs on | The user's Mac | The user's Mac or Windows PC | Your own VM or container (you supply screenshots and execute actions) |
| Plan | Pro or Max (not Team/Enterprise) | Pro or Max (not Team/Enterprise) | API usage (metered: optional, never required by this skill) |
| Enable | `/mcp` → `computer-use` → Enable (persists per project) | Settings → This computer → System → Enable computer use | `{"type": "computer_toolset_20260801"}` in `tools` |
| Interactive only | Yes (not with `-p`) | Desktop app must be running | You decide |
| Best for | Supervised GUI steps inside a coding task | Supervised everyday desktop tasks | Sandboxed, repeatable, or unattended loops |

Linux desktop is not supported on the Claude Code surfaces at the time of
writing (verify). For the API, the docs' reference implementation is a
Docker container running a virtual desktop.

## macOS permissions

The CLI and Desktop app on macOS need **Accessibility** (click, type,
scroll) and **Screen Recording** (see the screen). Grant both when
prompted; a restart of the requesting app may be needed after Screen
Recording. On Windows, the Desktop toggle takes effect immediately per the
docs.

These are significant permissions. Tell the user what they are for and
that they can be revoked in System Settings → Privacy & Security.

## Per-app approval

Enabling computer use does not grant every app. The first time an app is
needed in a session, the user is asked to **Allow for this session** or
**Deny**, with the list of apps, any extra permissions (such as clipboard)
and how many other apps will be hidden.

Control tiers are fixed by app category (Desktop docs):

| Tier | Can | Applies to |
|---|---|---|
| View only | See it in screenshots | Browsers, trading platforms |
| Click only | Click and scroll; no typing or shortcuts | Terminals, IDEs |
| Full control | Click, type, drag, shortcuts | Everything else |

Apps with broad reach carry an extra warning: terminals and IDEs
("equivalent to shell access"), Finder or File Explorer ("can read or write
any file"), System Settings ("can change system settings"). The Desktop app
also has a **Denied apps** list; the docs warn that a denied app can still
be affected indirectly through an allowed one.

Agent rules on approvals:

- Ask for the smallest set of apps the task needs, and say why each is
  needed.
- Do not request a terminal, IDE or file manager to do something the shell
  or file tools can do directly.
- Never ask to approve a password manager, banking app, messaging app or
  security product unless that app is the task, and then expect hard stops
  inside it.

## How a session behaves

- **One session at a time** holds the computer-use lock, from its first
  action until the session exits.
- **Other apps are hidden** while the agent works and restored when the
  turn ends. In the CLI the terminal stays visible but is excluded from
  screenshots, so on-screen output cannot feed back to the model.
- **Screenshots are downscaled** automatically on the Claude Code surfaces;
  there is no setting for the target size. If text is too small, enlarge
  it in the app.
- **Stopping:** in the CLI a notification says computer use is active and
  that pressing `Esc` stops it; `Esc` anywhere aborts the current action
  (the key press is consumed so on-screen content cannot use it), or
  `Ctrl+C` in the terminal. In the Desktop app the general stop controls
  apply. Tell the user how to stop before a long task.

## The API toolset (for sandboxed loops)

Only relevant when building or running your own agent harness; it is
metered, so it is an optional route, never a requirement.

- Current toolset: `computer_toolset_20260801`, no beta header, 17 member
  tools: `screenshot`, `zoom`, `left_click`, `right_click`, `middle_click`,
  `double_click`, `triple_click`, `left_click_drag`, `mouse_move`,
  `left_mouse_down`, `left_mouse_up`, `cursor_position`, `scroll`, `type`,
  `key` (with `repeat`), `hold_key`, `wait`. Earlier versions
  (`computer_20251124`, `computer_20250124`) need beta headers and only
  work with older models; Claude 5.5-generation models on the Claude API
  accept only the toolset.
- The harness must run every `tool_use` block in order, stop at the first
  failure, and answer the rest with the documented "Not executed" text.
- The docs' security guidance, which this skill adopts as defaults: a
  dedicated VM or container with minimal privileges; no access to sensitive
  data such as account logins; internet limited to an allowlist of domains;
  a human confirms anything with real-world consequences or needing
  affirmative consent (cookies, payments, terms).
- Prompt-injection classifiers scan tool results such as screenshots and
  flag likely injections. The docs say the precautions above remain
  important with classifiers in place; do not treat them as the defence.
- Data: computer use is client-side; screenshots and logs live in your
  environment. Store them as you would any screen recording.

## Which surface for which job

- A two-minute supervised fix in a native app: Desktop or CLI on the
  user's machine.
- Testing your own app build from a coding session: CLI (macOS) or Desktop.
- Exploring unknown software, opening untrusted files, long or overnight
  runs: a VM, with the API toolset or a Desktop session inside the VM, and
  nothing of value signed in.
