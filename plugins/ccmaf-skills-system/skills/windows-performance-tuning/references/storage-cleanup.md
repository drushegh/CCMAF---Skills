# Storage clean-up

A nearly full system drive slows updates, breaks feature upgrades and makes
everything feel worse. Free space safely: system caches and leftovers first,
user data only with the user looking at the list.

## 1. Find out what is using space (read-only)

- Settings > System > Storage shows categories (Apps, Temporary files, System
  & reserved, Other) and a link to **Cleanup recommendations**.
- Largest folders under the user profile:

```powershell
Get-ChildItem $env:USERPROFILE -Directory -Force -ErrorAction SilentlyContinue |
  ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum
    [pscustomobject]@{ Folder = $_.FullName; GB = [math]::Round($size/1GB, 2) }
  } | Sort-Object GB -Descending | Select-Object -First 15
```

This can take minutes on large profiles. OneDrive "online-only" files report
their logical size; check the cloud status icon before blaming them.

- Component store (WinSxS) real overhead, elevated:

```bat
Dism.exe /Online /Cleanup-Image /AnalyzeComponentStore
```

Explorer over-reports WinSxS size because of hard links; the DISM report's
"Backups and Disabled Features" plus "Cache and Temporary Data" is the real
overhead, and it says whether clean-up is recommended.

## 2. Storage Sense (preferred, built in)

Settings > System > Storage > **Storage Sense**. It cleans temporary files and,
**only if configured**, empties the Recycle Bin and Downloads after a number
of days and dehydrates unused cloud files.

- Turning on Storage Sense with temporary-file clean-up only is low risk.
- **Check the Recycle Bin and Downloads thresholds with the user** before
  enabling: setting them deletes user files on a schedule. Default to "Never"
  unless the user asks.
- A policy version exists (catalogue PT-11); prefer the Settings toggle on a
  personal PC.

## 3. Disk Cleanup (cleanmgr)

Still present on current builds, though Microsoft points users towards Storage
Sense and the Settings clean-up page; check it exists before relying on it.

```bat
cleanmgr /sageset:42   & rem opens a dialog; the user ticks categories (stored as StateFlags0042)
cleanmgr /sagerun:42   & rem runs exactly those categories, on all drives
```

Documented switches: `/d <drive>`, `/sageset:n`, `/sagerun:n`, `/tuneup:n`,
`/lowdisk`, `/verylowdisk` (no prompts), `/autoclean` (removes files left
after a Windows upgrade). Run as administrator (or use "Clean up system files"
in the UI) to see system categories such as Windows Update Cleanup.

Category guidance:

| Category | Safe? | Note |
|---|---|---|
| Temporary files, Temporary Internet Files, Thumbnails | Yes | Thumbnails rebuild |
| Delivery Optimisation files | Yes | Re-downloaded if needed |
| Windows Update Cleanup | Yes | Superseded updates; may prevent uninstalling old updates |
| Previous Windows installation(s) / Windows upgrade log files | Yes, **after** the user confirms the upgrade is fine | Removes the ability to roll back the feature update |
| Downloads | **User data** | Never tick without the user reviewing the folder |
| Recycle Bin | **User data** | Ask; show what is in it |
| Windows error reports and feedback diagnostics | Usually yes | Lose diagnostics a support case might want |

The `/verylowdisk` and `/autoclean` switches run without prompts; only use
them after the user has agreed to what they remove.

## 4. Component store clean-up (DISM)

```bat
Dism.exe /Online /Cleanup-Image /StartComponentCleanup
```

Removes superseded component versions immediately (the scheduled
`StartComponentCleanup` task does the same with a 30-day grace period and a
one-hour time limit). Low risk; can take a while.

```bat
Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

**Irreversible:** after `/ResetBase`, currently installed updates **cannot be
uninstalled** (future updates still can). Only with explicit user agreement,
and never right after a problematic update. Not needed on most PCs.

**Never delete files from `C:\Windows\WinSxS` by hand.** Microsoft warns this
can leave the PC unbootable and unable to update. Do not disable component
clean-up either.

## 5. Hibernation file

`powercfg /hibernate off` frees `hiberfil.sys` but also disables fast startup
and hibernate. See `power-plans.md` before using it as a disk-space measure.

## 6. Apps and large user data

- Settings > Apps > Installed apps, sorted by size: uninstall what the user no
  longer uses (`winget uninstall` is fine too; journal it).
- Move, do not delete, large personal folders (videos, archives, VM images) to
  another drive with the user.
- Developer caches (package manager caches, container images, build outputs)
  have their own clean-up commands; use those tools' documented commands,
  not raw deletion.

## Never

- Delete `C:\Windows\WinSxS`, `C:\Windows\Installer`, `C:\ProgramData` folders
  or `C:\Windows\System32` contents by hand.
- Delete the page file or `hiberfil.sys` directly (use the settings that own
  them).
- Run "registry cleaners" or "PC cleaner" utilities.
- Empty Recycle Bin, Downloads or cloud folders without the user's explicit
  review.
- Clear event logs to "save space" (they are capped and are evidence).

## Verify

Re-run the free-space query and the component store analysis; record GB freed
per action in the journal.
