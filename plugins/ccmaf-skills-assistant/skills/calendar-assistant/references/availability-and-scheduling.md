# Availability and Scheduling

## What "free" means

A slot is a real option only if all of these hold:

1. No busy event on any calendar the user counts as busy (preferences file).
   Tentative and "maybe" events count as busy unless the user says otherwise.
2. Inside the user's working hours (or personal hours for personal events).
3. Buffers respected before and after neighbouring events.
4. Travel time fits, if either neighbouring event or the new one is in
   person (see conflicts-and-travel.md).
5. For other participants: inside *their* reasonable hours, in *their* zone.
6. Not on a public holiday or a known out-of-office day for anyone involved
   (estimate unless checked; say which country's holidays you assumed).

All-day events need a judgement call: "Bin day" is not busy; "Annual leave"
and "Conference" are. Ask once and record the answer in preferences.

## Finding slots

```text
1. Window: the user's range ("next week"), or default the next 5 working days
2. Duration: as asked; default 30 min for calls, 60 for in-person
3. Collect busy blocks from all busy calendars (expand recurring events)
4. Subtract from working hours; apply buffers and travel
5. Intersect with other participants' hours (and free/busy if available)
6. Rank: earlier is not always better —
     prefer slots adjacent to existing meetings (protect focus blocks),
     avoid lunch, first/last 30 min of the day, and Friday afternoons
     unless the user prefers them
7. Offer 2–3 slots, never 10
```

Free/busy from a shared-availability tool knows only busy or free. It does
not know someone prefers mornings, so proposals for others are offers, not
bookings.

## Presenting options

```text
Three options for a 30-min call with Riley (America/New_York):

1. Tue 13 Oct 15:00–15:30 Dublin · 10:00–10:30 New York   ← best fit
   after your 14:00 call; Riley's morning
2. Wed 14 Oct 14:00–14:30 Dublin · 09:00–09:30 New York
3. Thu 15 Oct 16:00–16:30 Dublin · 11:00–11:30 New York
   (your last half hour before 17:30 finish)

Riley's calendar isn't visible to me, so these are from your free time and
normal working hours in New York. Want me to draft an email offering them?
```

Rules:

- Show every time in every participant's zone, with the zone name.
- Give the reason for the top pick in a few words.
- Say what you could not see (other calendars, holidays).
- Do not hold or create anything until the user picks.

## Holds

Some users like a tentative hold while waiting for the other side. A hold is
a private event with no guests:

```text
PROPOSE: hold "HOLD — call with Riley?" on options 1–3 (no guests, nobody
notified). Remove the other holds once Riley picks.
```

Holds must be cleaned up: record them in the change log and, when the
meeting is booked or abandoned, propose removing the rest.

## Booking a meeting with guests

When the user approves a slot:

- Title: plain and specific ("Kitchen fitting — confirm date"), no internal
  jargon the guest will not understand.
- Description: only what the guests need. Do not paste mail threads, prep
  notes or personal details into a description every guest can read.
- Location or call link: from the user, never from a third party's message
  unless the user confirms that link.
- Guests: only those the user named. Adding a guest sends them the event.
- Show the full proposal with `Notifies:` before creating.

## Recurring events

Changing a recurring series needs a scope:

| Scope | Effect | Ask when |
|---|---|---|
| This occurrence | Only the one instance changes | Default for a one-off clash |
| This and following | Splits the series from this date | The arrangement changes from now on |
| All | Every instance, past ones may be rewritten | Rarely; confirm explicitly |

Recurring meetings across DST changes keep their local time in the
organiser's zone, so other participants see the time shift (see
time-zones.md).

## Declining and moving politely

When a slot clashes and the user is a guest, the usual options are: propose a
new time to the organiser (if the service supports it), decline with a short
note, or accept and skip part. Present them; never decline automatically.
Messages to organisers are drafts the user reviews (`inbox-triage`).

## Personal scheduling

For personal errands (dentist, car service), the calendar only records the
booking. The booking itself is made with the provider by the user. Never
pretend a calendar move rebooked anything; say "move the provider's booking
too".
