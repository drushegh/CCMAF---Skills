# Command Recipes

Building blocks for the inventory, plan and apply steps. PowerShell first,
POSIX equivalent beside it. They are blocks, not a finished tool: the plan,
manifest and confirmation steps around them are what make them safe. For
anything beyond a few lines, write a script in the workspace and keep it
with the run (`powershell-development`, `bash-development`,
`python-development` own the craft).

## Ground rules for every command

- Literal paths: `-LiteralPath` in PowerShell; quote everything and put `--`
  before file arguments in shell.
- Dry-run flag where the tool has one: PowerShell `-WhatIf` on
  `Move-Item`, `Rename-Item`, `Copy-Item`, `New-Item`; `robocopy /L`;
  `rsync --dry-run`. A dry-run flag is a preview of one command, not a
  substitute for the plan.
- Never add `-Force`, `-Confirm:$false`, `-y` or `-f` to get past an
  existence check or a prompt the user has not answered.
- No `Remove-Item`, `rm`, `robocopy /MIR`, `/PURGE`, `/MOV`, `/MOVE`,
  `rsync --delete` or `--remove-source-files` against user folders in this
  skill.

## Inventory (read-only)

```powershell
Get-ChildItem -LiteralPath $root -File -Depth 0 -Force |
    Select-Object FullName, Length, LastWriteTimeUtc, CreationTimeUtc, Attributes, Extension |
    Export-Csv -LiteralPath "$run\inventory.csv" -NoTypeInformation -Encoding utf8
```

`-Depth` needs PowerShell 5.0 or later; `-Force` includes hidden files so
they are *seen* (and then excluded by rule), not moved by accident.

```bash
find "$root" -maxdepth 1 -type f -printf '%p\t%s\t%TY-%Tm-%Td %TH:%TM\n' > "$run/inventory.tsv"
```

GNU find only; on macOS use `stat -f '%N%t%z%t%Sm' -t '%Y-%m-%d %H:%M'`
(verify flags on the installed version).

## Hash

```powershell
Get-FileHash -LiteralPath $path -Algorithm SHA256
```

```bash
sha256sum -- "$path"          # Linux
shasum -a 256 -- "$path"      # macOS
```

## Move or rename one file, safely

```powershell
if (Test-Path -LiteralPath $dest) { 'conflict' } else {
    New-Item -ItemType Directory -Path (Split-Path -LiteralPath $dest) -Force -WhatIf
    Move-Item -LiteralPath $src -Destination $dest -WhatIf
}
```

Remove `-WhatIf` only in the apply step, after approval. `New-Item -Force`
on a *directory* only creates missing parents; it does not overwrite.

```bash
if [ -e "$dest" ]; then echo conflict; else
  mkdir -p -- "$(dirname -- "$dest")" && mv -n -- "$src" "$dest"
fi
```

`mv -n` (no clobber) is a second guard, not the check: its exit status when
it declines to overwrite differs between coreutils versions and platforms
(verify), so test for the destination yourself and confirm afterwards that
the source is gone and the destination exists.

## Cross-volume move with verification

```powershell
$h1 = (Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
Copy-Item -LiteralPath $src -Destination $dest
$h2 = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
if ($h1 -eq $h2) { <# move the source into <workspace>\quarantine\<run id>\, logged #> }
```

The source is never deleted in the apply step: after a verified copy it goes
to the run's quarantine folder, and emptying quarantine is a later, separate
request.

For many files, `robocopy` is faster and resumable. It **copies**; do not use
`/MOV` or `/MOVE` (they delete the source with no hash check). Preview with
`/L`:

```powershell
robocopy "C:\Users\example\Downloads" "D:\Archive\Downloads" *.zip /MINAGE:365 /XC /XN /XO /R:2 /W:5 /L /NP /LOG:"$run\robocopy-preview.log"
```

- `/MINAGE:365` excludes files modified in the last 365 days.
- `/XC /XN /XO` together skip any file that already exists at the
  destination, so robocopy never overwrites; those files show as skipped.
- `/R:2 /W:5`: the defaults are a million retries with 30 s waits, so a
  locked file could hang the run.
- `/L` lists only; nothing is copied. Remove it to apply.
- Exit codes below 8 mean no failure; 8 or above means at least one file
  failed. 1 means files copied, 0 nothing to do.

Then, per file in the manifest: hash the source and the copy, and only on a
match move the source into the run's quarantine folder (the single-file
recipe above). A mismatch or a missing copy leaves the source in place and is
reported. robocopy logs its own view; still write the manifest (parse the log
or build the file list yourself and call robocopy per batch).

POSIX equivalent:

```bash
rsync -a --ignore-existing --dry-run --itemize-changes \
  -- "$src_dir/" "$dest_dir/"
```

Drop `--dry-run` to apply. `--ignore-existing` skips anything already at the
destination. Do not use `--remove-source-files`: verify hashes per file, then
move matching sources into the run's quarantine folder, as above.

## Send to Recycle Bin or Trash (when the user prefers it to quarantine)

```powershell
Add-Type -AssemblyName Microsoft.VisualBasic
[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($path,
    [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
    [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
```

Network shares and some removable drives have no Recycle Bin; files there
are deleted permanently. Use quarantine for those.

- Linux desktops: `gio trash -- "$path"` (GLib) or `trash-put` (trash-cli).
- macOS: recent versions ship a `trash` command (verify for the installed
  macOS); otherwise use Finder via AppleScript, or quarantine.
- Python, any platform: the free `send2trash` package.

## Dates from photos

`exiftool` (free, Windows/macOS/Linux) reads `DateTimeOriginal` reliably:

```text
exiftool -T -filename -DateTimeOriginal -d "%Y-%m-%d" -- <folder>
```

Use it read-only to build the plan; exiftool can also rename files directly,
but that bypasses the plan and manifest, so do not let it. (Verify option
spelling against the installed version's documentation.)

## Long paths

If a path exceeds 260 characters on Windows, PowerShell 7 generally handles
it; Windows PowerShell 5.1 may need the `\\?\` prefix with `-LiteralPath`
(verify). Better: report the file and choose a shorter destination.
