# Worked Example: Tidying a Downloads Folder

Fictional user, fictional files. Shows the whole loop, including the parts
that are easy to skip.

## The request

> "My Downloads folder is a mess. Sort it out: invoices to my archive,
> photos by month, get rid of old installers and duplicates. Then keep it
> tidy every week."

Three jobs hide in this: a one-off tidy (interactive), a rule set, and a
weekly schedule (unattended). Do them in that order; the schedule only
starts after the one-off run has gone well.

## 1. Scope and questions

Ask once, briefly:

- Root: `C:\Users\example\Downloads`, top level only? (Yes; subfolders are
  unzipped projects, leave them.)
- Archive location: `D:\Archive` (a second internal disk, not synced).
- Photos: `D:\Photos\<year>\<year-month>` by date taken, falling back to
  modified date.
- "Get rid of": confirm it means quarantine, reviewable for two weeks.
- Conflict policy: `skip` this first run.

## 2. Inventory

Read-only scan: 1,284 files, 38.6 GB. Excluded before rules: 2 `.crdownload`
(in progress), 1 file modified 3 minutes ago, `desktop.ini`. 31 entries are
folders (left alone by scope). Saved as `runs/2026-10-11-01/inventory.csv`.

## 3. Rules

Written to `rules/downloads.rules.yaml` (shape as in `rules-and-plans.md`),
in this order:

1. `pdf-invoices`: PDFs with invoice/receipt in the name → `D:\Archive\Invoices\{modified:yyyy}`
2. `photos-by-month`: jpg/jpeg/heic/png → `D:\Photos\{taken:yyyy}\{taken:yyyy-MM}`
3. `installers-old`: exe/msi/msix older than 30 days → quarantine
4. `duplicates`: exact duplicates within Downloads → quarantine non-keepers
   (keeper: descriptive name, then oldest)
5. `old-everything`: anything older than 365 days → `D:\Archive\Downloads\{modified:yyyy}`
6. Unmatched → leave.

Testing the invoice regex against the inventory found it also matched
`invoice-template-blank.docx`; restricting to `.pdf` fixed it before
anything reached the plan.

## 4. The plan as shown

```text
Run 2026-10-11-01 — Downloads tidy (dry run, nothing changed yet)

  Move to D:\Archive\Invoices        47 files    12 MB
  Move to D:\Photos                 388 files   4.1 GB   (61 used modified date: no EXIF)
  Quarantine: old installers         29 files    9.8 GB
  Quarantine: exact duplicates       73 files    2.2 GB   (73 sets; keepers stay)
  Move to D:\Archive\Downloads      402 files   18.9 GB
  Leave in place                    341 files
  Skipped (in use / partial)          4 files

Conflicts (skipped, policy = skip):
  IMG_0001.jpg → D:\Photos\2026\2026-08\IMG_0001.jpg exists, DIFFERENT content
  IMG_0002.jpg → same folder, exists, IDENTICAL (already filed)
  scan.pdf and scan (1).pdf → both map to D:\Archive\Downloads\2024\scan.pdf

Risky rows:
  All moves cross volumes (C: → D:): each file is copied, hash-checked, then
  its source moved to quarantine/2026-10-11-01/_moved-sources/ until the run
  verifies. Space needed on D: 23.0 GB (free: 410 GB).
  12 photos have EXIF year 2009 (camera clock?) — listed in plan.csv, rows 401–412.

Full plan: runs/2026-10-11-01/plan.csv (1,284 rows)
Undo: ask me to undo run 2026-10-11-01; nothing is deleted.

Apply run 2026-10-11-01?
```

The user looks at the 2009 photos, says those are from a borrowed camera
with a wrong clock, and asks to use the modified date for that camera model.
The rule gains an exception; the plan is rebuilt and shown again (only the
changed counts and rows). Approved.

## 5. Apply

- `safe-system-changes` journal entry opened: Run 2026-10-11-01, tier Low
  (user files, fully reversible), no restore point needed (no system state
  changes), recorded as such.
- Each row re-checked, applied, manifest row written. Cross-volume moves:
  copy, hash compare, source to a holding folder in quarantine.
- At row 611, `D:\Photos\2026\2026-09\IMG_4410.heic` appeared (the user's
  phone sync dropped it in during the run): row skipped as
  `skipped-changed`, run continued.
- After the last row: inventory count reconciled. 1,284 = 935 applied
  (833 filed + 102 quarantined) + 3 conflicts skipped + 1 skipped-changed
  + 4 in use or partial + 341 left in place.
- Sample check: 30 random destinations exist with matching size; every
  quarantined file present. Holding folder of moved sources: hashes match
  the destinations, so it is listed in quarantine for the user's review.
- Undo dry-run against the manifest: 935 rows ready, 0 conflicts.

## 6. Summary to the user

```text
Done. Run 2026-10-11-01.
- 833 files filed to D:\Archive and D:\Photos.
- 102 files in quarantine (installers and duplicates, 12.0 GB), plus the
  original copies of everything moved off C: (they are safe to empty after
  you've checked the new locations).
- Nothing deleted. Quarantine: <workspace>\quarantine\2026-10-11-01
- Skipped: 3 conflicts, 1 file that changed during the run, 4 in use or
  still downloading (list in the journal).
- To reverse: "undo run 2026-10-11-01".
- Journal: <workspace>\journal\CHANGES.md
```

## 7. The weekly schedule

Only now, and only with a written contract per `scheduled-run-discipline`:

- Purpose: apply `rules/downloads.rules.yaml` to Downloads, top level.
- Grant: `move` within rules; quarantine *exact duplicates* only, at most
  50 per run. Old-installer quarantine and all conflicts become proposals.
- Caps: 300 operations, 5 GB, 15 minutes.
- Lock, run log, plan and manifest under `runs/<run id>/`; summary at the top.
- Trigger: weekly, Sunday 18:00, run when available if missed.

Verification before enabling: run it once by hand with the same contract,
run it twice (the second run should find only new files), and confirm a
conflict is reported, not resolved.
