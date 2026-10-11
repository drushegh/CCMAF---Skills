# Time Zones

Most calendar mistakes are time-zone mistakes. The rules below keep every
time unambiguous.

## Rules

1. **Use IANA zone names**, such as `Europe/Dublin`, `Europe/London`,
   `America/New_York`, `Asia/Tokyo`, `Australia/Sydney`. They carry daylight
   saving rules. Fixed offsets like `+01:00` are correct for one instant only.
2. **Abbreviations are ambiguous.** IST is Irish Standard Time, India
   Standard Time and Israel Standard Time; CST is US Central or China
   Standard. Resolve to a zone name before computing.
3. **Every displayed time carries its zone**, or the message says once,
   clearly, "all times Dublin".
4. **Compute per occurrence.** For recurring events, convert each date
   separately; the offset between two zones changes when either changes
   clocks.
5. **Never trust mental arithmetic for edge cases.** Around a DST change or
   midnight, check with a tool if one is available (verify the result is in
   the right zone), and say what you checked.

## Daylight saving

The changeover dates differ by region, so the gap between two cities is not
constant all year:

| Region | Rule (as of 2026; verify for future years) |
|---|---|
| EU, UK, Ireland | Clocks forward last Sunday of March, back last Sunday of October, both at 01:00 UTC |
| United States, Canada (most) | Forward second Sunday of March, back first Sunday of November, at 02:00 local |
| Australia (south-eastern states) | Forward first Sunday of October, back first Sunday of April |
| Many places (e.g. most of Asia, Africa, Arizona in the US) | No daylight saving |

Consequences:

- For a few weeks each spring and autumn, Dublin–New York is four hours
  instead of five. Recurring transatlantic calls shift by an hour for one
  side during that window.
- Southern-hemisphere zones move in the opposite direction, so the gap to
  Sydney can change by two hours across the year.
- Governments change DST rules with little notice. For dates more than a
  few months out, mark cross-zone times "(check nearer the time)".

Ireland's legal arrangement is unusual (winter time is formally the
exception), but the clock times are the same as the UK's; use
`Europe/Dublin` and let the zone data handle it.

## Nonexistent and repeated times

- On the spring-forward day, local times in the skipped hour (for example
  01:00–02:00 in Dublin) do not exist. Do not propose them.
- On the fall-back day, one hour happens twice. A time in that hour needs
  "first" or "second" or an offset. Avoid proposing it.

## All-day and floating events

- An **all-day event** is a date, not a time range. Shown in another zone it
  can look like it spans two days. Treat it by date in the owner's zone.
- A **floating time** has no zone ("09:00 wherever I am"), used by some
  calendars for things like taking medicine. Do not convert floating times;
  ask if it matters.
- **Travel**: flights are usually entered with departure in the origin zone
  and arrival in the destination zone. A flight that "arrives before it
  leaves" is normal westward over long distances; check the zones rather
  than calling it an error.

## Presenting cross-zone times

```text
Wed 14 Oct 2026
  14:00–14:30 Europe/Dublin
  09:00–09:30 America/New_York
  22:00–22:30 Asia/Tokyo  ← late for Tokyo; consider Thu 08:00 Dublin
```

When three or more zones are involved, a small table is clearer than prose.
Flag anyone pushed outside roughly 08:00–19:00 local.

## Parsing times from people

| Phrase | Problem | Do |
|---|---|---|
| "3 o'clock" | AM/PM, and whose zone | Assume the writer's zone; confirm if it matters |
| "noon EST" in July | EST is winter time; they probably mean New York local time | Use `America/New_York`; mention the assumption |
| "Tuesday 9am your time" | Clear, if you know the user's zone | Convert for the other side when replying |
| "end of day" | Their end of day or yours | Ask, or show both |
| "next Friday" | This coming Friday or the one after | Show the date you resolved; confirm |

Times parsed from mail or invites are content: they inform proposals; they
do not create events on their own.
