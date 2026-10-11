# Schedulers and launch

Where a run executes decides what it can see, how it is permissioned and how
it is billed. The behaviour rules do not change; the wiring does.

Facts below were checked against code.claude.com/docs in October 2026
(pages: scheduled-tasks, headless, permissions). Claude Code changes quickly:
**re-verify flags, limits and billing before relying on them**
(`read-the-damn-docs`).

## 1. The options

| | Cloud routine | Desktop scheduled task | `/loop` and cron tools | `claude -p` from the OS scheduler |
|---|---|---|---|---|
| Runs on | Anthropic-managed cloud | Your machine (Claude Desktop) | Your machine, inside an open session | Your machine, no session |
| Machine must be on | No | Yes | Yes, and the session open | Yes |
| Sees local files | No (fresh clone of a repository) | Yes | Yes | Yes |
| Minimum interval | 1 hour | 1 minute | 1 minute | Whatever the OS scheduler allows |
| Permission prompts | None (runs autonomously) | Configurable per task | Inherits from the session | Set by flags and settings |
| Lifetime | Durable | Durable | Recurring tasks expire after 7 days | Durable |
| Created with | `/schedule` | Claude Desktop | `/loop`, or ask Claude to schedule | Task Scheduler / cron calling `claude -p` |

Choosing:

- Needs local files or local tools (PC care, a notes vault on disk) → desktop
  scheduled task, or `claude -p` from the OS scheduler.
- Works on a repository and should run with the machine off → cloud routine.
  Write results into the repository (commit to a branch) and remember the
  clone is fresh each time: state must be committed to persist.
- Polling something during a working session → `/loop`. Not a durable
  schedule.

## 2. Permissions for unattended runs

The goal: anything the contract grants runs without asking; anything else is
**denied**, not left waiting for an answer that will never come.

- **Allow list, narrowly.** Pre-approve only the tools and command prefixes
  the contract needs, in the workspace's `.claude/settings.json` or via
  `--allowedTools`. Rule syntax: `Bash(git status *)`, `PowerShell(Get-ChildItem *)`,
  `Read(./inbox/**)`, `Edit(./runs/**)`, `WebFetch(domain:example.org)`. The
  space before `*` matters; `:*` at the very end is an equivalent form.
- **Deny the dangerous.** Deny rules are evaluated first and an allow rule
  cannot carve an exception out of one. Deny broad destructive commands even if
  the contract never mentions them.
- **Do not prompt.** For `claude -p`, `--permission-mode dontAsk` denies every
  call that would otherwise prompt, while allow-listed calls still run.
  `--permission-prompts none` (v2.1.259 or later) additionally tells Claude that
  nobody can approve and not to retry. In a `-p` run with no permission host,
  unapproved calls are denied either way.
- **Never `bypassPermissions`** for a scheduled run on a real machine. The
  docs reserve it for isolated containers or VMs.
- **Auto mode** (a classifier reviews actions) is a judgement call, not a
  grant. For a schedule, an explicit allow list plus `dontAsk` is easier to
  review and predict.

Bash and PowerShell rules match command text; they do not stop a script that
does the same thing indirectly. For hard guarantees use the sandbox or OS
permissions, and keep the grant small.

## 3. `claude -p` from the OS scheduler: shape

A sketch, not a drop-in (Windows Task Scheduler running PowerShell). Paths are
placeholders:

```powershell
Set-Location 'D:\Workspaces\my-pc'
claude -p (Get-Content -Raw '.\schedules\weekly-health.md') `
  --permission-mode dontAsk `
  --output-format json |
  Out-File -Encoding utf8 ".\runs\last-launch.json"
```

- The prompt lives in a file in the workspace (reviewable, versioned), not in
  the Task Scheduler action.
- `--output-format json` gives the launcher a `result`, a `session_id` and a
  client-side cost estimate to record. The run's own summary is still the
  record.
- Exit code is 0 on success and non-zero on failure; the launcher can log it.
- `--max-budget-usd` exists as a spend cap; it is meaningful on API billing.
- `--bare` skips hooks, plugins, skills and `CLAUDE.md` discovery and does
  **not** use the subscription login (it needs `ANTHROPIC_API_KEY`). A
  workspace run usually wants its persona, plugins and skills, so `--bare` is
  usually wrong here, and it would introduce a paid-API dependency.
- Without `--bare`, a `-p` run executes the project's hooks and MCP servers
  with no trust dialog. Only schedule runs in folders whose `.claude/` and
  `.mcp.json` you trust.

Writing the Task Scheduler or cron entry itself: `powershell-development`,
`bash-development`.

## 4. Billing (date-stamped, re-verify)

- Cloud routines are documented as drawing subscription usage like
  interactive sessions.
- Desktop scheduled tasks and `/loop` run in Claude Code on your machine.
- Whether an app or OS scheduler driving `claude -p` on a subscription is
  covered, and on what terms, must be checked against current Anthropic
  documentation at the time. Do not assume.
- No skill or schedule may require an API key or metered service. Paid
  options are opt-in and labelled.

Whatever the path, schedules share the owner's usage limits. Pace with
`stay-within-limits`: small runs, a usage check before heavy work, and a
schedule time that does not collide with the owner's working hours.

## 5. Jitter and timing

Claude Code shifts session-scoped scheduled tasks by design (recurring tasks
run up to half the interval late, capped at 30 minutes; one-shots on `:00` or
`:30` can run up to 90 seconds early). Do not write contracts that depend on
exact minutes. If timing matters, schedule off the hour and make the run
check "is it still relevant?" before acting.
