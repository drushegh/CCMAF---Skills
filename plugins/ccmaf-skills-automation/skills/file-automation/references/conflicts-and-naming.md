# Conflicts and Naming

Most file-automation damage happens at the destination: two files want the
same name, a template produces an illegal name, or a case-only rename
silently does nothing. Decide all of it at plan time.

## Conflict kinds

| Kind | Detected how | Typical cause |
|---|---|---|
| `exists-identical` | Destination exists, same size and same hash | File already filed by an earlier run or by hand |
| `exists-different` | Destination exists, different content | Two different files with the same name (`scan.pdf`, `IMG_0001.jpg`) |
| `in-plan-collision` | Two plan rows map to one destination | A template that drops distinguishing parts of the name |
| `case-only` | Source and destination differ only by case | Normalising extensions or capitalisation |
| `illegal-name` | Destination fails the naming checks below | Template output, names from other systems |
| `path-too-long` | Full destination path over the limit | Deep archive trees, long source names |
| `type-clash` | A file where a folder is needed, or the reverse | Destination `2026` exists as a file |

## Policies

Ask the user once per run; default to `skip`.

| Policy | Behaviour | Fits when |
|---|---|---|
| `skip` (default) | Leave the source in place, report it | Always safe; good first run |
| `suffix` | Add ` (2)`, ` (3)`… before the extension; never reuse a number | Different files that genuinely share a name (camera counters, scans) |
| `identical-quarantine-source` | If hash-identical, quarantine the source; otherwise fall back to `skip` | Re-running a filing rule over a folder that was partly filed before |
| `keep-newer-quarantine-older` | Newer by modified date goes to the destination; older goes to quarantine | Only with the user's explicit agreement; dates can mislead |
| `ask` | Collect conflicts into a list, apply everything else, present the list | Interactive runs with a handful of conflicts |

Never: overwrite, "replace if newer" with the tool's own logic, or merge two
folders by letting one win.

Conflicts are resolved against the plan, not discovered during the run. If
a destination becomes occupied between planning and applying, the row is
`skipped-changed`, not resolved on the fly.

## Rename templates

- Build names from `{stem}` + fixed text + fields, and always re-append the
  original `{ext}` unchanged. Normalising extension case (`.JPG` to `.jpg`)
  is a separate, explicit rule.
- Zero-pad counters and dates (`2026-09-03`, `_007`) so names sort.
- Use ISO dates (`yyyy-MM-dd`); avoid `:` in times (illegal on Windows).
- Trim and collapse whitespace; replace characters that are illegal on any
  target platform, not just the current one, if files may move between them.
- Keep names under about 100 characters; the folder path eats the rest.
- Preview the template on the ten longest and ten oddest names in the
  inventory before it enters the plan.

## Windows naming rules (check every destination)

From the Windows file-naming documentation (verify against the current
"Naming Files, Paths, and Namespaces" page):

- Illegal characters: `< > : " / \ | ? *` and control characters 0–31.
- Reserved device names, with or without an extension: `CON`, `PRN`, `AUX`,
  `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9` (so `NUL.txt` is also a problem).
- No trailing space or full stop in a file or folder name; Explorer and many
  tools strip them, so `report .pdf` and `report.pdf` may collide.
- Classic `MAX_PATH` is 260 characters for the full path. Long-path support
  exists on Windows 10 1607 and later but needs both the system opt-in and an
  application that declares support; treat 260 as the working limit for
  anything Explorer, Office or older tools will open (verify per tool).
- Case-insensitive but case-preserving by default: `A.txt` and `a.txt` are
  the same file.

## macOS and Linux notes

- Linux file systems are usually case-sensitive: `A.txt` and `a.txt` can
  coexist, and they collide when copied to Windows, macOS or most USB drives
  (exFAT/FAT32). Check for case-only pairs before a cross-platform move.
- macOS APFS is case-insensitive by default; names are stored with Unicode
  normalisation that can differ from what Windows or Linux produced, so the
  "same" accented name can compare unequal. Normalise (NFC) before comparing
  names from different systems.
- `/` is the only illegal character on POSIX, but `:` is shown as `/` in the
  macOS Finder; avoid both.
- FAT32 has a 4 GiB per-file limit; exFAT and NTFS do not.

## Case-only renames

On case-insensitive file systems a direct rename may be a no-op or fail.
Two-step it, and record both steps in the manifest:

```powershell
Rename-Item -LiteralPath 'D:\Photos\IMG_0001.JPG' -NewName 'IMG_0001.jpg.tmp-rename'
Rename-Item -LiteralPath 'D:\Photos\IMG_0001.jpg.tmp-rename' -NewName 'IMG_0001.jpg'
```

```bash
mv -- 'IMG_0001.JPG' 'IMG_0001.jpg.tmp-rename' && mv -- 'IMG_0001.jpg.tmp-rename' 'IMG_0001.jpg'
```

## Dates in names and folders

| Date | Reliable for | Caveat |
|---|---|---|
| Modified | "When was this last changed" | Some copy tools reset it; editing a photo changes it |
| Created | Rarely reliable | Resets on copy to another volume on Windows; not stored on many Linux file systems |
| EXIF `DateTimeOriginal` | Photos | Missing on screenshots and edited exports; camera-local time with no time zone |
| Name-embedded date (`IMG_20260903_…`) | Phone photos, scans | Parse strictly; reject impossible dates |

State in the rule which date is used and the fallback order. Show in the
plan how many files used the fallback, so a wrong-year camera clock is
spotted before 900 photos land in `1970/`.

## Literal paths

Use literal-path parameters and quoting everywhere. In PowerShell, `-Path`
treats `[` and `]` as wildcards, so `photo[1].jpg` is not found or, worse,
matches something else; use `-LiteralPath`. In shell, always quote and use
`--` before file arguments so a name starting with `-` is not read as an
option.
