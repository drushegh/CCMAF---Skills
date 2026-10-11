---
name: windows-administration
description: >-
  Administering a Windows 11 / Windows 10 22H2 machine: services and their
  recovery, scheduled tasks, startup items, local users and groups, UAC and
  ACLs, Event Viewer and Reliability Monitor, Windows Update and pending
  reboots, winget packages, firewall and network profiles, where settings
  live (registry, Group Policy, ms-settings), and PowerShell 7 vs Windows
  PowerShell 5.1 admin idioms. Use whenever someone wants to look after or
  change a Windows PC: "what runs at startup", "stop this service", "make a
  scheduled task", "update everything with winget", "is a reboot pending",
  "add a local user", "who is an administrator", "open a firewall port",
  "where is this setting stored", "Get-Service", "sc.exe", "schtasks",
  "Register-ScheduledTask", "Get-WinEvent", "winget upgrade", "regedit",
  "gpedit". The Windows counterpart to linux-administration. Changes defer
  to safe-system-changes; crash and slowdown diagnosis to
  windows-diagnostics.
---

# Windows Administration

Looking after a **Windows desktop or laptop** the way a careful senior admin
would: inspect first, change little, record everything, and leave a way back.
Default context is a single personal or small-office machine running
**Windows 11 (23H2/24H2/25H2)** or **Windows 10 22H2**, administered locally
from PowerShell. Domain, Intune and server roles are out of scope except
where they explain why a setting will not stick.

Context (October 2026 — re-verify): Windows 10 reached end of support on
14 October 2025; only machines enrolled in Extended Security Updates still
get security fixes (the consumer ESU year ends 13 October 2026). Treat any
un-enrolled Windows 10 machine as unpatched and say so plainly. PowerShell 7.x
installs side by side with Windows PowerShell 5.1, which is still in-box and
still the only host for some cmdlets (`Checkpoint-Computer`,
`Get-ComputerRestorePoint`, `Get-EventLog`, `Get-WmiObject`).

## Non-negotiables

1. **Read before write.** Every task starts with an inventory query (what is
   the current state, what depends on it). No change is proposed until the
   current value has been captured.
2. **Every change goes through `safe-system-changes`.** Plan, dry-run
   (`-WhatIf` where supported), show the user exactly what will change,
   confirm, journal the before/after values, and state the revert command
   *before* running the change. This skill supplies the Windows mechanics;
   that skill owns the protocol.
3. **Never weaken the security baseline.** Do not disable UAC, Microsoft
   Defender, Windows Firewall, SmartScreen, Secure Boot, BitLocker or Windows
   Update, and do not suggest "temporarily" doing so to make something work.
   Find the specific exception instead (a firewall rule, a Defender exclusion
   the user explicitly asks for, a scoped permission).
4. **Elevate honestly.** Elevation happens through the normal consent prompt
   (`Start-Process pwsh -Verb RunAs`, an elevated terminal, or `sudo` on
   Windows 11 24H2+ when the user has enabled it). Never use UAC-bypass
   tricks, scheduled-task-as-SYSTEM workarounds or auto-elevation hacks.
5. **Never delete what you can disable.** Services go to `Manual` or
   `Disabled`, tasks are disabled, startup entries are toggled off — not
   removed. Removal is a separate, later, confirmed step once the disabled
   state has been lived with.
6. **Prefer the supported surface.** Settings app, documented cmdlets and
   documented tools (`winget`, `pnputil`, `powercfg`, `icacls`) before raw
   registry edits. When a registry edit is the only route, export the key
   first (`reg export`) and name the exact value.
7. **Know which shell you are in.** Check `$PSVersionTable.PSEdition`
   (`Core` = 7.x, `Desktop` = 5.1) before choosing cmdlets. Several admin
   cmdlets exist only in one of them — see
   `references/powershell-admin-idioms.md`.
8. **Leave evidence intact.** Never clear event logs, delete the Windows
   Update store, or wipe crash dumps as a "clean-up". They are the record
   needed when the next problem arrives.

## Decision tables

| Need | Reach for |
|---|---|
| Inspect services | `Get-Service` (7.x shows `StartupType`, `BinaryPathName`, `UserName`) or `Get-CimInstance Win32_Service` |
| Service recovery actions | `sc.exe qfailure <name>` to read; `sc.exe failure` to change |
| Recurring job | Scheduled task (`Register-ScheduledTask`), never a looping script in Startup |
| What runs at logon | Settings > Apps > Startup, Task Manager > Startup apps, then Run keys, Startup folders, logon-triggered tasks, auto-start services |
| Install / update apps | `winget` (inspect with `winget upgrade` before `--all`) |
| Pending reboot? | The three registry markers in `updates-and-packages.md` |
| Recent errors overview | Reliability Monitor (`perfmon /rel`) then `Get-WinEvent -FilterHashtable` |
| Restore point before a risky change | `Checkpoint-Computer` (5.1 only; once per 24 h by default) |
| Permissions on a folder | `icacls` (save ACLs first with `/save`) |
| Open a port | `New-NetFirewallRule` scoped to program, port, profile and remote address |
| Where a setting lives | `startup-and-settings.md` locations table |

## High-frequency pitfalls

