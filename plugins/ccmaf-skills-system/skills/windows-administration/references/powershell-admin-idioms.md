# PowerShell admin idioms

Interactive admin use of PowerShell on Windows. Script and module
engineering (Pester, PSScriptAnalyzer, signing, module layout) belongs to
`powershell-development`.

## Which PowerShell am I in?

```powershell
$PSVersionTable.PSVersion; $PSVersionTable.PSEdition   # 'Core' = 7.x, 'Desktop' = 5.1
(Get-Process -Id $PID).Path                           # pwsh.exe or powershell.exe
```

PowerShell 7 (`pwsh.exe`, `C:\Program Files\PowerShell\7`) runs side by side
with Windows PowerShell 5.1 (`powershell.exe`). Use 7.x by default; drop to
5.1 for the cmdlets that only exist there.

## Differences that matter for admin work

| Need | Windows PowerShell 5.1 | PowerShell 7.x |
|---|---|---|
| Event logs | `Get-WinEvent` (and legacy `Get-EventLog`) | `Get-WinEvent` only |
| WMI/CIM | `Get-CimInstance` (and legacy `Get-WmiObject`) | `Get-CimInstance` only |
| Restore points | `Checkpoint-Computer`, `Get-ComputerRestorePoint` | Not available — call `powershell.exe` |
| Service details | `StartType`; use `Win32_Service` for path/account | `StartupType`, `BinaryPathName`, `UserName`, `DelayedAutoStart` |
| Delayed auto-start | `sc.exe config X start= delayed-auto` | `Set-Service -StartupType AutomaticDelayedStart` |
| Delete a service | `sc.exe delete` | `Remove-Service` or `sc.exe delete` |
| Remote service control | `-ComputerName` on service cmdlets | Removed; use `Invoke-Command` |
| Default file encoding (`Out-File`, `>`) | UTF-16 LE | UTF-8 without BOM |
| `curl` / `wget` | Aliases for `Invoke-WebRequest` | Real `curl.exe` |
| Performance counters | `Get-Counter`, `Export-Counter`, `Import-Counter` | `Get-Counter` (export/import removed) |
| Windows-only modules | Native | Most load natively; others via `Import-Module X -UseWindowsPowerShell` |

`Get-ScheduledTask`, `Get-NetFirewallRule`, `Get-PnpDevice`,
`Get-PhysicalDisk` and the other CDXML modules behave the same in both.

## Elevation

```powershell
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Warning 'This step needs an elevated session.' }
```

Elevate one command through the consent prompt rather than running the
whole session elevated. In scripts, `#Requires -RunAsAdministrator` makes the
need explicit.

## Dry-run and confirmation

- Most state-changing cmdlets support `-WhatIf` and `-Confirm`. Run with
  `-WhatIf` first and show the output as part of the plan.
- Native tools (`sc.exe`, `reg.exe`, `icacls`, `netsh`, `pnputil`) have no
  `-WhatIf`. Show the exact command line and the captured before-state
  instead.
- Check `$LASTEXITCODE` after native tools; PowerShell does not throw on a
  non-zero exit by default (7.4+ offers `$PSNativeCommandUseErrorActionPreference`).

## Journalling

```powershell
$journal = Join-Path $env:USERPROFILE "journal\$(Get-Date -Format yyyyMMdd-HHmmss)-change.log"
Start-Transcript -Path $journal
# ... before-state queries, the change, after-state queries ...
Stop-Transcript
```

A transcript plus explicit before/after objects (`Export-Clixml` or JSON) is
the raw material `safe-system-changes` needs for its journal entry and revert.
Keep secrets out of transcripts.

## Alias and quoting traps

- `sc` → `Set-Content`; use `sc.exe`. `where` → `Where-Object`; use
  `where.exe`. In 5.1, `curl`/`wget` are not the real tools.
- Native arguments containing `=` or spaces need care:
  `sc.exe config ExampleSvc start= demand` (space after `=` is part of the
  `sc.exe` syntax). When in doubt, wrap the argument in single quotes or use
  the stop-parsing token `--%`.
- Registry paths use the `HKLM:` / `HKCU:` drives in cmdlets but
  `HKLM\...` in `reg.exe`.
- `Get-ChildItem C:\` hides hidden and system items; add `-Force` to see them.

## Output for humans and for the journal

- Select the properties you need (`Select-Object`) rather than dumping whole
  objects; long `Message` fields can be shortened with
  `$_.Message.Split("`n")[0]`.
- `Format-*` cmdlets are for display only; never pipe their output into
  further processing.
- For structured records use `ConvertTo-Json -Depth 4` or `Export-Csv
  -NoTypeInformation` (and `-Encoding utf8` in 5.1).

## Execution policy

Execution policy is a safety net, not a security boundary. Do not change the
machine-wide policy; if the user needs to run their own scripts, the
`CurrentUser` scope with `RemoteSigned` is the usual choice, and
`powershell-development` covers signing.
