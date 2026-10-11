# Ledger format

The ledger is a folder of small markdown notes plus one index note. Plain
files keep it readable on a phone, diffable in git, and usable with or
without Obsidian. Where it sits in the vault is `knowledge-vault`'s decision;
the default used here is `03-areas/commitments/` (an ongoing area in its
default layout).

## 1. Layout

```text
03-areas/commitments/
  index.md                       # generated list of non-archived entries
  c-2026-10-12-01 photos-to-ben.md
  c-2026-10-12-02 certificate-from-electrician.md
  capture-log.md                 # proposals rejected or merged, one line each
  reviews/
    2026-W41.md                  # weekly review notes
  archive/
    2026/
      c-2026-09-30-01 quote-to-okafor.md
```

File name: `<id> <short-slug>.md`. The id makes it unique and sortable; the
slug makes it readable in a file list. If the vault avoids spaces in file
names, use a hyphen instead (follow the vault convention).

## 2. Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | `c-<created date>-<two-digit sequence>`; never reused |
| `direction` | yes | `i-owe` or `owed-to-me` |
| `who` | yes | The other party, as the owner refers to them; link to a person note if the vault has them (`[[Ben Moran]]`) |
| `what` | yes | The deliverable, phrased as an outcome ("Send the site photos") |
| `said` | yes for extracted | The original words, quoted, shortest span that carries the promise |
| `due` | if any | ISO date (or date-time if a time was given) |
| `due_kind` | yes | `firm` (a stated date), `soft` (normalised from vague words), `none` |
| `status` | yes | See §3 |
| `source` | yes | Where it came from: "call with Ben, 11 Oct", "mail from Ravi, 2026-10-08 09:14", "owner said in chat" |
| `created` | yes | Date captured |
| `confirmed` | for extracted | Date the owner confirmed; absent means still `proposed` |
| `next_nudge` | for open | Next date to remind (i-owe) or consider chasing (owed-to-me) |
| `review_by` | when `due_kind: none` | Date to look again |
| `history` | when changed | List of `date: event` lines (renegotiated, nudged, closed) |
| `closed` | when closed | Date and one-line reason |

Keep the body short: one or two lines of context at most. The note is a
record, not a diary.

## 3. Statuses

| Status | Meaning | Lives in |
|---|---|---|
| `proposed` | Extracted, awaiting the owner's yes | `03-areas/commitments/` |
| `open` | Confirmed and live | `03-areas/commitments/` |
| `renegotiated` | Live, due changed by agreement; history shows the old due | `03-areas/commitments/` (treat as open) |
| `done` | Delivered or received | `archive/<year>/` after the weekly review |
| `dropped` | Owner decided not to pursue, or the other party withdrew | `archive/<year>/` after the weekly review |

A rejected proposal is not kept as a note; it gets one line in
`capture-log.md` (date, source, quote, "rejected by owner") so the same
extraction is not proposed again.

## 4. History

Append, never overwrite:

```yaml
history:
  - 2026-10-12: created from mail (proposed)
  - 2026-10-12: confirmed by owner
  - 2026-10-15: nudge drafted (gentle)
  - 2026-10-17: renegotiated, due 2026-10-14 → 2026-10-21 ("waiting on the lab")
```

Three or more renegotiations is a pattern worth mentioning in the weekly
review.

## 5. The index note

`index.md` is regenerated from the notes, never hand-edited. Group for phone
reading:

```markdown
# Commitments — updated 2026-10-12 07:00

## I owe (3)
- Wed 14 Oct · Ben · site photos
- Fri 16 Oct · Okafor · revised quote (soft)
- no date · Book club · pick November date (review 26 Oct)

## Owed to me (2)
- 5 days late · Electrician · certificate
- Fri 16 Oct · Ravi · revised floor plan

## Proposed (1)
- "I'll send the tile samples list by Thursday" (mail, Fri) · confirm?
```

If the owner uses the Dataview community plugin in Obsidian, a live query can
replace the generated index. It is optional and the plain index must still
work without it; check query syntax against the plugin's documentation
(verify), for example:

```text
TABLE who, what, due FROM "commitments"
WHERE status = "open" OR status = "renegotiated"
SORT due ASC
```

## 6. Integrity checks

Run after any bulk change (capture batch, weekly review):

- Every note in `03-areas/commitments/` (excluding `index.md`, `capture-log.md`,
  `reviews/`) has the required fields and a valid status.
- Every non-archived note appears once in the index, and every index line
  points to a note. A quick check from the vault root:

  ```bash
  grep -l '^status: \(open\|renegotiated\|proposed\)' 03-areas/commitments/c-*.md | wc -l
  ```

  The count must equal the number of entries in the index.
- No `done` or `dropped` note lingers outside `archive/` after a review.
- No duplicate ids.
- No `open` item without either `due` or `review_by`.

## 7. Writes and sync

- Write each note atomically (temp file, then rename) so a sync mid-write
  never picks up half a file.
- Pull before a batch of edits and commit or sync after, per
  `knowledge-vault`. If a conflict copy appears, merge by `id` and keep both
  histories.
- Moving closed notes to `archive/` is a move within the vault, not a delete.
  Do it during the weekly review with the owner's agreement, or under an
  explicit `move-in-workspace` grant in a scheduled run.
