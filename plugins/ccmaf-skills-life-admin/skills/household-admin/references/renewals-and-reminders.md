# Renewals and reminders

A reminder is useful only if it arrives early enough to act, names who acts,
and says what to do. All reminders are generated from `register.csv`; never
maintain a separate list.

## Default lead times

The reminder fires `lead_days` before the earliest actionable date, which is
the `notice_deadline` when present, otherwise `renewal_or_expiry`.

| Item | Default lead | Second reminder | Why |
|---|---|---|---|
| Insurance (any) | 30 days | 7 days | Time to gather quotes; lapse risk is immediate |
| Auto-renewing contract with notice period | 14 days before notice deadline | 3 days | The notice deadline is the real date |
| Passport | 120 days | 60 days | Processing times vary; some destinations require months of validity remaining (verify per destination) |
| Driving licence, ID card, residence permit | 60 days | 21 days | Appointments and processing |
| Vehicle tax | 21 days | 3 days | |
| Vehicle roadworthiness test | 45 days | 14 days | Booking slots can be weeks out |
| Subscriptions | 7 days | none | Decide keep/cancel |
| Warranty end | 30 days | none | Check the item for faults while still covered |
| Home maintenance | 14 days | none | |

The user can change any default (`lead_days` per row, or a household-wide
table in `register-notes.md`). Estimated dates get an extra-early reminder
(double the lead) with "date estimated, check the document" in the text.

## Weekly digest (`reminders/digest_YYYY-MM-DD.md`)

```markdown
# Household: week of 12 October 2026

## Act this week
- Ciarán: car insurance notice deadline Fri 16 October (renews 30 Oct, auto-renews).
  Last year €612/yr. Renewal letter: household/filed/insurance/...pdf

## Coming up (next 8 weeks)
- Sat 17 Oct  Aoife: passport expires 14 Feb 2027 (120-day reminder)
- 20 Nov Boiler service due (estimated from last year's invoice)

## Needs a decision
- Broadband contract: auto-renew unknown. Check the contract page 2.

## Not yet filed
- incoming/2026-10-09_letter.pdf (looks like a property-tax letter)
```

Rules: names, plain dates with weekday, masked references only, one line per
item, document path for each. No advice ("shop around") beyond what the user
asked the register to say.

## Calendar files (`reminders/household.ics`)

Generate an iCalendar file (RFC 5545) the user imports into whichever
calendar they use. Minimal event per reminder:

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CCMAF-App//household-admin//EN
BEGIN:VEVENT
UID:ins-car-2-notice@household.local
DTSTAMP:20261011T090000Z
DTSTART;VALUE=DATE:20261016
SUMMARY:Car insurance: last day to change or cancel
DESCRIPTION:Renews 30 Oct. Ref ...7731. Document: household/filed/insurance/2025-10-30_car-insurance_schedule.pdf
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Car insurance notice deadline
TRIGGER:-P14D
END:VALARM
END:VEVENT
END:VCALENDAR
```

- `UID` is derived from the register id plus the reminder kind, so
  regenerating and re-importing updates events instead of duplicating them
  (most calendar apps match on UID; behaviour on re-import varies by app,
  verify with the user's app).
- All-day events (`VALUE=DATE`) avoid time-zone surprises.
- RFC 5545 requires CRLF line endings and folding of lines longer than 75
  octets; use a library or write CRLF explicitly. This file is the one
  exception to LF in the workspace.
- Escape commas, semicolons and backslashes in text values (`\,` `\;` `\\`)
  and newlines as `\n`.
- Event text is masked: it syncs to phones, shared calendars and lock screens.
- Verify by parsing the file (for example Python's `icalendar` package if
  installed, or importing into a local calendar app) and comparing event count
  and dates with the register.

Writing directly into an online calendar account is
`calendar-assistant`'s job and needs the user's confirmation per change.

## Scheduled weekly review

As an unattended run it follows `scheduled-run-discipline`:

- Contract: read `register.csv` and `incoming/`; write the digest and the
  `.ics`; nothing else.
- No filing of new documents unattended unless the contract grants it; list
  them in the digest instead.
- No contact with anyone. A due renewal produces a digest line, not an
  action.
- Run log and summary in the workspace; a missing or unparseable register is
  reported, not rebuilt.

## Renewal prep checklist (when an item enters its window)

```markdown
## Car insurance renewal — due 30 Oct 2026 (notice deadline 16 Oct)
- [ ] Renewal notice received? (filed: yes, 2026-10-02)
- [ ] Quoted price vs last year: €689 vs €612 (+12.6%)
- [ ] Anything changed: drivers, address, car, annual mileage, claims?
- [ ] Documents the user may need for quotes: current schedule, no-claims proof, licence details
- [ ] Decision (user): renew / change / cancel  →  user acts with the provider
- [ ] After: file the new schedule; supersede the register row
```

The checklist states facts and questions. Which provider or level of cover to
choose is the user's decision; do not rank options.
