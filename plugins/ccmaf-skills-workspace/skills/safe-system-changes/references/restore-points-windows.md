# Restore Points and Backups on Windows

Three layers, from broadest to most useful:

1. **System restore point**: a whole-system safety net, one per run.
2. **Registry export**: of the exact key, before each registry edit.
3. **File backup**: of the exact file, before each file change.

The targeted layers are what you revert with. The restore point is for when
the machine no longer boots properly or the damage is wider than one change.

## System restore points

Facts (verified against Microsoft Learn, October 2026; re-check on new builds):

- `Checkpoint-Computer -Description <text> [-RestorePointType <type>]` creates
  a point. Types: `APPLICATION_INSTALL` (the default), `APPLICATION_UNINSTALL`,
  `DEVICE_DRIVER_INSTALL`, `MODIFY_SETTINGS`. (`CANCELLED_OPERATION` is
  accepted but no longer supported.) Use `MODIFY_SETTINGS` for tweak runs.
- The cmdlet ships with **Windows PowerShell 5.1** (`Microsoft.PowerShell.Management`).
  It is not in PowerShell 7's module; from PowerShell 7 call
  `powershell.exe -NoProfile -Command "Checkpoint-Computer ..."`.
- It needs an **elevated** session and **client** Windows (10/11); servers do
  not support restore points.
- **System Protection must be on** for the system drive. Check, and only
  enable with the user's say-so (it reserves disk space):

  ```powershell
  # Lists existing points; an empty result can mean protection is off
  Get-ComputerRestorePoint
  # Enabling is itself a change: confirm and journal it
  Enable-ComputerRestore -Drive 'C:\'
  ```

- **The once-per-24-hours limit.** Since Windows 8, if any restore point was
  created in the last 24 hours, a new request is skipped. Depending on host
  version this surfaces as a warning or error ("A new system restore point
  cannot be created because one has already been created within the past 24
  hours") or, through the underlying API, as apparent success that created
  nothing. **So never trust the call; verify the point exists afterwards.**

### Procedure

```powershell
# 1. Before: note the newest point
$before = Get-ComputerRestorePoint | Sort-Object SequenceNumber | Select-Object -Last 1

# 2. Create (Windows PowerShell 5.1, elevated)
$desc = 'ccmaf run 2026-10-11-01'
Checkpoint-Computer -Description $desc -RestorePointType MODIFY_SETTINGS

# 3. After: confirm a NEW point with our description exists
$after = Get-ComputerRestorePoint | Sort-Object SequenceNumber | Select-Object -Last 1
if (-not $after -or $after.Description -ne $desc -or
    ($before -and $after.SequenceNumber -eq $before.SequenceNumber)) {
    'No new restore point was created; stop and decide with the user.'
} else {
    $after | Select-Object SequenceNumber, Description, CreationTime
}
```

Record `SequenceNumber`, `Description` and `CreationTime` in the journal run
header.

### When the 24-hour limit bites

Offer the user these options, in this order, and journal the choice:

1. **Reuse the existing recent point**, if it was created *before anything in
   this run changed* (compare its `CreationTime` with the run start and the
   journal). It protects this run as well as a new one would. Name it in the
   journal header. This is the right answer most of the time.
2. **Proceed on targeted backups only**, for Low-tier runs, stating plainly
   that there is no fresh system-wide net.
3. **Temporarily lift the frequency limit.** The documented DWORD
   `SystemRestorePointCreationFrequency` (minutes) under
   `HKLM\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore` controls
   the window; it does not exist by default (meaning 1440 minutes), and `0`
   means never skip. Setting it is a registry change: plan it, back up the
   key, confirm, journal it, and **remove the value again after the point is
   created**, so the machine returns to default behaviour:

   ```powershell
   reg export "HKLM\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore" (Join-Path $workspace 'backups\2026-10-11-01\00-sr.reg') /y
   New-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore' `
     -Name SystemRestorePointCreationFrequency -PropertyType DWord -Value 0
   # ... Checkpoint-Computer, verify ...
   Remove-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore' `
     -Name SystemRestorePointCreationFrequency
   ```

   If the value already existed, the undo restores its captured value instead
   of removing it.
4. **Postpone Medium/High changes** until tomorrow's run.

Never lift the limit permanently, and never do it without the user agreeing.

### Other reasons there is no point

| Symptom | Likely cause | Response |
|---|---|---|
| `Get-ComputerRestorePoint` empty, creation fails | System Protection off | Ask before enabling; it uses disk space |
| "not recognized as the name of a cmdlet" | PowerShell 7 or a server SKU | Use `powershell.exe`; on server, use a backup tool or VM snapshot |
| Access denied | Not elevated | Ask the user to start an elevated session |
| Point vanished later | Low disk space or the shadow-storage cap purging old points, or a feature update | Expected; targeted backups are the real undo |

Newer Windows 11 builds also offer **Point-in-time restore** (Settings >
System > Recovery), a separate, admin-configured feature with automatic
snapshots. It is not created on demand by `Checkpoint-Computer`; mention it
only if it is already enabled. Version-dependent.

## Registry export before every registry edit

Export the narrowest key that contains the value, to the run's backup folder:

```powershell
$bk = Join-Path $workspace 'backups\2026-10-11-01'
New-Item -ItemType Directory -Path $bk -Force | Out-Null
reg export 'HKCU\Software\Microsoft\Windows\CurrentVersion\Run' "$bk\01-run.reg" /y
# Confirm the export is non-empty before editing
(Get-Item "$bk\01-run.reg").Length -gt 0
```

Also record the single value in the journal (`Get-ItemProperty` output, with
type: `REG_SZ`, `REG_DWORD`, `REG_EXPAND_SZ` and so on). A typed before value
lets you write a precise undo:

- **Value changed** → undo sets the captured value and type.
- **Value added** → undo deletes it (`reg import` will not remove it).
- **Value or key deleted** → undo is `reg import` of the export, or a
  `reg add` with the captured data.

`reg export` paths use `HKCU`/`HKLM` (no colon); PowerShell provider paths use
`HKCU:\`. Mixing them up is a frequent silent failure.

## File backups

```powershell
$src = 'C:\ProgramData\Example\settings.json'
$dst = Join-Path $bk '02-settings.json'
Copy-Item -LiteralPath $src -Destination $dst
# Verify the copy before touching the original
(Get-FileHash $src).Hash -eq (Get-FileHash $dst).Hash
```

- Back up to the workspace backup folder, never next to the original
  (`settings.json.bak` beside the original is easily swept up by cleanup).
- For a folder, use `robocopy <src> <dst> /E /COPY:DAT /L` first (list only),
  then without `/L`. Record the file count.
- Note ACLs if the file is under `Program Files`, `ProgramData` or
  `Windows`: `icacls <path>` output goes into the journal; restored copies can
  otherwise inherit the wrong permissions.

## Other before-snapshots worth taking for larger runs

- Installed software: `winget export -o "$bk\winget.json"` (lists what winget
  knows; not everything installed).
- Services: `Get-Service | Select-Object Name, StartType, Status | Export-Csv "$bk\services.csv" -NoTypeInformation`.
- Scheduled tasks: `Get-ScheduledTask | Select-Object TaskPath, TaskName, State | Export-Csv "$bk\tasks.csv" -NoTypeInformation`.
- Power plan: `powercfg /getactivescheme`; `powercfg /export "$bk\plan.pow" <GUID>`.

`machine-config-as-code` turns these into a maintained capture.