- **`sc` in PowerShell is `Set-Content`.** Always type `sc.exe`. Similarly
  `where` is `Where-Object`; use `where.exe` for the binary.
- **Using `Get-WmiObject` / `Get-EventLog` in PowerShell 7** — they were
  removed. Use `Get-CimInstance` and `Get-WinEvent`.
- **Disabling a service by display name guesswork** — services have a
  short name (`Spooler`) and a display name (`Print Spooler`); confirm with
  `Get-Service` and check `-DependentServices` before stopping anything.
- **Setting a per-user `Path` with `setx`** — it truncates to 1024
  characters and flattens `%VAR%` references. Use
  `[Environment]::SetEnvironmentVariable` after saving the old value.
- **`winget upgrade --all` unattended** — can restart apps, trigger
  reboots and pull major versions; preview first, pin anything sensitive.
- **Editing `HKLM\SOFTWARE\Policies` by hand** — Group Policy, MDM or
  security software will overwrite it, or it silently disables a Settings
  page ("Some settings are managed by your organisation").
- **Expecting `gpedit.msc` / `secpol.msc` on Home edition** — they are
  Pro/Enterprise/Education tools.
- **Treating Event Viewer red as an emergency** — many errors are routine
  noise. Correlate with a symptom and a time before acting (see
  `windows-diagnostics`).
- **Restore point as the only undo** — it covers system files, drivers and
  registry, not user data, and Windows may have System Protection off.
  Check it is on, and keep the journal anyway.
- **Running everything elevated** — an elevated shell hides permission bugs
  and turns typos into damage. Elevate only the commands that need it.

## Workflow (any admin request)

1. **Identify the machine.** Edition, version and build
   (`Get-ComputerInfo -Property OsName,OsVersion,OsBuildNumber,WindowsVersion`
   or `winver`), PowerShell edition, whether elevated, whether managed (domain,
   Entra ID, MDM — `dsregcmd /status`).
2. **Inventory the target.** Current state plus dependants (services that
   depend on it, tasks that call it, apps that need it).
3. **Explain in plain words** what the thing is, what it does for the user,
   and what changing it would affect.
4. **Plan the change** with exact commands, the dry-run, the captured
   before-value and the revert command. Hand to `safe-system-changes` for
   confirmation and journalling.
5. **Apply, then verify** with the same query used in step 2. A change that
   was not re-read did not happen.
6. **Watch for side effects** at the next logon/boot when relevant (startup
   and service changes only show their effect after a restart).

## How to verify

- Services: `Get-Service <name> | Select-Object Name,Status,StartType` (5.1)
  or `...,StartupType` (7.x) after the change and after the next reboot.
- Tasks: `Get-ScheduledTaskInfo` shows `LastRunTime`, `LastTaskResult`
  (0 = success) and `NextRunTime`; run once on demand with
  `Start-ScheduledTask` to prove it works.
- Packages: `winget list --id <Id> -e` shows the installed version.
- Firewall: `Get-NetFirewallRule -DisplayName <name> | Get-NetFirewallPortFilter`
  and a real connection test (`Test-NetConnection -Port`).
- Updates: re-check the pending-reboot markers and the update history after
  restarting.
- Anything else: re-run the inventory query and diff it against the
  journalled before-value.

## Reference index

Load on demand:

- `references/services-and-tasks.md` — services (startup types, recovery,
  accounts, dependencies) and scheduled tasks (inspect, create, disable,
  result codes)
- `references/startup-and-settings.md` — every startup location, where
  settings live (registry hives, policies, ms-settings URIs, environment
  variables), restore points
- `references/users-uac-access.md` — local users and groups, UAC, elevation
  checks, ACLs with `icacls`, Microsoft vs local accounts
- `references/updates-and-packages.md` — Windows Update history and pending
  reboots, `winget` (preview, pin, export/import), drivers via Windows Update
- `references/event-logs-and-reliability.md` — Event Viewer from the admin
  side, log names, `Get-WinEvent` recipes, Reliability Monitor data
- `references/networking-and-firewall.md` — adapters, IP/DNS, network
  profiles, firewall rules, hosts file, proxy, remote access features
- `references/powershell-admin-idioms.md` — 7.x vs 5.1 differences that
  matter for admin work, elevation, CIM, native-tool quoting, transcripts

## Boundaries

- **Change protocol** (plan, dry-run, confirm, journal, revert) →
  `safe-system-changes`. This skill never applies a change without it.
- **Why did it crash / why is it slow** → `windows-diagnostics` (event
  triage, stop codes, dumps, performance counters, disk health).
- **Is this startup item / service / task suspicious** →
  `windows-security-hygiene` (signatures, persistence locations, Defender).
- **Making the machine faster** (startup trimming, power plans, debloat,
  registry tweaks) → `windows-performance-tuning`.
- **Capturing this setup as files and rebuilding it** →
  `machine-config-as-code` (winget configure, profile, terminal settings).
- **Writing robust PowerShell scripts and modules** →
  `powershell-development`; this skill uses PowerShell interactively.
- **WSL distros and Linux servers** → `linux-administration` /
  `linux-development`.
- **Unattended scheduled agent runs** → `scheduled-run-discipline`.
- **Building Windows desktop apps** → `windows-desktop-development`.
