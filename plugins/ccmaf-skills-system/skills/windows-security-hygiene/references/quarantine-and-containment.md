# Quarantine and containment (reversible only)

Containment stops a suspicious item from running while keeping the evidence and
the undo. **Nothing here runs without the user's explicit approval for that
item**, and every step follows `safe-system-changes`: plan shown first, restore
point before the first change of the run, registry export before any registry
edit, journal entry, verification, tested undo.

Order of preference: **let Defender handle it** → **disable the autostart** →
**move the file to quarantine** → (user's later decision) deletion.

## 0. Before any change

**Restore point.** Follow the procedure in `safe-system-changes`
(`references/restore-points-windows.md`): note the newest point, run
`Checkpoint-Computer -RestorePointType MODIFY_SETTINGS`, then **confirm a new
point with this run's description exists**. The call can silently create
nothing (the 24-hour limit), so never record "created" from the call alone.
If no new point exists, take one of that reference's options with the user and
journal the choice.

**Workspace layout.** Use the shared layout from `safe-system-changes`
(`references/change-journal.md`), not a private folder scheme:

```text
<workspace>\
  journal\CHANGES.md            # shared append-only journal; one run header, one entry per change
  backups\<run id>\             # run id YYYY-MM-DD-NN; exports, sc.exe qc output, WMI JSON, manifest
```

```powershell
$runId = '2026-10-11-01'                                   # from the run header
$bk    = Join-Path $workspace "backups\$runId"
New-Item -ItemType Directory -Path $bk -Force | Out-Null
```

Every command below writes to `$bk` by full path, never to a relative path
that depends on the current directory. The quarantine folder is chosen
separately (section 3) because it must not sync.

## 1. If Defender detects it

Let Defender quarantine or remediate. Verify with `Get-MpThreatDetection`.
Do not move, rename or delete Defender-detected files by hand. Restoring is in
`defender-operations.md`.

## 2. Disable the autostart (first containment step)

### Scheduled task

```powershell
$t = Get-ScheduledTask -TaskPath '\' -TaskName 'FictionalUpdater'
Export-ScheduledTask -TaskPath $t.TaskPath -TaskName $t.TaskName |
  Out-File (Join-Path $bk 'task-FictionalUpdater.xml') -Encoding utf8   # evidence + undo
Disable-ScheduledTask -TaskPath $t.TaskPath -TaskName $t.TaskName
```

Undo: `Enable-ScheduledTask -TaskPath '\' -TaskName 'FictionalUpdater'`.
If the task was later removed, re-create from the export with
`Register-ScheduledTask -Xml (Get-Content (Join-Path $bk 'task-FictionalUpdater.xml') -Raw) -TaskName 'FictionalUpdater'`.

### Service

Capture the start type with `sc.exe qc`: `Win32_Service.StartMode` reports a
delayed service as plain `Auto`, and `Set-Service` on Windows PowerShell 5.1
cannot set "Automatic (Delayed Start)", so an undo built from them silently
loses it.

```powershell
sc.exe qc FictionalSvc | Out-File (Join-Path $bk 'service-FictionalSvc-qc.txt') -Encoding utf8
Get-CimInstance Win32_Service -Filter "Name='FictionalSvc'" |
  Select-Object Name, StartMode, State, PathName, StartName |
  ConvertTo-Json | Out-File (Join-Path $bk 'service-FictionalSvc.json') -Encoding utf8
Stop-Service -Name FictionalSvc            # only if approved; it may be in use
sc.exe config FictionalSvc start= disabled
```

Undo: `sc.exe config FictionalSvc start= <original>` (the space after `start=`
is required), mapping the captured `START_TYPE`:

| `sc.exe qc` START_TYPE | Undo value |
|---|---|
| `AUTO_START (DELAYED)` | `delayed-auto` |
| `AUTO_START` | `auto` |
| `DEMAND_START` | `demand` |
| `DISABLED` | `disabled` |

Then `Start-Service FictionalSvc` if it was running. Verify with `sc.exe qc`.
Never disable a service that belongs to Windows or to security software.

### Run / RunOnce value

**Default: disable, do not delete.** Export the key, then have the user turn
the entry off in the supported UI (Task Manager > Startup apps, or Settings >
Apps > Startup). Windows records that toggle under
`...\Explorer\StartupApproved\Run` and leaves the Run value itself in place,
so the evidence survives and the undo is switching it back on. Journal what
was toggled.

```powershell
reg export 'HKCU\Software\Microsoft\Windows\CurrentVersion\Run' (Join-Path $bk 'hkcu-run.reg') /y
```

**Only for a High-rated item, with explicit approval for that step,** remove
the single value after the export (something hostile can flip a
StartupApproved toggle back):

```powershell
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'FictionalHelper'
```

Undo: re-add the single value with `New-ItemProperty` using the name, type and
data recorded in the journal; or `reg import` the export (restores every value
in that key as it was at export time; check nothing new was added since).

### Startup folder item

Move it (do not delete) into the quarantine folder chosen per section 3, with
the same hash manifest line and `.quarantined` suffix:

```powershell
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Fictional.lnk'
# then quarantine $lnk exactly as in section 3 ($src = $lnk)
```

Undo: move it back to the original path in the manifest, removing the suffix.

### WMI subscription

Export every property of the **filter, consumer and binding** to JSON first
(the binding alone only holds references; the filter's query and the
consumer's command line are the evidence). Then remove the **binding** only:
this stops the trigger firing while keeping the filter and consumer in place
as evidence.

```powershell
$ns = 'root\subscription'
$b = Get-CimInstance -Namespace $ns -ClassName __FilterToConsumerBinding |
  Where-Object { $_.Consumer.Name -eq 'FictionalConsumer' }
$f = Get-CimInstance -Namespace $ns -ClassName __EventFilter |
  Where-Object { $_.Name -eq $b.Filter.Name }
$c = Get-CimInstance -Namespace $ns -ClassName $b.Consumer.CimClass.CimClassName |
  Where-Object { $_.Name -eq 'FictionalConsumer' }
$f | Select-Object * | ConvertTo-Json -Depth 4 | Out-File (Join-Path $bk 'wmi-filter.json')   -Encoding utf8
$c | Select-Object * | ConvertTo-Json -Depth 4 | Out-File (Join-Path $bk 'wmi-consumer.json') -Encoding utf8
$b | Select-Object * | ConvertTo-Json -Depth 4 | Out-File (Join-Path $bk 'wmi-binding.json')  -Encoding utf8
$b | Remove-CimInstance
```

Undo: re-fetch the **live** filter and consumer (they were not removed; the
JSON is evidence, not something to rebuild from) and pass them as references:

```powershell
$f = Get-CimInstance -Namespace root\subscription -ClassName __EventFilter |
  Where-Object Name -eq '<recorded filter name>'
$c = Get-CimInstance -Namespace root\subscription -ClassName <recorded consumer class> |
  Where-Object Name -eq 'FictionalConsumer'
New-CimInstance -Namespace root\subscription -ClassName __FilterToConsumerBinding `
  -Property @{ Filter = [ref]$f; Consumer = [ref]$c }
```

(verify) The `[ref]` cast for CIM reference properties is the widely used
pattern but is not stated in the `New-CimInstance` documentation; confirm the
re-created binding with `Get-CimInstance __FilterToConsumerBinding` before
recording the undo as tested. WMI persistence on a home PC is unusual enough
that a High rating here also means "consider escalating".

### Winlogon / IFEO / AppInit values

These are system-critical: a wrong `Userinit` or `Shell` value can leave the
user unable to sign in, and the agent cannot check a sign-in from inside the
session. A modified value here is also a strong sign of compromise.

- **Tier: High** under `safe-system-changes`, every time, whatever the
  rubric score. State the worst case plainly: the PC may not reach the
  desktop until the change is undone from recovery.
- **Default: escalate.** Report the finding, export the key as evidence, and
  hand over to `incident-response` or a professional. The agent does not write
  these values itself.
- **Before anyone touches them,** a **verified** restore point for this run
  must exist (section 0), and the user must be told the recovery path first:
  if sign-in breaks, boot into the Windows Recovery Environment (hold Shift
  while choosing Restart, or let it start after repeated failed boots) >
  Troubleshoot > Advanced options > System Restore, and pick that point.
- **If the user chooses to restore the defaults themselves,** give them the
  values built from the live system root, never a hard-coded drive, and let
  them make the change by hand (regedit) with the export to hand:

  ```powershell
  reg export 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' (Join-Path $bk 'winlogon.reg') /y
  "Userinit default: $(Join-Path $env:SystemRoot 'system32\userinit.exe'),"   # note trailing comma
  'Shell default:    explorer.exe'
  ```

  An unexplained IFEO `Debugger` value or `AppInit_DLLs` entry follows the
  same rule: export, report, escalate; removal is the user's (or the
  professional's) step, journaled.
- Verification is the user's: they sign out and back in (or reboot) and
  confirm the desktop loads, then report back before the run continues.

## 3. Quarantine the file

Only after the autostart is disabled (otherwise the item may be running or get
re-created).

**Choose the quarantine folder first.** It must be a local folder that **no
sync client touches**: not under OneDrive, Dropbox, Google Drive, iCloud or a
NAS share, because a sync client would upload a suspect file to the cloud and
to the user's other devices. The workspace itself may be synced, so do not
assume `$bk` is safe:

```powershell
$q = Join-Path $env:SystemDrive "HygieneQuarantine\$runId"   # example; any local non-synced path
$syncRoots = @($env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial) | Where-Object { $_ }
if ($syncRoots | Where-Object { $q.StartsWith($_, 'OrdinalIgnoreCase') }) { throw 'Quarantine path is under OneDrive' }
New-Item -ItemType Directory -Path $q -Force | Out-Null
```

The environment check only covers OneDrive; ask the user whether any other
sync client covers the chosen path, and record the full quarantine path in
the journal.

```powershell
$src  = 'C:\Users\Alex\AppData\Roaming\Fictional\helper.exe'
$hash = (Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
$dest = Join-Path $q ("{0}_{1}.quarantined" -f $hash.Substring(0,12), (Split-Path $src -Leaf))
Move-Item -LiteralPath $src -Destination $dest
"$hash`t$src`t$dest`t$(Get-Date -Format o)" | Add-Content (Join-Path $q 'manifest.tsv')
Copy-Item (Join-Path $q 'manifest.tsv') $bk -Force                  # journal-side copy
```

- The manifest maps each file back to its original path and hash, by full
  path.
- The `.quarantined` suffix is **mandatory**: it breaks the file association
  so nobody can double-click it by accident.
- Run `Start-MpScan -ScanType CustomScan -ScanPath <quarantine folder>`. If
  Defender detects it, Defender takes over from here.
- If the move fails because the file is in use, stop the process only with
  approval, or contain at the autostart level and finish after a reboot.

Undo: move the file back to the original path in the manifest and confirm the
hash matches.

## 4. Verify

- Re-enumerate the location: task `Disabled`, `sc.exe qc` shows the new
  start type, Run entry shown as disabled in Task Manager (or the value absent,
  if removal was approved), binding absent, file present in quarantine with
  matching hash.
- Reboot (with the user's agreement) and re-run the sweep for these items. A
  re-created entry means something else is maintaining it: find it, rate it,
  and escalate.
- Confirm the user's normal apps still work.

## 5. Deletion (the user's decision, later)

Recommend keeping quarantine for at least a couple of weeks. Deletion of
quarantined files is a separate, explicit user decision, journaled with the
hash list. Never delete as part of the review session itself, and never
delete without the user seeing exactly what will go.

## Journal entries

Append to the shared `<workspace>\journal\CHANGES.md` in the format of
`safe-system-changes` (`references/change-journal.md`): one run header (with
the **verified** restore point, or the recorded reason there is none), then
one change entry per containment step, then the run summary. Do not invent a
separate journal file or layout. A containment entry looks like:

```markdown
### 2026-10-11-01/01 — Disable scheduled task \FictionalUpdater

- Tier: Medium
- Why: rated High (hidden window +2, downloads and runs remote content +4;
  total 6); user approved containment 10:12
- Target: scheduled task `\FictionalUpdater`
- Before: State Ready
- After: State Disabled
- Backup: backups/2026-10-11-01/task-FictionalUpdater.xml
- Command: `Disable-ScheduledTask -TaskPath '\' -TaskName 'FictionalUpdater'`
- Undo: `Enable-ScheduledTask -TaskPath '\' -TaskName 'FictionalUpdater'`
- Verify: `Get-ScheduledTask` shows Disabled — PASS (10:14)
- Status: verified
- Confirmed by user: 10:12
```

For a quarantined file, `Backup` is the manifest copy in `backups\<run id>\`
and the entry names the full quarantine path.
