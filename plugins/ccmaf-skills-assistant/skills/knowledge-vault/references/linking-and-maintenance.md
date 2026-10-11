# Linking and link maintenance

Links are what make a folder of files a vault. They are also the first
thing to break when notes are renamed outside the editor.

## Link syntax (Obsidian, verified against the Obsidian help, October 2026)

| Need | Wikilink | Markdown link |
|---|---|---|
| Another note | `[[Boiler service]]` | `[Boiler service](Boiler%20service.md)` |
| Note in a folder (to disambiguate) | `[[03-areas/Home/Boiler service]]` | `[Boiler service](03-areas/Home/Boiler%20service.md)` |
| Custom display text | `[[Boiler service\|the boiler]]` | `[the boiler](Boiler%20service.md)` |
| A heading | `[[Boiler service#2026 visit]]` | `[2026 visit](Boiler%20service.md#2026%20visit)` (verify encoding) |
| A heading in the same note | `[[#2026 visit]]` | |
| A block | `[[Boiler service#^last-visit]]` | |
| Embed a note, heading or image | `![[Boiler service#2026 visit]]`, `![[boiler-plate.jpg]]` | |
| Non-markdown file | `[[Manual.pdf]]` (extension required) | `[Manual](Manual.pdf)` |

(Inside a markdown table the `|` in a wikilink alias has to be escaped as
`\|`, as above; outside a table write `[[Boiler service|the boiler]]`.)

Notes:

- Markdown links need spaces URL-encoded as `%20`. Obsidian generates
  wikilinks unless "Use [[Wikilinks]]" is turned off in Settings, Files and
  links.
- Block IDs: put ` ^last-visit` at the end of a paragraph, or on its own
  line (with blank lines around it) after a list, quote, callout or table.
  IDs use Latin letters, numbers and dashes only. Block links do not work
  outside Obsidian, so do not rely on them for anything that must survive
  a change of editor.
- An **alias** (in the note's `aliases` property) lets `[[Boiler]]` find
  `Boiler service.md` in autocomplete; Obsidian then writes
  `[[Boiler service|Boiler]]`. From scripts, write the real file name with
  display text; do not write `[[Boiler]]` and hope.

## When to link

- Link the first mention of a person, project, place or concept that has
  (or deserves) its own note. Do not link every mention.
- Every filed note links to at least one existing note. An unlinked note
  is lost the day its folder is forgotten.
- Prefer a link plus a sentence of context over a bare list of links:
  "Quote from [[Ada Example]] came in higher than last year's" carries the
  reason for the link.
- Links to notes that do not exist yet are allowed in Obsidian (they show
  as unresolved and create the note when clicked). Use them deliberately;
  an assistant should not create unresolved links by accident.

## Read-only maintenance checks

Run from the vault root (Git Bash, WSL, Linux or macOS). These only read.

Broken wikilinks (targets with no matching file name and no alias):

```bash
# All distinct wikilink targets, without heading/block/alias parts
grep -rhoE '\[\[[^]|#^]+' --include='*.md' . | sed 's/^\[\[//' | sort -u > /tmp/targets.txt
# All note names (basename without .md) plus attachment names with extension
find . -path ./.obsidian -prune -o -type f -print | sed 's|.*/||; s|\.md$||' | sort -u > /tmp/names.txt
# Targets that match no file (path-qualified targets need the last segment only)
sed 's|.*/||' /tmp/targets.txt | sort -u | comm -23 - /tmp/names.txt
```

Then check each reported target against `aliases:` before calling it
broken (`grep -rl "^  - <name>$" --include='*.md' .`). Use a scratch
directory rather than `/tmp` where the harness provides one.

Orphans (notes nothing links to), excluding daily notes and templates:

```bash
find . -name '*.md' -not -path './01-daily/*' -not -path './90-templates/*' \
  -not -path './.obsidian/*' | while read -r f; do
  n=$(basename "$f" .md)
  grep -rqF "[[$n" --include='*.md' . || echo "$f"
done
```

These scripts are approximate (they ignore markdown-style links and case
rules). Treat the output as a list to review, never as a list to delete.
In Obsidian, the core Backlinks and Outgoing links panes, and the graph,
give the same information interactively.

Leftover conflict markers and sync-conflict copies:

```bash
git grep -n -E '^(<<<<<<<|=======$|>>>>>>>)' -- '*.md'
find . -name '*sync-conflict*' -o -name '*conflicted copy*' -o -name '* (1).md'
```

## Safe renames and moves from outside Obsidian

Renaming inside Obsidian (with "Automatically update internal links" on)
fixes links for you. Renaming from a script or an agent does not.

Procedure for a scripted rename of `Old name.md` to `New name.md`:

1. Find references: `grep -rnF '[[Old name' --include='*.md' .` and
   `grep -rnF '](Old%20name' --include='*.md' .`.
2. Show the user the rename and every file whose links will change.
3. On approval, `git mv "Old name.md" "New name.md"` (keeps history
   readable), then replace `[[Old name]]`, `[[Old name|`, `[[Old name#`
   and the markdown form, and nothing else.
4. Add the old title to the new note's `aliases` so old habits still find
   it.
5. Verify: no remaining `[[Old name` references; the broken-link check is
   clean; `git diff --stat` touches only the expected files.
6. Commit as one change: `vault: rename "Old name" to "New name" (+N link updates)`.

For bulk moves (archiving a project folder, re-filing many notes) use the
same steps per note, record the batch in the change journal with a
reverse-move list (`safe-system-changes`), and commit the batch as one
commit so it can be reverted in one go. Wikilinks without a folder path
survive moves as long as names stay unique; check for duplicate names
first:

```bash
find . -name '*.md' -not -path './.obsidian/*' | sed 's|.*/||' | sort | uniq -di
```

## Tag and property clean-ups

- List tag variants: `grep -rhoE '(^|\s)#[A-Za-z][A-Za-z0-9/_-]*' --include='*.md' . | sort | uniq -c | sort -rn`
  (also check `tags:` lists in properties).
- Propose a mapping (`#ideas` to `#idea`), get approval, apply, verify the
  old variant no longer appears.
- Property renames follow the same pattern. Obsidian's Format converter
  core plugin can update deprecated `tag`/`alias`/`cssclass` properties in
  bulk; prefer it inside the app.
