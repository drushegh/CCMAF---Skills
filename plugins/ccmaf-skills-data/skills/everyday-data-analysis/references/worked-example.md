# Worked Example: Club Membership Export

A fictional amateur running club. The secretary exports the membership list
from the club's booking system and asks for help before the annual meeting.

## The request

> "Here's our members export. Can you tell me if the club is growing and
> make a chart for the AGM slides? People keep saying we're losing the
> younger members."

## 1. Questions

Proposed and agreed:

1. Active members at the end of each month, Jan 2023 to Sep 2026.
2. New joiners and leavers per month, same period.
3. Active members by age band at the end of Sep 2024, 2025 and 2026.
4. Of people who joined in 2024 and 2025, what share were still members 12
   months later, by age band?

Definitions agreed with the secretary: "active" = paid membership covering
that date; trial memberships excluded; age band from date of birth at the
snapshot date. Question 4 is the one that actually tests "we're losing the
younger members".

## 2. Intake

- `incoming/2026-10-11_members.csv`, kept unchanged; sha256 recorded.
- Raw look: semicolon-delimited, UTF-8 with BOM, dates `dd/mm/yyyy`,
  membership numbers with leading zeros (`000412`).
- Read with `sep=";"`, `encoding="utf-8-sig"`, `dtype={"MemberNo": "string"}`,
  explicit date format.
- The file contains names, emails, phone numbers and dates of birth. Per
  `personal-data-care`: only `MemberNo`, `DateOfBirth`, `JoinDate`,
  `ExpiryDate`, `MembershipType` kept in the working copy; age band derived,
  then date of birth dropped. Outputs are aggregates only.

## 3. Profile

```text
Rows: 1,146 (booking system says 1,146 records)
Join dates: 2009-03-01 to 2026-10-02
Expiry blank: 61 rows (life members 9, data gaps 52)
Membership types: Full 812, Student 158, Trial 131, Life 9, Family 36
Same MemberNo twice: 48 (renewals stored as new rows)
Date of birth blank: 37
```

Findings that change the approach: renewals appear as separate rows, so a
person's membership is a set of periods, not one row; 52 blank expiries
need a decision.

## 4. Cleaning log (excerpt)

```markdown
1. Excluded 131 Trial rows (agreed definition). → 1,015
2. Grouped 48 repeated MemberNo into membership periods per person; 967 people.
3. Life members (9): treated as never expiring.
4. 52 blank expiries, non-life: secretary confirmed these are lapsed members
   whose expiry wasn't recorded; set expiry = join date + 12 months (the
   standard term). Flagged; results shown with and without them.
5. 37 blank dates of birth: age band "Unknown", kept.
```

## 5. Analysis

Active members per month-end computed from membership periods (a member is
active on date d if any period covers d). Joiners = first period start;
leavers = last period end with no renewal within 60 days (agreed grace
period).

Checks: Sep 2026 active count (402) matches the booking system's "current
members" screen (402). Joiners per year cross-checked with a pivot table on
the raw file.

Results:

- Active members: 371 (Sep 2023), 389 (Sep 2024), 395 (Sep 2025), 402
  (Sep 2026); a dip of 15–20 members each January, recovering by April.
- Under-30 active members: 88, 81, 79 at the Sep 2024, 2025 and 2026
  snapshots; 30–49 and 50+
  bands grew.
- 12-month retention of 2024–25 joiners: under-30s 52% (n = 61); 30–49
  71% (n = 94); 50+ 78% (n = 40).

## 6. Charts

1. Line chart, active members by month, y axis from zero, January dips
   visible, Oct 2026 excluded (partial). Title: "Membership grew from 371 to
   402 over three years".
2. Small multiples, active members by age band, shared y axis. Title:
   "Growth came from members aged 30 and over".
3. Horizontal bars, 12-month retention by age band with n on each bar.
   Title: "Younger joiners were less likely to renew (52% vs 71–78%)".

Each rendered and checked: values against the table, zero baselines,
direct labels instead of colour-only legends, a source line ("Booking
system export 11 Oct 2026; trial memberships excluded").

## 7. Findings note (core of it)

```markdown
**In short:** The club has grown, from 371 to 402 active members over three
years. The number of members under 30 has fallen slightly since 2024 (88 to 79), and
younger people who joined in 2024–25 were less likely to renew after a year
(about half, compared with roughly three in four older joiners).

## What to keep in mind
- The retention figures rest on small groups (61 under-30 joiners), so the
  gap could be smaller or larger than it looks; it is a reason to ask
  younger members, not proof of why they leave.
- 52 lapsed members had no recorded expiry; we assumed the standard
  12-month term. Without them the picture is the same (growth 374 → 402;
  under-30 retention 54%).
- This export shows who left, not why. Students moving away after their
  course is one obvious possibility the data cannot confirm.
- Trial memberships are excluded throughout.
```

Note what the note does not say: not "the club is failing young people",
not "retention is significantly lower", not a forecast.

## 8. Hand-over

- `work/members-2026/findings_v01.md`, `charts/*.png` (16:9 versions for the
  slides), `analysis.py`, `cleaning-log.md`, `requirements.txt`.
- The slides themselves: `office-formats` (the secretary's deck is `.pptx`).
- How to update next year: save the new export to `incoming/` and re-run
  `analysis.py`; the definitions and grace period are at the top of the
  script.
