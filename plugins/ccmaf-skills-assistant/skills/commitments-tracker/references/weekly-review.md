# Weekly review

The weekly review is where the ledger stays honest. Daily surfacing catches
what is due; the review catches what is drifting, what was never confirmed,
and what should be let go. It takes the owner about ten minutes if the
ledger is in good shape.

## 1. When

- Default: Friday afternoon or Monday morning, whichever the owner prefers;
  set it once in the vault's briefing or assistant config.
- A scheduled run may **prepare** the review (compute the lists, write the
  review note with every item marked "to decide"). The **decisions** happen
  with the owner, interactively. A scheduled run never closes, drops or
  archives items on its own unless the contract grants exactly that.

## 2. The lists

Build these from the ledger, in this order:

1. **Proposed, unconfirmed.** Every `proposed` item. Proposals older than 14
   days without an answer are suggested for rejection.
2. **I owe, overdue.** Each needs one of: deliver, renegotiate, drop.
3. **Owed to me, overdue.** Each needs one of: follow up (next step), phone,
   wait (with a new review date), drop.
4. **Due next week, both directions.** Check they are realistic; offer to
   block time (`calendar-assistant`) for i-owe items.
5. **No date, past `review_by`.** Set a date, extend the review, or drop.
6. **Patterns.** Items renegotiated three or more times; people with several
   overdue items owed to the owner; a week where the owner made more
   promises than they closed.
7. **Closed this week.** `done` and `dropped` items, ready to archive. A
   short list of wins is worth showing; it is also the evidence the system
   works.

## 3. Procedure

1. Pull the vault and run the ledger integrity checks
   (`ledger-format.md` §6). Fix structural problems first.
2. Regenerate the index.
3. Write the review note with all lists, every item marked `to decide`.
4. Walk the owner through it list by list. For each item, record the decision
   in the review note and apply it to the commitment note (status, due,
   history, `next_nudge`).
5. Draft any follow-ups, renegotiations or drops the owner chose
   (`nudges-and-follow-ups.md`). Drafts only.
6. With the owner's agreement, move `done` and `dropped` notes to
   `archive/<year>/`.
7. Regenerate the index; run the integrity checks again; sync the vault.

If the owner has only two minutes, do lists 1–3 and stop. The rest can wait
a week; overdue items cannot.

## 4. Review note template

`03-areas/commitments/reviews/<ISO year>-W<week>.md`:

```markdown
# Commitments review — 2026-W42 (Fri 16 Oct)

Open: 7 (I owe 4 · owed to me 3) · Proposed: 2 · Closed this week: 3

## Proposed (2)
- "I'll send the tile samples list by Thursday" (mail, 9 Oct) → confirmed, due Thu 15 Oct, already late → renegotiate
- "We'll sort the skip permit" (meeting, 13 Oct) → rejected (council's job)

## I owe, overdue (1)
- Okafor · revised quote · due Mon 12 Oct → delivered today, done

## Owed to me, overdue or due (2)
- Electrician · certificate · 10 days late → follow-up step 2 drafted
- Ravi · floor plan · due today (soft) → wait, review Thu 22 Oct

## Due next week (2)
- Tue · Ben · site photos → 1h blocked Mon 16:00
- Fri · Book club · November date → keep

## Patterns
- Electrician: second chase this month.

## Closed this week (3)
- Okafor · revised quote (done)
- Aoife · venue deposit approval (done)
- School · trip form (done)

Archived: 3. Index regenerated. Integrity: ok.
```

The note itself is phone-readable: lists, not tables; decisions after an
arrow.

## 5. Scheduled preparation

Paste-ready contract addition for a weekly preparation run (see
`scheduled-run-discipline` for the full template):

```markdown
Purpose: prepare this week's commitments review note.
Scope in: 03-areas/commitments/ in the vault (read).
Grant: write 03-areas/commitments/reviews/<week>.md, 03-areas/commitments/index.md and the run
folder. Do not change any commitment's status, due date or location. Do not
draft or send messages.
Done when: the review note lists every item in the seven lists, each marked
"to decide".
```

The daily briefing can then show one line on review day: "Commitments review
ready: 2 proposed, 3 overdue".

## 6. Health signals

Mention these to the owner when they show up over several reviews:

- The proposed list keeps growing: extraction is too eager; tighten the
  rules in `capture-and-extraction.md`.
- Many i-owe items dropped: the owner is over-promising; worth saying once,
  kindly, not every week.
- The same person is always late: suggest the owner sets firmer dates with
  them, or stops depending on them for critical-path items.
- Reviews keep being skipped: shorten the review (lists 1–3 only) rather
  than abandoning it.
