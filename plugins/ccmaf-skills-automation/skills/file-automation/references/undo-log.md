# Undo Log

A folder run is reversible only if every operation is recorded the moment it
happens. File automation uses the `safe-system-changes` change journal for
the human-readable record (see that skill's
`references/change-journal.md`) and adds a machine-readable manifest, because
a journal entry per file would be unreadable at a thousand files.

## Two records, one run id

| Record | Location | Purpose |
|---|---|---|
| Journal entry | `journal/CHANGES.md` | One entry per run: what, why, rules used, counts, where the manifest is, how to undo, verification result |
| Manifest | `runs/<run id>/manifest.csv` | One row per operation, appended as it happens; the source of the undo |

The journal entry follows the `safe-system-changes` required fields (Why,
Target, Before, After, Backup, Undo, Verify, Status). For a folder run:

- **Target:** the scope root(s) and rules file (with its version).
- **Before:** `runs/<id>/inventory.csv` (count and total size).
- **After:** counts by action.
- **Backup:** `n/a — moves are reversible from the manifest; quarantine at
  quarantine/<id>/` (or the backup taken, for in-place content changes).
- **Undo:** the undo command and `runs/<id>/undo-plan.csv`.

## Manifest format

CSV, UTF-8, one header line, one row per operation, written and flushed
after each operation succeeds:

```text
seq,utc,op,source,destination,size,sha256,rule,status,note
1,2026-10-11T09:58:02Z,mkdir,,D:\Archive\Invoices\2026,,,pdf-invoices,done,
2,2026-10-11T09:58:02Z,move,C:\...\Invoice-0423.pdf,D:\Archive\Invoices\2026\Invoice-0423.pdf,81233,3F9A...,pdf-invoices,done,cross-volume; hash verified
3,2026-10-11T09:58:03Z,quarantine,C:\...\setup-tool.exe,<ws>\quarantine\2026-10-11-01\Downloads\setup-tool.exe,5512000,,installers-...,done,
4,2026-10-11T09:58:03Z,move,C:\...\IMG_2201.jpg,,3144012,,photos-by-month,skipped,exists-identical
```

- `op` is one of: `mkdir`, `move`, `rename`, `copy`, `quarantine`, `skip`.
- `status`: `done`, `skipped`, `skipped-changed`, `failed`.
- Hash is required for cross-volume moves and quarantine; optional for
  same-volume renames.
- Paths are full and literal. Quote fields containing commas.
- A failed row records the observed state ("source present, destination
  partial 0 bytes, removed partial").
- No secrets: file names can contain personal data; the manifest stays in
  the workspace and is covered by `personal-data-care` like everything else.

## Generating the undo

The undo is the manifest reversed, filtered to `done` rows:

| Forward op | Undo op |
|---|---|
| `move` / `rename` / `quarantine` A → B | move B → A |
| `copy` A → B | quarantine B (never delete it) |
| `mkdir` D | remove D only if empty after the other undos |

Build it as `undo-plan.csv`, then dry-run it exactly like a forward plan:

- Every B must still exist with the recorded size (and hash if recorded).
- Every A must be free. If A is now occupied (the user saved a new file with
  the same name), that row is a conflict; apply the same conflict policies.
- Report: rows ready, rows conflicted, rows whose B is missing (the user
  moved or deleted it since).

Apply the undo only on the user's request, in reverse sequence order, with
its own manifest (`runs/<id>/undo-manifest.csv`) and its own journal entry
that names the run it reverses. The original entry is not edited; the
journal is append-only.

## Undo commands

PowerShell, from a manifest (dry run first):

```powershell
# @() keeps a one-row manifest an array; sort numerically by seq, newest first
$rows = @(Import-Csv -LiteralPath "$ws\runs\$run\manifest.csv" |
    Where-Object { $_.status -eq 'done' -and $_.op -in 'move','rename','quarantine' }) |
    Sort-Object { [int]$_.seq } -Descending
foreach ($r in $rows) {
    $why = $null
    if (-not (Test-Path -LiteralPath $r.destination -PathType Leaf)) { $why = 'B missing' }
    elseif (Test-Path -LiteralPath $r.source) { $why = 'A occupied' }
    elseif ($r.size -and (Get-Item -LiteralPath $r.destination).Length -ne [long]$r.size) { $why = 'size changed' }
    elseif ($r.sha256 -and (Get-FileHash -LiteralPath $r.destination -Algorithm SHA256).Hash -ne $r.sha256) { $why = 'hash changed' }
    [pscustomobject]@{ Seq = $r.seq; From = $r.destination; To = $r.source; Ready = -not $why; Reason = $why }
}
# After approval: Move-Item -LiteralPath $r.destination -Destination $r.source
# for each ready row, appending to undo-manifest.csv after each move.
```

POSIX: the same logic in a short Python script reading the CSV is easier to
get right than shell `while read` loops with commas and spaces in paths.
Use `csv` from the standard library; never split on commas by hand.

## In-place content changes

Most folder rules never change file content. If a rule does (stripping
metadata, converting formats, re-encoding), it is no longer a move: write
the new file beside the original and quarantine the original, or back up
the original first, exactly as `safe-system-changes` requires for any file
change. The manifest records both paths.

## What to tell the user

At the end of every run, in plain words:

- What moved, how many, where to.
- What is in quarantine and that nothing has been deleted.
- What was skipped and why.
- The journal path and the one-line undo: "To reverse this run, ask me to
  undo run 2026-10-11-01 (manifest at runs/2026-10-11-01/manifest.csv)."
