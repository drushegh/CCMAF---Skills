# Conflict prevention and resolution

A sync conflict in a vault is two versions of the user's own writing. The
only wrong resolution is one that silently throws a version away. Speed
does not matter; nothing is on fire.

## Prevention (in order of effect)

1. **Pull when you open, push when you close**, on every device.
2. **One sync mechanism only.** Layered sync tools manufacture conflicts.
3. **Ignore editor state files** (`.obsidian/workspace.json`,
   `workspace-mobile.json`).
4. **Stable line endings** via `.gitattributes` (`* text=auto eol=lf`).
5. **No whole-file rewrites.** Agents append and edit minimally; formatters
   and "tidy all notes" runs are done on one device, committed, and pulled
   everywhere before anyone edits again.
6. **Sensible auto-sync intervals** (10 to 30 minutes) rather than every
   minute on both devices.
7. **Separate write zones** for things edited on both devices: the phone
   appends under `## Captured` in the daily note, the PC writes under
   `## Log`. Different lines rarely conflict.

## Kinds of conflict and what they look like

| Kind | How it shows | Typical cause |
|---|---|---|
| Git content conflict | `git pull` reports `CONFLICT (content)`; markers in the file | Same lines edited on two devices |
| Git modify/delete | `CONFLICT (modify/delete)` | Note deleted or moved on one device, edited on the other |
| Git rename/rename | Two different new names for one note | Renamed differently on two devices |
| Mobile plugin stuck | Plugin error, half-finished merge, app hangs | Memory limits of mobile git on a large vault |
| Syncthing | Extra file `Note.sync-conflict-YYYYMMDD-HHMMSS-<device>.md` (verify exact pattern) | Same file changed on two devices between syncs |
| Cloud drive | `Note (1).md`, `Note-DESKTOP.md`, "conflicted copy" | Two sync tools, or offline edits |

## Git conflict: the procedure

Do this on the PC where possible; desktop git is reliable.

1. **Stop and look.** `git status` lists the conflicted files. Do not run
   `git checkout --theirs/--ours`, `git reset --hard`, `git push --force`
   or `git merge --abort` as a reflex.
2. **Back up first.** Copy each conflicted file to a scratch folder outside
   the vault (or note that `git stash` is *not* the tool here: a merge in
   progress cannot be stashed).
3. **Read each conflict.** With `merge.conflictstyle zdiff3` a block looks
   like:

   ```text
   <<<<<<< HEAD
   - 14:20 Called the garage, booked for Thursday
   ||||||| base
   =======
   - 14:05 Garage rang back, quote €240
   >>>>>>> origin/main
   ```

   `HEAD` is this device's version, the part after `=======` is the other
   device's, and the middle section is what both started from.
4. **Resolve by keeping both unless they truly contradict.** For notes,
   the right answer is almost always "both lines, in time order". Where
   they contradict (two different values for the same fact), keep both and
   ask the user, or write both with a marker the user will see:

   ```markdown
   - 14:05 Garage rang back, quote €240
   - 14:20 Called the garage, booked for Thursday
   ```

5. **Remove every marker**, then check:
   `git grep -n -E '^(<<<<<<<|=======$|>>>>>>>)' -- '*.md'` returns
   nothing. (A `=======` line can be legitimate markdown, a setext heading
   underline; check context before deleting one.)
6. **Properties need extra care.** A merged YAML block must still be valid:
   one `---` at top and bottom, no duplicate property names, lists still
   lists. Merge `tags` as the union.
7. **Finish:** `git add <files>`, `git commit` (accept or improve the merge
   message), `git push`.
8. **Sync the other device** before anyone edits there again.
9. **Tell the user** what conflicted and how it was resolved, in one or two
   lines, naming any place where you had to choose.

Modify/delete: the default is to keep the edited version (restore it with
`git add <file>`) and ask the user whether the deletion was intended. A
note someone was still writing in is rarely meant to be gone.

Rename/rename: keep one name (ask), add the other as an alias, and fix
links (`linking-and-maintenance.md`).

## Conflicts on the phone

Mobile git clients vary in how they show conflicts (verify the specific
app). The safe pattern:

1. Do not resolve complicated conflicts on the phone.
2. Commit the phone's local changes if the app allows, and stop.
3. Resolve on the PC (the procedure above), push.
4. On the phone, pull. If the phone's copy is in a broken state and its
   local changes are already safe on the remote, re-clone. If its local
   changes are **not** on the remote, copy the changed notes out first
   (share or export them), re-clone, then paste them back into the vault as
   new notes or merge them by hand.

## Syncthing and cloud-drive conflict copies

1. List them (`find . -name '*sync-conflict*'` and similar patterns from
   `linking-and-maintenance.md`).
2. For each, diff it against the main file (`git diff --no-index` works on
   any two files) and merge the unique content into the main note.
3. Only after the user confirms the content is merged, move the conflict
   copy to `.trash/`. Never bulk-delete conflict copies unread; some hold
   the only copy of an edit.

## Recovering lost edits

Git rarely loses committed work. If something seems gone:

- `git log --all --oneline -- "path/to/Note.md"` shows every commit that
  touched the note, on every branch and the remote-tracking branch.
- `git show <commit>:"path/to/Note.md"` prints an old version; save it to a
  new file and compare.
- `git reflog` shows where `HEAD` has been, including commits "lost" by a
  reset or a bad merge; `git branch rescue <sha>` keeps one safe.
- Uncommitted edits overwritten by a hard reset are not recoverable by git.
  Check Obsidian's File recovery core plugin (local snapshots, verify
  retention setting) and Obsidian Sync history if the user pays for it.

## When the history itself must change

Removing a secret or sensitive note from history is not conflict handling;
it is redaction with history rewrite, it requires force-pushing and
re-cloning every device, and it is covered in `personal-data-care`
(`references/redaction-procedure.md`). Never do it to "clean up" a messy
merge.
