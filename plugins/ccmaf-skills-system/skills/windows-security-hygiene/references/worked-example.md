# Worked example (fictional)

A fictional home PC belonging to "Alex". Names, paths and hashes are invented
for illustration.

## Request

> "My laptop has been slow and a black window flashes when I log in. Can you
> check nothing dodgy is running?"

## 1. Scope and consent

- Whole-PC hygiene review, read-only, elevated PowerShell session available.
- Alex declines online hash lookups. Noted in the report.
- Alex is the only user profile.

## 2. Defender health

`Get-MpComputerStatus`: running mode Normal, real-time protection on, tamper
protection on, signatures updated yesterday, last quick scan six days ago.
Ran `Update-MpSignature`, then `Start-MpScan -ScanType QuickScan`: no
detections. `Get-MpThreatDetection`: empty.

## 3. Persistence sweep (excerpt)

| # | Location | Entry | Command line |
|---|---|---|---|
| 1 | HKCU Run | `CloudSyncApp` | `"C:\Users\Alex\AppData\Local\CloudSyncApp\sync.exe" /background` |
| 2 | HKLM Run | `AudioPanel` | `"C:\Program Files\Fictional Audio\panel.exe"` |
| 3 | Task `\` | `UpdateCheckerTask` | `powershell.exe -w hidden -enc SQBFAFgA...` |
| 4 | Startup (user) | `notes.lnk` | `C:\Program Files\NoteApp\notes.exe` |
| 5 | Service | `PrintHelperSvc` | `C:\ProgramData\phs\phsvc.exe` (Auto) |
| 6 | WMI | none found | |

## 4. File checks and Defender custom scans

- **#1** `Valid`, signer matches the app vendor, per-user install path. Score
  0 (−2 mitigation, floor 0). Informational.
- **#2** `Valid`, signer matches, Program Files. Informational.
- **#3** Launcher is signed `powershell.exe`; the payload is the encoded
  argument. Decoded (UTF-16LE) for reading only: it downloads and runs a
  script from a URL every logon. Hidden window (+2), encoded command (+2),
  downloads and executes remote content (+4); no mitigations apply. Alex does
  not recognise it. Score 8: **High**. Explains the flashing window.
- **#4** Shortcut to a signed note-taking app Alex uses. Informational.
- **#5** `NotSigned`, executable directly under `C:\ProgramData` (+1), Alex
  had a printer from a now-defunct vendor; version info names that vendor;
  `MpCmdRun -TrustCheck` not trusted (no mitigation). Custom scan: clean.
  Score 1: **Informational**, most likely a leftover driver helper. Listed
  as a housekeeping note rather than a risk.

## 5. Report (summary section)

> **Summary:** One item needs action. A scheduled task named
> "UpdateCheckerTask" runs a hidden PowerShell command at every login that
> downloads and runs code from the internet. You do not recognise it, so we
> recommend disabling it now (reversible) and running a full Defender scan.
> Everything else looks like normal software; one old printer helper could be
> uninstalled from Settings > Apps if you no longer use that printer.
>
> **Limits:** This review checks common start-up locations, signatures and
> Defender's opinion. It cannot rule out deeper compromise. No online lookups
> were made.

## 6. Containment (approved by Alex for #3 only)

1. Plan shown; Alex approves.
2. Restore point per `safe-system-changes`: newest point noted,
   `Checkpoint-Computer` run, then a new point with this run's description
   confirmed by `Get-ComputerRestorePoint` (sequence number recorded in the
   run header).
3. `Export-ScheduledTask` to `backups\2026-10-11-01\task-UpdateCheckerTask.xml`.
4. `Disable-ScheduledTask -TaskPath '\' -TaskName 'UpdateCheckerTask'`.
5. Verified: `Get-ScheduledTask` shows `Disabled`.
6. `Start-MpScan -ScanType FullScan -AsJob` started.
7. Change entry appended to `journal\CHANGES.md` with undo
   `Enable-ScheduledTask -TaskPath '\' -TaskName 'UpdateCheckerTask'`.

The task file had no separate payload on disk (the script was fetched at
run time), so there was nothing to move into quarantine. The URL is recorded
in the journal as evidence; we did not visit it.

## 7. Follow-up

- After the full scan: no detections.
- After a reboot: the task is still `Disabled` and no new task appeared;
  no black window at logon.
- Because the payload came from the internet and ran for an unknown period,
  the report recommends Alex changes passwords for important accounts from a
  trusted device and considers an offline scan (`Start-MpWDOScan`, which
  restarts the PC). Alex is told this falls outside a hygiene review and
  where to get professional help if anything else seems wrong.

## What the example demonstrates

- Read-only discovery first; one containment, explicitly approved.
- The signed launcher was not the evidence; the argument was.
- Low-scoring oddities are explained, not "cleaned".
- The report states its limits and the undo.
