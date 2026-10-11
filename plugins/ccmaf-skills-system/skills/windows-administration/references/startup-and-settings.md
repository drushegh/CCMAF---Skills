# Startup items and where settings live

## Every place something can start

| Location | Scope | Inspect with |
|---|---|---|
| Settings > Apps > Startup (`ms-settings:startupapps`) | User | GUI; also covers Store app startup tasks |
| Task Manager > Startup apps | User + machine | GUI; shows "startup impact" |
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` (and `RunOnce`) | User | `Get-ItemProperty` |
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` (and `RunOnce`) | Machine | `Get-ItemProperty` |
| `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run` | Machine, 32-bit apps | `Get-ItemProperty` |
| `shell:startup` = `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` | User | `Get-ChildItem` |
| `shell:common startup` = `%ProgramData%\Microsoft\Windows\Start Menu\Programs\StartUp` | Machine | `Get-ChildItem` |
| Scheduled tasks with logon or boot triggers | Either | `services-and-tasks.md` |
| Services set to `Automatic` | Machine | `services-and-tasks.md` |

```powershell
# Run keys and startup folders in one view (both editions)
Get-CimInstance Win32_StartupCommand |
    Select-Object Name, Command, Location, User

# Raw Run keys
'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run' |
    ForEach-Object { Get-ItemProperty -Path $_ -ErrorAction SilentlyContinue } |
    Select-Object * -ExcludeProperty PS*

# Tasks that fire at logon or boot
Get-ScheduledTask | Where-Object {
    $_.Triggers.CimClass.CimClassName -match 'Logon|Boot' -and $_.State -ne 'Disabled'
} | Select-Object TaskPath, TaskName, State
```

### Toggling startup apps

Use the **Settings page or Task Manager** to disable a startup app. They
record the disabled state without deleting the entry, so re-enabling is one
click. (They store the state under `...\Explorer\StartupApproved\...` keys;
that format is undocumented — read it if you must, never write it.) Deleting
a Run value is a removal; export the key first with
`reg export "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" run-backup.reg`.

Deeper persistence locations (Winlogon, IFEO, AppInit, shell extensions,
WMI subscriptions) are a security review, not admin housekeeping — hand to
`windows-security-hygiene`. Microsoft's free Sysinternals **Autoruns** gives
the complete picture if the user chooses to install it.

## Where settings live

| Kind | Location | Notes |
|---|---|---|
| Per-user app and shell settings | `HKCU\Software\...` (file: `%USERPROFILE%\NTUSER.DAT`) | Loaded only while the user is signed in |
| Machine-wide software settings | `HKLM\SOFTWARE\...` | 32-bit apps redirect to `WOW6432Node` |
| Services and drivers | `HKLM\SYSTEM\CurrentControlSet\Services\<name>` | `Start` value: 0 boot, 1 system, 2 auto, 3 manual, 4 disabled |
| Group Policy results | `HKLM\SOFTWARE\Policies`, `HKCU\Software\Policies` | Written by policy; hand edits get overwritten |
| Local Group Policy (Pro+) | `gpedit.msc`; report with `gpresult /h report.html` | Not on Home edition |
| Per-user app data | `%APPDATA%` (roaming), `%LOCALAPPDATA%` (local) | Back up before resetting an app |
| Machine app data | `%ProgramData%` | Hidden by default |
| Installed programs | `HKLM\...\Uninstall`, `HKLM\SOFTWARE\WOW6432Node\...\Uninstall`, `HKCU\...\Uninstall` | Also `winget list` |
| Environment variables | `HKCU\Environment` (user), `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment` (machine) | New processes only pick changes up |
| Hosts file | `C:\Windows\System32\drivers\etc\hosts` | See networking reference |
| Settings app pages | `ms-settings:` URIs (`ms-settings:windowsupdate`, `ms-settings:appsfeatures`, `ms-settings:startupapps`, `ms-settings:defaultapps`) | `Start-Process ms-settings:windowsupdate` |

### Registry discipline

```powershell
# Read
Get-ItemProperty -Path 'HKCU:\Software\ExampleVendor\ExampleApp' -Name Theme

# Before any write: export the key (for the journal and revert)
reg export "HKCU\Software\ExampleVendor\ExampleApp" "$env:USERPROFILE\journal\exampleapp-before.reg" /y

# Write (with -WhatIf first)
Set-ItemProperty -Path 'HKCU:\Software\ExampleVendor\ExampleApp' -Name Theme -Value 'Dark' -WhatIf

# Revert
reg import "$env:USERPROFILE\journal\exampleapp-before.reg"
```

`reg import` merges; it does not delete values that were added after the
export. Note added values separately and remove them explicitly on revert.

### Environment variables safely

```powershell
$old = [Environment]::GetEnvironmentVariable('Path', 'User')   # journal this
$new = ($old.TrimEnd(';') + ';C:\Tools\bin')
[Environment]::SetEnvironmentVariable('Path', $new, 'User')
```

Avoid `setx` for `Path` (1024-character truncation, expands `%VAR%`
references). Machine scope needs elevation and affects every user.

## Restore points

```powershell
# Is System Protection on? (5.1 or 7.x, elevated)
Get-CimInstance -Namespace root/default -ClassName SystemRestore |
    Select-Object SequenceNumber, Description, CreationTime

# Create (Windows PowerShell 5.1 only; one per 24 h by default)
powershell.exe -NoProfile -Command "Checkpoint-Computer -Description 'Before ExampleApp driver' -RestorePointType MODIFY_SETTINGS"
```

From PowerShell 7 call `powershell.exe` as above. If the call is refused
because one was made in the last 24 hours, say so and rely on the journal;
do not change the throttle. Restore points do not cover personal files.
