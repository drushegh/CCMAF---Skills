# Rules and Plans

A rule set is a small, readable file in the workspace. A plan is what that
rule set would do to *today's* folder. The user approves the plan, not the
rules.

## Where things live

Follow the workspace layout owned by `safe-system-changes` and
`office-formats`; file automation adds a rules file and per-run folders.

```text
<workspace>/
  rules/
    downloads.rules.yaml        # the rule set (versioned like any document)
  runs/
    2026-10-11-01/
      inventory.csv             # read-only scan of the scope
      plan.csv                  # every proposed operation
      manifest.csv              # what actually happened (append as you go)
      undo-plan.csv             # generated after the run
  quarantine/
    2026-10-11-01/              # "deleted" files, original tree preserved
  journal/
    CHANGES.md                  # safe-system-changes journal
```

Run ids use the journal's `YYYY-MM-DD-NN` form so the journal entry, run
folder and quarantine folder share one id.

## Rule format

Plain YAML (or the equivalent table in Markdown if the user prefers to edit
by hand). Keep it boring; the point is that the user can read it.

```yaml
scope:
  root: "C:\\Users\\example\\Downloads"
  depth: 0                      # folder levels below root to descend; 0 = files directly in root only
                                #   (= Get-ChildItem -Depth 0 = find -maxdepth 1); 1 = also immediate subfolders
  follow_links: false
  skip_newer_than_minutes: 10   # still downloading or being edited
  skip_patterns: ["*.crdownload", "*.part", "*.partial", "~$*", "desktop.ini"]

defaults:
  conflict: skip                # skip | suffix | identical-quarantine-source | keep-newer-quarantine-older | ask
  unmatched: leave

rules:
  - name: installers-to-quarantine-after-30-days
    match: { ext: [".exe", ".msi", ".msix"], older_than_days: 30 }
    action: quarantine
  - name: pdf-invoices
    match: { ext: [".pdf"], name_regex: "(?i)invoice|receipt" }
    action: move
    dest: "D:\\Archive\\Invoices\\{modified:yyyy}"
  - name: photos-by-month
    match: { ext: [".jpg", ".jpeg", ".heic", ".png"] }
    action: move
    dest: "D:\\Photos\\{taken:yyyy}\\{taken:yyyy-MM}"
    fallback_date: modified     # when no EXIF date
  - name: archives-older-than-a-year
    match: { older_than_days: 365 }
    action: move
    dest: "D:\\Archive\\Downloads\\{modified:yyyy}"
```

Rules for writing rules:

- **Order is meaning.** First match wins. Put narrow rules before broad ones
  (invoices before "all PDFs", "all PDFs" before "older than a year").
- **Every rule has a name.** The plan and manifest record which rule fired,
  which is how a surprising move is traced back and fixed.
- **Actions are a closed set:** `move`, `rename`, `copy`, `quarantine`,
  `leave`, `report`. No `delete`.
- **Destinations are templates over known fields:** `{name}`, `{stem}`,
  `{ext}`, `{modified:...}`, `{created:...}`, `{taken:...}`, `{parent}`,
  `{n}` (counter). Unknown fields are an error at plan time, not run time.
- **Prefer stable, cheap matches.** Extension, name, size and dates are free
  to read. Hash, EXIF and document text cost I/O (and download cloud
  placeholders); only compute them for files an earlier filter has selected.
- **Regex is anchored and case-explicit.** State `(?i)` when you mean it.
  Test every regex against the inventory before it reaches the plan.
- **No rule touches its own destination.** If a destination is inside the
  scope, exclude it from the scope, or the next run re-sorts sorted files.

## Inventory

Read-only. One row per file in scope:

```text
path, size, modified_utc, created_utc, attributes, is_link, is_placeholder, ext
```

Record counts at the top of the plan: files in scope, total size, files
skipped by `skip_patterns` and `skip_newer_than_minutes`, links not followed.
The inventory is also the "before" snapshot for the journal.

## The plan

One row per proposed operation, in the order it will run:

```text
seq, rule, action, source, destination, size, conflict, note
1, pdf-invoices, move, ...\Downloads\Invoice-0423.pdf, D:\Archive\Invoices\2026\Invoice-0423.pdf, 81233, none,
2, photos-by-month, move, ...\Downloads\IMG_2201.jpg, D:\Photos\2026\2026-09\IMG_2201.jpg, 3144012, exists-identical, will skip (same hash)
3, installers-..., quarantine, ...\Downloads\setup-tool.exe, <ws>\quarantine\2026-10-11-01\setup-tool.exe, 5512000, none,
```

The `conflict` column is computed at plan time against the destination as
it is now and against earlier rows in the same plan (two sources mapping to
one destination is a conflict even if the destination does not yet exist).

## Presenting the plan

Show the user, in this order:

1. **Summary counts** by action and by rule, plus total size moved.
2. **Every conflict row and its proposed resolution.**
3. **Every risky row:** anything leaving the scope's volume, anything into a
   synced folder, anything quarantined, any rename that changes an extension,
   any file larger than a threshold the user cares about.
4. **Ten sample ordinary rows**, so the user sees the shape.
5. **Where the full plan is** (`runs/<id>/plan.csv`) and how to undo.

Then ask for approval in a form that names the run: "Apply run 2026-10-11-01
(412 moves, 37 quarantined, 3 skipped conflicts)?" Approval of a plan covers
that plan only. If anything in the folder changes before applying (a new
download, a file opened), re-plan the affected rows.

## Applying

- Re-check each row's precondition just before acting: source still exists
  with the planned size and modified time, destination still free (or still
  in the planned conflict state). If not, skip the row and record
  `skipped-changed`.
- Create destination folders as needed and record created folders in the
  manifest, so undo can remove the empty ones it created (and only those).
- Write the manifest row immediately after each operation.
- Stop on the first unexpected error class (access denied on many files,
  destination volume missing, disk full); do not grind through the rest.
