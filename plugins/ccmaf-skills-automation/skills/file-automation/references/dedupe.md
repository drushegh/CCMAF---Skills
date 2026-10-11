# Duplicates

Deduplication is the riskiest folder rule because its whole purpose is to
make copies disappear. The rules: identical means byte-identical, the keeper
is chosen by a rule the user agreed before hashing, and the others go to
quarantine, never to deletion.

## Definitions

| Term | Meaning | Action allowed |
|---|---|---|
| Exact duplicate | Same size and same cryptographic hash (SHA-256) | Quarantine all but the keeper |
| Same name, different content | Name matches, hash differs | None: report only |
| Near duplicate | Resized, re-encoded or edited copy; burst photos | None: report only, user decides by eye |
| Hard link | Two names for the same data on disk | None: they cost no extra space |

Never treat name, size or date matches alone as duplicates. Never use a fast
non-cryptographic hash alone to decide deletion; it is fine as a first-pass
filter.

## The staged method

Hashing every file is slow and, in cloud folders, downloads everything.
Narrow first:

1. **Group by size.** Files with a unique size cannot have a duplicate. This
   usually removes most of the inventory at no I/O cost.
2. **Partial hash** (first and last few MB) within each size group, if the
   groups are large files.
3. **Full SHA-256** only within groups that still collide.
4. **Group by hash**; each group of two or more is a duplicate set.

Record the hash in the inventory so the next run reuses it while size and
modified time are unchanged.

## Choosing the keeper

Agree the rule before the plan is built and show it in the plan header.
Common rules, in a sensible default order:

1. The copy inside the user's canonical location (the photo library, the
   archive, the project folder) beats copies in Downloads, Desktop or temp.
2. The copy with the more descriptive name beats `Copy of …`, `… (1)`,
   `IMG_1234 - Copy`.
3. The oldest modified date (closest to the original) beats newer copies.
4. The shorter path beats a deeply nested one.

When the rule cannot decide (two copies in two canonical places), the set is
`ask`, not a guess. Show every duplicate set with its keeper marked; for
large runs show counts, the reclaimable size and the twenty largest sets.

## Quarantine

- Move non-keepers to `<workspace>/quarantine/<run id>/`, preserving the
  original relative path under a folder per source root, so two
  `scan.pdf` files from different folders do not collide.
- Record in the manifest: original path, quarantine path, size, hash and the
  keeper's path.
- Tell the user how much space is reclaimable *once they empty quarantine*,
  and that nothing has been freed yet.
- Emptying quarantine is a separate request, after the user has had time to
  notice anything missing. Suggest a waiting period (for example two weeks)
  and, on request, move it to the Recycle Bin or Trash rather than
  permanently deleting.
- A quarantine on the same volume as the source is a rename (fast, no extra
  space). On another volume it is a copy and needs space; check first.

## Cloud and sync caveats

- **Online-only placeholders** (OneDrive Files On-Demand, Dropbox online-only,
  iCloud optimised storage): reading content to hash it triggers a download.
  Detect placeholders in the inventory (on Windows the `Offline` or
  `RecallOnDataAccess` attributes, verify for the client in use) and either
  exclude them, ask the user to make them available offline first, or
  compare the provider's own hashes if exposed locally (usually not).
- Quarantining a file in a synced folder removes it from every device and the
  web view. The provider's own recycle bin is an extra safety net, not the
  plan.
- Sync clients create conflict copies (`file-DESKTOP-1234.docx`,
  `file (conflicted copy).docx`). These are often *not* identical; they are
  edits made on two devices. Report them; never auto-resolve.

## Photo and music libraries

Library managers (photo apps, music players) keep a database of paths.
Quarantining a library file behind the app's back creates broken entries.
Inside a library root, dedupe through the library's own tools or report only.

## Commands

PowerShell, read-only grouping:

```powershell
# Walk the tree by hand so no junction or directory symlink is ever entered
$files = [System.Collections.Generic.List[object]]::new()
$todo  = [System.Collections.Generic.Stack[string]]::new(); $todo.Push($root)
while ($todo.Count) {
    foreach ($i in Get-ChildItem -LiteralPath $todo.Pop() -Force) {
        if ($i.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }   # links, junctions, placeholders
        if ($i.PSIsContainer) { $todo.Push($i.FullName) } else { $files.Add($i) }
    }
}
$bySize = $files | Group-Object Length | Where-Object Count -gt 1
$sets = foreach ($g in $bySize) {
    $g.Group | ForEach-Object {
        [pscustomobject]@{
            Path = $_.FullName; Size = $_.Length
            Hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    } | Group-Object Hash | Where-Object Count -gt 1
}
```

Why not `Get-ChildItem -Recurse -Attributes !ReparsePoint`: the attribute
filter only drops reparse points from the *output*. PowerShell 6 and later do
not recurse into directory links unless `-FollowSymlink` is given (per the
`Get-ChildItem` documentation), but Windows PowerShell 5.1 has no such switch
and can descend through junctions, double-counting files or looping (verify
on the installed version). The manual walk skips every reparse point, which
also skips cloud placeholders that present as reparse points; that is usually
what you want for a first pass.

POSIX:

```bash
# size groups, then hashes, without following symlinks
find "$root" -type f -printf '%s\t%p\n' | sort -n > sizes.tsv
# then sha256sum only files whose size appears more than once
```

`-printf` is GNU find; on macOS use `stat -f '%z'` or install GNU findutils.
Dedicated tools (`jdupes`, `rmlint`, `fdupes` on Linux; `czkawka` cross-
platform) are free and fast; run them in report-only mode and feed their
output into the plan rather than letting them delete or hard-link
(check each tool's flags for the version installed: verify).
