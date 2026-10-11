# Daily notes and templates

## Daily notes

The daily note is the default place to write anything that happens today:
a log, quick thoughts, meeting jottings, links to the notes touched. It is
the spine of the vault, and the easiest thing for an assistant to append to
without disturbing anything else.

### Obsidian set-up (core plugin "Daily notes")

| Setting | Recommended value | Note |
|---|---|---|
| Date format | `YYYY/YYYY-MM-DD` | Moment.js tokens; a `/` in the format creates sub-folders, so this gives one folder per year. Default is `YYYY-MM-DD` |
| New file location | `01-daily` | |
| Template file location | `90-templates/Daily` | |
| Open daily note on startup | User's choice (verify setting name in current version) | |

Changing the date format later does not rename old notes. Never bulk-rename
historic daily notes to a new format unless asked; links to them would
need updating too.

### A daily note template

```markdown
---
created: "{{date}}"
tags:
  - daily
---

# {{date:dddd D MMMM YYYY}}

## Plan
- [ ]

## Log

## Captured
<!-- quick notes; move anything lasting into its own note during inbox processing -->

## Links
```

The core Templates plugin cannot compute yesterday's or tomorrow's date, so
the template has no previous/next links. If the user wants them,
either write them during the morning pass (an assistant can do this) or use
a community plugin that supports date arithmetic, with Restricted mode
turned off knowingly (see `personal-data-care` on plugin trust).

### Appending to the daily note (agent rules)

- Find today's note by the configured format; create it from the template
  only if it does not exist. Never create a second note for the same day.
- Append under the right heading; do not reorder or rewrite existing
  lines.
- Prefix assistant-written lines so the user can tell them apart if they
  want (for example `- (assistant) Booked NCT reminder, see [[Car]]`), or
  follow whatever convention they already use.
- Time-stamp log entries with 24-hour local time: `- 14:20 Called the
  garage`.
- When in doubt whether something belongs in the daily note or its own
  note: daily note now, file it during inbox processing.

## Templates

### Core "Templates" plugin

- Set Settings, Core plugins, Templates, "Template folder location" to
  `90-templates`.
- Variables: `{{title}}` (the note's title), `{{date}}` (default
  `YYYY-MM-DD`), `{{time}}` (default `HH:mm`). Add a Moment.js format after
  a colon: `{{date:YYYY-MM-DD}}`, `{{time:HH:mm}}`.
- In properties, quote variables (`created: "{{date}}"`). Obsidian's help
  warns that the Properties editor in Live Preview can overwrite unquoted
  template variables; edit templates in Source mode.

Community template plugins add scripting (date arithmetic, prompts, file
moves). They are optional and run code with full access to the machine;
treat them as a deliberate choice, not a default.

### A small template set

Keep it to the templates the user actually uses. A typical set:

| Template | Use | Key properties |
|---|---|---|
| `Daily` | Daily note | `created`, `tags: [daily]` |
| `Meeting` | One meeting | `created`, `attendees` (links to people notes), `tags: [meeting]` |
| `Project` | Something with an end | `status`, `due`, `tags: [project]` |
| `Person` | Someone the user deals with | `aliases`; no birthdays, addresses or health detail unless the user asks (`personal-data-care`) |
| `Weekly review` | The weekly pass | `created`, `tags: [review]` |

Meeting template example:

```markdown
---
created: "{{date}}"
attendees:
  -
tags:
  - meeting
---

# {{title}}

## Agenda

## Notes

## Decisions

## Actions
- [ ] Who — what — by when
```

Actions written as `- [ ] Who — what — by when` are easy for
`commitments-tracker` to pick up.

## Periodic reviews

| Review | When | What |
|---|---|---|
| Daily close | End of day, two minutes | Tick or move open `- [ ]` items, note tomorrow's first task |
| Weekly | Same day each week | Empty the inbox, review projects and `#waiting`, archive finished projects |
| Monthly | First weekend | Tag and property clean-up, broken-link scan, check sync health on all devices |

Weekly and monthly reviews are good candidates for an assistant to prepare
(a draft review note listing what it found) and for the user to act on.
If they run on a schedule, follow `scheduled-run-discipline`: the run
drafts the review note and proposes moves; it does not move or archive
notes on its own.
