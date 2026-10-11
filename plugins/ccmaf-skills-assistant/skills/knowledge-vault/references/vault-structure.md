# Vault structure: folders, names, properties, tags

The aim is a vault where any note can be filed in under ten seconds and
found again without remembering where it was filed. Structure serves
retrieval; it is not a taxonomy project.

## Folders: type, not topic

Folders should answer one question: *what kind of note is this?* Topic is
carried by links and properties, because a note about "boiler service" is
both home admin and money and a supplier contact, and a folder can only
hold it once.

Rules:

- Keep the top level under about ten folders. Numbered prefixes (`00-`,
  `01-`) fix the sort order in every file browser, including phones.
- Nest at most two levels below a top folder. If a folder needs a third
  level, it probably wants a hub note with links instead.
- Every folder has a clear "what goes here" sentence. Write it in a
  `README.md` or in the hub note if the user forgets.
- `90-templates/` holds only templates. `99-archive/` holds finished
  material, keeping its original sub-path so links and context survive.
- `attachments/` (or the Obsidian setting "Default location for new
  attachments") keeps binaries out of the note folders.

### Mapping common methods onto the default layout

| Method | Mapping |
|---|---|
| PARA (Projects, Areas, Resources, Archive) | `02-projects`, `03-areas`, `04-resources`, `99-archive` as in the default |
| Zettelkasten-style | Add `06-notes/` for atomic permanent notes named by idea; links do the work; folders stay flat |
| Johnny.Decimal | Replace top level with the user's `10-19` areas and `11.01` IDs; keep inbox and templates outside the numbering |
| "Just one folder" | Valid for small vaults. Keep inbox, daily and templates separate; everything else flat |

Do not migrate a working vault from one method to another unless asked.
If asked, plan it as a bulk move (see `linking-and-maintenance.md`, safe
renames) and do it in stages the user can review.

## Note names

- Human titles, sentence case: `Boiler service.md`, `Ada Example.md`,
  `2026 car insurance renewal.md`.
- The title is the link text, so name for how you will type the link.
- Dates at the start when the note is about a dated event:
  `2026-10-11 Parents' evening.md`. Daily notes are just the date.
- Avoid characters Windows, Android or Obsidian reject or treat specially:
  `\ / : * ? " < > |`, `#`, `^`, `[ ]`, and a leading dot. `#` and `^`
  break heading and block links.
- No two names that differ only by case, and no names longer than about
  100 characters (paths on Windows have limits; phone sync tools differ).

## Properties (YAML at the top)

Obsidian stores structured data as YAML between `---` lines at the very
top of the file. Each property name is unique within a note, and a
property's type applies vault-wide.

```markdown
---
created: 2026-10-11
tags:
  - home
  - waiting
aliases:
  - Boiler
  - Heating service
status: active
---
```

Rules:

- Default properties: `tags`, `aliases` and `cssclasses`, all lists. The
  singular forms `tag`, `alias` and `cssclass` were deprecated in Obsidian
  1.4 and lose default support from 1.9; write the plural forms.
- Dates as `YYYY-MM-DD`, date-times as `YYYY-MM-DDTHH:MM:SS`.
- Keep a small, agreed property set: `created`, `tags`, `aliases`,
  `status`, perhaps `due` and `source`. Each new property is a schema change
  for the whole vault.
- Quote values that contain a colon, start with a special character, or are
  template variables: `title: "Meeting: budget"`, `date: "{{date}}"`.
- Never put secrets, account numbers or health detail in properties; they
  are indexed and shown in search (`personal-data-care`).

## Tags

Use tags for *state* and *cross-cutting labels*, not topics:

- Status: `#waiting`, `#someday`, `#todo` (if the user does not use a task
  plugin).
- Kind, only when folders do not already say it: `#meeting`, `#recipe`.
- Nested tags are allowed (`#home/garden`) but each level is another thing
  to remember. Prefer links for topics.

Keep a `Tags.md` hub listing the agreed tags. When variants appear
(`#idea`, `#ideas`), propose a confirmed bulk fix.

## Starter `.gitignore`

```gitignore
# Editor UI state: changes constantly, conflicts on every sync
.obsidian/workspace.json
.obsidian/workspace-mobile.json

# Obsidian's own trash folder (keep it out of the remote)
.trash/

# OS clutter
.DS_Store
Thumbs.db
desktop.ini

# Sync tools that must not be layered on git
.stfolder/
.stversions/
*.sync-conflict-*
```

Decide with the user whether the rest of `.obsidian/` is shared:

| Choice | Effect |
|---|---|
| Track `.obsidian/` except workspace files (default) | Same settings, hotkeys and enabled plugins on every device |
| Also ignore `.obsidian/plugins/` | Plugins installed per device; settings still shared |
| Ignore all of `.obsidian/` | Each device configured separately; fewest conflicts |

Back up `.obsidian/` before changing this choice: a pull that removes
tracked config files deletes them locally too.

## Starter `.gitattributes`

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.pdf binary
```

This stops Windows editors and git's `core.autocrlf` from rewriting every
line ending, which otherwise shows up as whole-file changes and conflicts.
Add it before the first commit if possible; adding it later needs a
one-off `git add --renormalize .` commit.

## Hub notes (maps of content)

A hub note is an ordinary note that links to the notes on one topic, with
a sentence of context per link. Create one when a topic has more than about
eight notes or when a folder would otherwise grow a third level. Hubs live
next to their topic (`04-resources/Cooking.md`) or in the area they serve.
Keep them curated by hand; generated lists of every note on a tag are what
search is for.
