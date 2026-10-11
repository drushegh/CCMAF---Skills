# Safety tiers and permission profiles

The tier tells the owner how much trust the type asks for. The permission
profile is how that trust is enforced in Claude Code. The persona is how the
agent understands it. All three must agree.

## 1. The tiers (CCMAF-App workspace-types brief §6)

| Tier | May | Requires | Typical types |
|---|---|---|---|
| T0 read-only | Read files, logs and settings | Nothing changes | Audits, explainers, a "what is wrong with my PC" reader |
| T1 workspace writes | Change files inside its own workspace folder | Writes stay in the folder | Documents, research notes, data analysis, life admin |
| T2 system changes | Change the machine (registry, services, installs) | Restore point before the first change of a run, change journal in the workspace, confirmation per change unless the owner pre-approved that change kind | PC care, homelab |
| T3 external actions | Act on the outside world (send mail, post, buy, delete remote data) | Always confirmed | Personal assistant, some automation |

Untrusted-input rule: content from outside (mail, web pages, downloads,
other people's documents) can never trigger a T2 or T3 action on its own. Any
action it suggests needs the owner's confirmation.

## 2. Choosing the tier

Walk the persona's routine duties and take the highest tier any of them
needs:

1. Does any routine duty write outside the workspace folder? No → T0 or T1.
2. Does it write at all? No → T0.
3. Does any duty change system state (registry, services, drivers, installed
   software, system settings)? Yes → T2.
4. Does any duty send, post, buy, accept or delete something beyond this
   machine? Yes → T3.

Then ask whether that duty is truly routine. A PC-care type that installs
updates once a month might stay T2; a documents type that "occasionally emails
a draft" should not become T3. Drop the duty and let the owner do it.

T2 personas must follow `safe-system-changes`. T3 personas must follow
`untrusted-input-handling` and never act without confirmation.

## 3. Permission rule syntax (Claude Code, verified October 2026)

| Rule | Matches |
|---|---|
| `Bash(git status *)` | Commands starting `git status`. The space before `*` matters: `Bash(git diff*)` also matches `git diff-index` |
| `Bash(npm test:*)` | Same as `Bash(npm test *)`; `:*` is only recognised at the end |
| `PowerShell(Get-ChildItem *)` | PowerShell tool, same shape as Bash rules |
| `Read(./notes/**)` | Reads under `notes/` relative to the settings file's project |
| `Edit(./reports/**)` | Edits and writes under `reports/` (use `Edit`, not `Write`, for path rules) |
| `Read(~/Documents/*.pdf)` | Home-relative |
| `Read(//c/Users/**)` | Absolute path; Windows paths are normalised to `/c/...` |
| `WebFetch(domain:example.org)` | Fetches to that exact host; `*.example.org` for subdomains |
| `mcp__<server>__<tool>` | A specific MCP tool |

Evaluation order: **deny, then ask, then allow**; the first match wins and
specificity does not change the order. An allow rule cannot carve an
exception out of a deny rule. A bare tool name in `deny` (for example
`WebSearch`) removes the tool entirely.

Limits to state honestly: Bash and PowerShell rules match the command text.
They do not catch the same program called by another path, inside `sh -c`, or
a script that does the work itself. Argument-constraining patterns are
fragile. Treat the profile as guard rails plus a clear statement of intent,
not as a sandbox. Re-verify syntax against the current permissions page
before publishing (`read-the-damn-docs`).

## 4. Building the profile

1. List the persona's routine actions. Each becomes an `allow` only if a wrong
   call is harmless and reversible inside the workspace.
2. List legitimate but consequential actions. Each becomes an `ask`.
3. List what this type must never do. Each becomes a `deny`, written broadly.
4. Remove every allow that the default permission system already permits
   (reads in the working directory, Claude Code's built-in read-only commands).
   Shorter lists review better.
5. Check every entry against the tier.

The manifest cannot set `defaultMode`, `bypassPermissions`, hooks or env. It
only adds list entries, merged as a union into the workspace's
`.claude/settings.json`; existing entries are never removed and deny entries
are always kept.

## 5. Starter profiles by tier

Illustrative; adjust to the persona. Windows-first examples.

**T0, read-only explainer**

```json
{ "allow": [],
  "ask": [],
  "deny": ["Edit", "PowerShell(Remove-Item *)", "PowerShell(Set-*)", "Bash(rm *)"] }
```

(A bare `Edit` deny removes file editing entirely: right for T0, wrong for
anything that writes a report. If the type writes reports, deny by path
instead and allow `Edit(./reports/**)`.)

**T1, documents**

```json
{ "allow": ["Edit(./drafts/**)", "Edit(./notes/**)"],
  "ask": ["Edit(./final/**)"],
  "deny": ["PowerShell(Remove-Item *)", "Bash(rm *)", "Bash(curl *)", "Bash(wget *)"] }
```

**T2, PC care**

```json
{ "allow": ["PowerShell(Get-WinEvent *)", "PowerShell(Get-CimInstance *)", "Edit(./journal/**)"],
  "ask": ["PowerShell(Set-ItemProperty *)", "PowerShell(Stop-Service *)", "Bash(reg add *)", "Bash(winget install *)"],
  "deny": ["Bash(format *)", "Bash(reg delete *)", "PowerShell(Set-MpPreference *)", "Bash(bcdedit *)"] }
```

The deny on `Set-MpPreference` reflects a hard rule: no kit disables or
weakens security products. Nothing bypasses UAC.

**T3, personal assistant**

```json
{ "allow": ["Edit(./vault/**)"],
  "ask": ["mcp__mail__send_message", "mcp__calendar__create_event"],
  "deny": ["mcp__mail__delete_message"] }
```

(MCP tool names are placeholders; use the real server and tool names, and
remember connector tool names depend on how the connector is attached.)

## 6. Review-screen reading of a profile

The owner sees the lists verbatim. Read yours as a stranger: would you accept
"allow `PowerShell(*)`" from an unknown publisher? Prefer many narrow entries
over one broad one, and explain unusual entries in the description or the
persona.
