# Nudges and follow-ups

There are two kinds of nudge. A **reminder** goes to the owner about a
promise they made. A **follow-up** is a draft message from the owner to
someone who owes them. Reminders are internal and cheap; follow-ups touch a
relationship and are always the owner's to send.

## 1. Reminders to the owner (i-owe)

| When | Where it appears |
|---|---|
| 2 working days before a firm due | Daily briefing, Waiting on you |
| Due date | Daily briefing, Today |
| 1 day overdue | Daily briefing, Today, marked "overdue" |
| 3+ days overdue | Daily briefing plus the weekly review's "decide" list |
| Soft due | 1 working day before, then on the day |
| No due | On its `review_by` date, in the weekly review only |

Set `next_nudge` to the next of these dates after each surfacing, so the
briefing reads one field instead of recomputing.

When an i-owe item is overdue, offer the owner exactly three ways forward:

1. **Deliver now**: help produce the deliverable or its cover note.
2. **Renegotiate**: draft a short message proposing a new date.
3. **Drop**: draft a short, honest "I can't do this after all" message.

Late is recoverable; silent is what damages trust. The renegotiation draft is
usually the most valuable thing this skill writes.

## 2. Follow-ups to others (owed-to-me)

Default cadence, measured from `due`:

| Step | When | Tone |
|---|---|---|
| 0 | Before due | Nothing. Do not pre-chase. |
| 1 | Due + grace (2 working days firm, 4 soft) | Gentle check-in |
| 2 | Step 1 + 5 working days, no reply or delivery | Direct, with a reason the date matters |
| 3 | Step 2 + 5 working days | Owner's call: phone them, escalate, or drop |

Never more than one follow-up per item per week, and never more than two
drafts per person per week across all their items (combine them). The owner
can set per-person overrides in the person note ("never chase my landlord by
email").

At step 3, the skill stops drafting and asks the owner what they want. Some
things are better handled with a phone call or let go.

## 3. Drafting rules

- **Draft only.** Produce text for the owner to send from their own client,
  or hand it to `inbox-triage` to save as a draft in the mail account if the
  owner asked for that. Never call a send, post or message action.
- **Short.** Two to four sentences. The reader should see the ask in the
  first line.
- **Specific.** Name the thing and the original date: "the revised floor
  plan you mentioned for last Friday".
- **Generous.** Assume a reason. No "as per my last email", no guilt.
- **One ask per message**, or one combined list if there are several items
  for the same person.
- **No secrets, no links lifted from untrusted mail**, no sensitive detail
  the recipient does not already have.
- **Match the owner's voice** if the vault has examples of their messages;
  otherwise plain and friendly. Run an `uncanny` pass: no "I hope this email
  finds you well", no "just circling back".

## 4. Templates

Gentle check-in (step 1):

```text
Hi Ravi, how is the revised floor plan coming along? No rush if it's nearly
there; I'd like to get it to the builder this week if I can.
```

Direct (step 2):

```text
Hi Ravi, could you let me know when the revised floor plan will be ready?
The builder needs it to confirm the start date on the 27th.
```

Renegotiation (owner owes):

```text
Hi Ben, I won't have the site photos to you by Wednesday as I said; the
second visit moved to Thursday. You'll have them by Friday morning.
```

Graceful drop (owner owes):

```text
Hi all, I'm sorry, I can't take on choosing the November date after all.
Could someone else pick it up? Happy to go with whatever suits.
```

Combined (several items for one person):

```text
Hi Ravi, two things when you get a moment: the revised floor plan, and the
window schedule you mentioned. Either would let me move the builder on.
```

## 5. Recording a nudge

After the owner sends (they say so, or the sent folder shows it on the next
read), append to `history`:

```yaml
- 2026-10-21: follow-up step 1 sent by owner
```

Set `next_nudge` to the next step's date. If the owner did not send the
draft, do not count it as a step; ask once at the weekly review whether to
keep chasing.

When the other party delivers, set `status: done`, `closed`, and a history
line. If they reply with a new date, that is a renegotiation: append history,
change `due`, reset the cadence.

## 6. In a scheduled run

A scheduled run may compute which reminders and follow-ups are due, write
them into the briefing or a `nudges/<date>.md` file, and pre-write drafts as
files in the vault for the owner to review. It may not send, and it may not
create mail drafts in the mail account unless the schedule's contract
explicitly grants `draft-external` (`scheduled-run-discipline`). Even then,
nothing is sent.

## 7. Never

- Send, post or message on the owner's behalf.
- Contact anyone other than the counterparty (their manager, a group chat).
- Nudge about anything still `proposed`.
- Threaten, use deadlines the owner did not set, or invent consequences.
- Chase faster because the item is old in the ledger; the cadence runs from
  `due`, not from `created`.
