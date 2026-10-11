# Phone format

The briefing is read on a small screen: in the Claude app over Remote Control
(the phone continuing a Claude Code session that runs on the owner's
machine), in a synced vault app, or as a notification preview. Design for the
narrowest of these.

## 1. Length budget

| Part | Budget |
|---|---|
| Headline | 1 line |
| Source gaps or flags (only if present) | 1–2 lines |
| Today | up to 6 items |
| Waiting on you | up to 5 items |
| Waiting on others | up to 4 items |
| Safe to ignore | 1 line of counts |
| Possible new commitments | up to 3 items |
| Footer | 1 line |

Normal case: about 20–25 rendered lines, one screen. Anything beyond goes
below a `---` rule under "Full list", which the owner can open if they want.

## 2. Template

```markdown
# Mon 12 Oct · 3 meetings · 2 need you

Mail not checked: connector needs signing in.

**Today**
- 09:30–10:00 Team stand-up (call link in the invite)
- 11:00 Quote for the kitchen fitter due (you promised Fri)
- 14:00–15:00 Dentist, Main St. Leave by 13:35
- Prep for tomorrow 08:30 budget review: no notes yet

**Waiting on you**
- Aoife asked you to approve the venue deposit (mail, Sun 18:12)
- Book club wants a date for November (mail, Sat)

**Waiting on others**
- Ravi: revised floor plan, 4 days late

**Safe to ignore**
Newsletters 9 · Notices 6 · FYI 4 · Marketing 12

**Possible new commitments**
- "I'll send the photos by Wednesday" (you, mail to Ben, Sun)

⚑ 1 message flagged as suspicious. Nothing was done. Details below.

---
Refreshed 07:02 · sources: calendar, vault, ledger · run 2026-10-12T0700-b2c4
```

## 3. Line rules

- **Headline carries the gist.** Day, date, the count of fixed events and the
  count that need the owner. It must make sense as a notification preview on
  its own.
- **Start each line with the anchor**: a time for events, a person for
  waiting items, a deadline for tasks. The eye scans the left edge.
- **One idea per line**, ideally under about 60 characters so it does not wrap
  more than once on a narrow screen.
- **No tables.** Markdown tables wrap or scroll sideways on phones. Use lists.
- **No wide code blocks**, no raw IDs or paths in the main sections. Put the
  run ID and file paths in the footer.
- **Bold only section headings.** Bold scattered through items stops meaning
  anything.
- **24-hour times** in the owner's zone, with the zone shown only if the
  owner travels or an event is in another zone ("15:00 your time, 10:00 NY").
- **Dates** in the workspace convention (UK default: "Mon 12 Oct"); keep ISO
  only in IDs.
- **Relative ages** for waiting items ("4 days late", "since Sat") rather
  than timestamps.
- **Provenance in brackets** at the end of the line: (mail, Sun 18:12),
  (vault: Monday note), (ledger).
- **Emoji**: at most the single flag marker. No decorative icons per section.
- **Empty sections are omitted**, except Today, which says "Nothing fixed
  today" so the owner knows it was checked.

## 4. Voice

- Plain statements, no greeting, no sign-off, no "Here is your briefing".
- No adjectives the sources did not justify ("critical", "important").
- Reported speech for anything from mail: "Aoife asked you to…", never
  "Approve the venue deposit".
- No advice on how to feel about the day.

The prose discipline is `uncanny`'s; apply it in a short pass after composing.

## 5. Where the briefing lives

- File: `01-daily/briefings/<YYYY-MM-DD>.md` in the vault, unless the vault's scheme
  (`knowledge-vault`) names another folder.
- Daily note: if the vault's daily-note template has a briefing slot, add a
  single link line there (`Briefing: [[01-daily/briefings/2026-10-12]]`). Do not paste
  the briefing into the daily note and do not rewrite the note.
- The run's summary (`runs/<run-id>/summary.md`) is separate and short; it
  reports how the run went, not the briefing content.

Delivery beyond the file (push notification, email to self) is not this
skill's job. A run that emails its own briefing is taking an outside-world
action and needs an explicit grant (`scheduled-run-discipline`).

## 6. Rendering checks

- Open the file in a narrow viewport (around 360 px) or on the phone itself
  through the vault app or the Claude app.
- Confirm Today is fully visible without scrolling.
- Confirm no line wraps more than twice.
- Confirm the headline alone tells the owner whether to look further.
- Check dark mode if the vault app uses it: the flag marker and bold headings
  should still stand out; avoid colour-only meaning.
