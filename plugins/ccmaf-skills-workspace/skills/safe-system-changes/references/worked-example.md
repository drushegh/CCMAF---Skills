# Worked Example: "My PC takes ages to start"

A fictional run on a fictional machine, showing every gate. Values are
illustrative.

## 1. Inspect (read-only)

The agent checks edition and elevation, lists startup items
(`Get-CimInstance Win32_StartupCommand`), the Run keys, and services set to
start automatically that are not Microsoft-signed. It finds:

- `ExampleUpdater` in `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- `ExampleSvc` set to Automatic (Delayed Start), used only by the Example app
- `ChatHelper` in the Startup folder (a shortcut)
- Search indexing service running (normal; noted, not proposed)

`windows-performance-tuning` and `windows-diagnostics` supply the judgement
about which items matter; this skill supplies the gates.

## 2. Plan

```text
PLAN — run 2026-10-11-01 — goal: faster start-up
Restore point: create before change 1 (MODIFY_SETTINGS)
Elevation: change 2 needs admin; you will be asked to approve UAC

1. [Low]    Remove ExampleUpdater from HKCU Run
            Undo: re-add with captured command line
2. [Medium] ExampleSvc: Automatic (Delayed) → Manual
            Worst case: Example app takes a few seconds longer to open
            Undo: sc.exe config ExampleSvc start= delayed-auto
3. [Low]    Move ChatHelper shortcut out of Startup folder into
            backups/2026-10-11-01/ (not deleted)
            Undo: move it back

Not doing: search indexing (normal behaviour; ask if you want it reviewed)
```

User approves 1–3.

## 3. Restore point

`Checkpoint-Computer` warns that a point was created in the last 24 hours.
`Get-ComputerRestorePoint` shows #56, "Windows Update", created at 07:10
today. The run has not changed anything yet, so the agent offers option 1
(reuse #56) and explains why it is equivalent. User agrees. Journal header:

```markdown
- Restore point: none created — 24 h limit; reusing #56 (07:10, before this run; user agreed 09:51)
```

## 4–7. Change 1, gated

```powershell
reg export 'HKCU\Software\Microsoft\Windows\CurrentVersion\Run' "$bk\01-run.reg" /y
$before = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run').ExampleUpdater
# before = "C:\Users\<user>\AppData\Local\Example\updater.exe" --background
```

Shown to the user: target, before, after (removed), undo. Confirmed.

```powershell
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name ExampleUpdater
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name ExampleUpdater -ErrorAction SilentlyContinue
# (no output) → value absent → PASS
```

Journal entry `2026-10-11-01/01` written, status `applied-unverified`
(the effect check needs a restart). The undo was tested once: re-added,
confirmed present, removed again.

## Change 2: a surprise

`sc.exe qc ExampleSvc` now shows `AUTO_START` without `(DELAYED)`, unlike the
inspection twenty minutes earlier. Non-negotiable 8: stop on surprise. The
agent reports that the start type changed during the session (likely the
Example app's own updater) and asks how to proceed. The user says to continue
with the newly observed value as "before". The journal records both
observations, and the undo is updated to `start= auto`.

Applied in the elevated session, verified with `sc.exe qc`, journalled.

## Change 3

`Move-Item` of the shortcut into the run's backup folder (never `Remove-Item`).
Verified: shortcut absent from `shell:startup`, present in backup with the
same hash.

## Summary and hand-off

```markdown
#### Summary 2026-10-11-01
- Verified: 03; 02 (state)
- Applied, awaiting restart: 01 (effect), 02 (effect)
- To revert everything: undo 03, 02, 01 in that order (commands in entries),
  or System Restore to #56 (07:10; also undoes this morning's update)
- Next: restart, then compare start-up time against today's 94 s
  (Event Viewer > Diagnostics-Performance, event 100)
```

The agent tells the user the journal path and the one-line undo. Next
session: reads the journal, confirms the restart happened, checks event 100,
marks 01 and 02 `verified` with new entries noting the result.

## What the example shows

- The 24-hour limit handled by reuse, with the reason written down.
- Targeted backups as the real undo; the restore point as the last resort.
- A changed "before" value treated as a stop, not something to work around.
- "Remove" implemented as "move to backup" for files.
- Verification split into state now and effect after restart.
