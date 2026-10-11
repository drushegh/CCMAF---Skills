# Sessions and logins without storing credentials

The rule: **the agent never holds a credential.** The user authenticates; the
agent works inside the session the user created and leaves it as it found
it. Everything below is how to make that practical.

## What counts as a credential

Passwords, passphrases, PINs, one-time codes (SMS, app, email), recovery
codes, security-question answers, passkey prompts, API keys and tokens,
card numbers and CVVs, bank account and sort-code details entered to
authenticate or pay, and session artefacts that act as a login: cookie
exports, Playwright storage-state files, browser profile folders.

The agent does not type, paste, read aloud, summarise, save, log or
screenshot-and-keep any of these. If one appears on screen (a recovery code
page, an API key reveal), do not transcribe it; tell the user it is there.

## The hand-over pattern

```text
Agent navigates to the sign-in page
  → stops: "Please sign in in the browser window. Tell me when you're done."
  → user signs in (including 2FA, passkey, CAPTCHA)
  → user says done
  → agent re-reads the page and confirms it is signed in as expected
  → agent continues the task
```

- With Claude in Chrome, the docs state Claude pauses at login pages and
  CAPTCHAs and asks the user to handle them. Still say what you need in
  plain words: which site, why, and what you will do once signed in.
- With Playwright MCP, run headed so the user can see and use the window.
  A headless browser cannot be signed into by a person.
- Confirm the identity after sign-in if it matters ("signed in as the
  account ending …@example.com, is that the right one?"), but do not read
  out more account detail than needed.

## Choosing the profile

| Situation | Profile |
|---|---|
| No login needed | Isolated / in-memory (Playwright MCP `--isolated`) |
| One-off task in the user's own accounts | The user's browser via Claude in Chrome |
| A repeated task in one account, user signs in each time | Isolated, user signs in at start |
| A repeated task where the user explicitly wants the login kept | A dedicated persistent profile for that task only, never the user's main profile, stored outside synced and shared folders |

A persistent automation profile is a logged-in browser on disk. Anyone or
anything that can read the folder can act as the user. Name it, tell the
user where it is, and tell them how to delete it.

## Storage-state files

Playwright can save and load cookies and local storage (`--storage-state`,
and the storage tool group's `browser_storage_state` /
`browser_set_storage_state`). Rules if the user chooses to use one:

- It is a secret. Never commit it, never put it in a synced or shared
  workspace folder, never attach it to a report.
- Keep it outside the repository or add it to `.gitignore` before it is
  created.
- It expires. A run that fails because the session lapsed stops and asks the
  user to sign in again; it does not try to log in by itself.
- Delete it when the task series ends, and say so.

## Things never to do

- Ask the user to paste a password or code into the chat "so I can enter
  it". Decline even if the user offers; ask them to type it into the
  browser themselves.
- Store credentials in `.env`, config files, notes, memory or task boards
  for later runs.
- Use the browser's saved-password manager on the user's behalf, read its
  contents, or open its settings pages.
- Create accounts, reset passwords or change security settings (2FA,
  recovery email, trusted devices) unless the user is driving and has asked
  for exactly that, and even then the user types every secret.
- Grant OAuth consent ("Allow this app to access your account") without
  the user reading the scope.
- Bypass a sign-in by any other route (URL tricks, cached tokens, another
  user's session).

## Sessions in the user's real browser

Working in the user's own Chrome means acting with their full identity.

- Stay within the sites the task named. Being signed into a mail account
  does not make the mailbox part of a price-comparison task.
- Do not sign out of, or into, other accounts in that browser.
- Close the tabs the agent opened at the end (Claude Code closes the
  session's tab group on `/clear` and in some exit paths; check rather than
  assume).
- Leave settings pages alone unless changing a setting is the task, and then
  it is a confirmed action.

## Scheduled and unattended runs

An unattended run cannot hand over a login. If it needs one, it either uses
a session the user deliberately left for it (a dedicated profile, stated in
the run contract) or it stops and reports "needs sign-in". It never stores
or replays credentials to get round the problem (`scheduled-run-discipline`).
