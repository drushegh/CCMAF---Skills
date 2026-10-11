# Services and scheduled tasks

Services are long-running background programs managed by the Service Control
Manager (SCM). Scheduled tasks are the Windows answer to cron and systemd
timers. Both are common places for software to hide, so inspect thoroughly
and change conservatively. All changes follow `safe-system-changes`.

## Inspecting services

```powershell
# PowerShell 7.x: StartupType, BinaryPathName, UserName are on the object
Get-Service | Where-Object Status -eq Running |
    Select-Object Name, DisplayName, StartupType, UserName

# Works in both 5.1 and 7.x, and includes the process ID
Get-CimInstance Win32_Service |
    Select-Object Name, State, StartMode, StartName, ProcessId, PathName

# Dependencies, both directions
Get-Service Spooler -DependentServices
Get-Service Spooler -RequiredServices

# Raw SCM view (note sc.exe, never bare sc)
sc.exe qc Spooler          # config: start type, binary, account, dependencies
sc.exe qfailure Spooler    # recovery actions
sc.exe queryex Spooler     # state and PID
```

In 5.1 the `ServiceController` object has `StartType` but not
`StartupType`/`BinaryPathName`/`UserName`; use `Win32_Service` there.

### Startup types

| Type | Meaning | Typical use |
|---|---|---|
| `Automatic` | Starts at boot | Core services the user needs at once |
| `AutomaticDelayedStart` | Starts shortly after boot | Non-urgent auto services (eases boot) |
| `Manual` | Starts on demand (by an app, a trigger or the SCM) | Most optional services |
| `Disabled` | Cannot start | Only when the user explicitly wants it off |

Many `Manual` services are **trigger-start** (start on a device arrival,
network change or group policy event). `sc.exe qtriggerinfo <name>` shows
the triggers. A trigger-start service showing as `Running` is normal.

### Service accounts

`LocalSystem` (most privileged), `LocalService` and `NetworkService` (reduced),
virtual accounts (`NT SERVICE\<name>`), or a named user. A third-party service
running as `LocalSystem` from a user-writable folder is a red flag — hand to
`windows-security-hygiene`.

## Changing services (via safe-system-changes)

```powershell
# Capture before-state for the journal
$before = Get-CimInstance Win32_Service -Filter "Name='ExampleSvc'" |
    Select-Object Name, State, StartMode, StartName, PathName

# Dry-run, then change
Set-Service -Name ExampleSvc -StartupType Manual -WhatIf
Set-Service -Name ExampleSvc -StartupType Manual

# Stop / start (check dependants first)
Stop-Service -Name ExampleSvc -WhatIf
Restart-Service -Name ExampleSvc

# Revert
Set-Service -Name ExampleSvc -StartupType Automatic
```

- `AutomaticDelayedStart` is accepted by `Set-Service` in PowerShell 7.x; in
  5.1 use `sc.exe config ExampleSvc start= delayed-auto` (the space after
  `start=` is required by `sc.exe`).
- Recovery actions: `sc.exe failure ExampleSvc reset= 86400
  actions= restart/60000/restart/60000//` restarts twice then gives up.
  Capture `sc.exe qfailure` first.
- **Do not disable** services you cannot name the purpose of. Microsoft
  services that look idle (`DcomLaunch`, `RpcSs`, `BrokerInfrastructure`,
  `CryptSvc`, `Winmgmt`, `EventLog`, `mpssvc`, `WinDefend`, `wuauserv`,
  `TrustedInstaller`) are load-bearing or security-relevant; leave them.
- `Remove-Service` exists in PowerShell 7.x only; `sc.exe delete` in both.
  Deleting a service is a removal — separate, later, confirmed, with the
  `sc.exe qc` output and the registry key
  `HKLM\SYSTEM\CurrentControlSet\Services\<name>` exported first.

## Inspecting scheduled tasks

```powershell
# Everything outside Microsoft's own tree, with last result
Get-ScheduledTask | Where-Object TaskPath -notlike '\Microsoft\*' |
    ForEach-Object {
        $i = $_ | Get-ScheduledTaskInfo
        [pscustomobject]@{
            Task       = "$($_.TaskPath)$($_.TaskName)"
            State      = $_.State
            Action     = ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join '; '
            RunAs      = $_.Principal.UserId
            LastRun    = $i.LastRunTime
            LastResult = '0x{0:X}' -f $i.LastTaskResult
            NextRun    = $i.NextRunTime
        }
    }

# Full definition, for the journal or a review
Export-ScheduledTask -TaskName 'ExampleTask' -TaskPath '\'
schtasks.exe /query /tn "\ExampleTask" /v /fo list
```

Common `LastTaskResult` values: `0x0` success, `0x41301` currently running,
`0x41303` has not yet run, `0x41306` terminated by user, `0x1` generic
failure from the action itself (read the program's own log). Task history
lives in `Microsoft-Windows-TaskScheduler/Operational`, which is **disabled by
default** on client Windows; enabling it is a (small) change.

## Creating and changing tasks

```powershell
$action    = New-ScheduledTaskAction -Execute 'pwsh.exe' `
               -Argument '-NoProfile -File "C:\Scripts\nightly-backup.ps1"'
$trigger   = New-ScheduledTaskTrigger -Daily -At 02:00
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable `
               -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U `
               -RunLevel Limited
Register-ScheduledTask -TaskName 'Nightly backup' -TaskPath '\Personal\' `
    -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

Rules:

- Put your own tasks in a folder (`\Personal\`) so they are easy to find and
  never mixed with `\Microsoft\`.
- Run with the **least** privilege: `-RunLevel Limited` unless elevation is
  genuinely required; never `SYSTEM` for convenience.
- `-StartWhenAvailable` catches runs missed while the machine was off (the
  equivalent of systemd's `Persistent=true`).
- Always set an `ExecutionTimeLimit`; a hung task otherwise blocks the next
  run.
- Logging: the script writes its own log; Task Scheduler only records exit
  codes.
- Disable rather than delete: `Disable-ScheduledTask -TaskName X -TaskPath Y`.
  Export the XML before `Unregister-ScheduledTask`; revert with
  `Register-ScheduledTask -Xml (Get-Content task.xml -Raw) -TaskName X`.
- Do not disable tasks under `\Microsoft\Windows\` (update orchestration,
  Defender, disk maintenance, the Reliability Analysis task) to "speed up"
  the PC — that belongs to `windows-performance-tuning` with its risk ratings.

The `ScheduledTasks` module works the same in 5.1 and 7.x.
