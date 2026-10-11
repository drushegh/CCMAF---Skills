# Plan and Dry-Run

The plan is the approval gate. A user who approves a plan they could not
understand has not consented to anything, so the plan is written for the
person, not for the agent.

## Inspect first (read-only)

Before planning, establish the facts the plan depends on. Typical read-only
probes on Windows:

```powershell
# OS, edition, build: decides which cmdlets and settings exist
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber, WindowsEditionId

# Am I elevated?
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)

# Current value of a registry setting (missing value is itself a finding)
Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name EnableTransparency -ErrorAction SilentlyContinue

# Service state and exact start type (sc.exe shows delayed start)
Get-Service -Name 'ExampleSvc' | Select-Object Name, Status, StartType
sc.exe qc ExampleSvc

# Scheduled task state
Get-ScheduledTask -TaskName 'ExampleTask' | Select-Object TaskName, State

# Installed package version
winget list --id Example.App --exact

# Is the setting managed by policy? (if so, a local edit will not stick)
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Example' -ErrorAction SilentlyContinue
```

Record what you found; the plan quotes these values as "current".

## The plan format

One block per change, numbered, in the order they will run:

```text
PLAN — run 2026-10-11-01 — goal: reduce boot time (user request, chat)
Restore point: will create "ccmaf run 2026-10-11-01" before change 1
Elevation: required for changes 2 and 3

1. [Low] Disable startup entry "ExampleUpdater" (HKCU Run key)
   Current: present, value "C:\Users\<user>\AppData\Local\Example\updater.exe"
   New:     value removed
   Backup:  reg export HKCU\...\Run → backups\2026-10-11-01\01-run.reg
   Undo:    reg add HKCU\...\Run /v ExampleUpdater /t REG_SZ /d "<captured value>" /f
   Verify:  value absent; Task Manager Startup tab no longer lists it
   Reboot:  no

2. [Medium] Set service "ExampleSvc" start type Automatic → Manual
   ...
```

Rules:

- **Plain words first, command second.** "Stop this updater starting with
  Windows" before `reg delete`.
- **Current value is quoted from inspection**, never assumed.
- **Undo is concrete**: a command with the captured value, or numbered steps.
- **Risk tier per change** (see SKILL.md) and the worst plausible outcome for
  Medium and High.
- **Out-of-scope items** you noticed go in a separate "Not doing" list for the
  user to decide on; they are never folded in silently.
- **Order by risk**: low-risk, easily verified changes first, so a problem
  shows early and with little to undo.

## Dry-run, per tool

Use the tool's own preview where one exists; show its output with the plan.

| Tool | Preview | Notes |
|---|---|---|
| PowerShell cmdlets with `SupportsShouldProcess` | `-WhatIf` | Not every cmdlet supports it, and third-party ones may ignore it; check `Get-Command X -Syntax` for `-WhatIf` |
| `winget install/upgrade` | `winget show --id X --exact`; `winget upgrade` (no args) lists what would change | No true dry-run; show the manifest and version delta instead |
| `robocopy` | `/L` | Lists only, copies nothing |
| `reg` | none | Show the `reg query` before and the exact `reg add` / `reg delete` line |
| `DISM` / `sfc` | `sfc /verifyonly`; `DISM /Online /Cleanup-Image /ScanHealth` | Scan modes are read-only; the repair modes are changes |
| `apt` | `apt-get -s install X` (simulate) | |
| `dnf` | `dnf install X --assumeno` | Shows the transaction, answers no |
| `rsync` | `-n` / `--dry-run` with `-v` | |
| `brew` | `brew install --dry-run X` (recent versions; check `brew help install`) | Version-dependent |
| Your own script | A `-WhatIf`/`--dry-run` switch that prints actions without performing them | Build it in from the start; see `powershell-development` / `bash-development` |

If no preview exists, the plan *is* the dry-run: every command written out with
its arguments resolved.

## Sizing a run

- Keep a run to one goal and roughly ten changes or fewer. A longer list is
  two runs, each with its own restore point decision.
- Separate "install software" from "change settings"; their undos differ.
- A change whose effect cannot be verified this session (needs a week of
  use) is labelled as such in the plan.

## When the user says "just do it"

Shorten the presentation, not the protocol. Show a compact table of the
changes with undo, take the restore point, journal everything. Speed comes
from batching confirmation of a *named* group of low-risk changes, never from
skipping backups or the journal.
