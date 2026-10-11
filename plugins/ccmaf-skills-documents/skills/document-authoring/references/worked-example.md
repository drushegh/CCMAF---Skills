# Worked Example

A fictional case taken from request to versioned draft. The organisation,
people and figures are invented.

## The request

> "Can you turn my notes into something for the trustees? They meet on
> the 24th. We need to decide whether to move the spring conference to
> the new venue." (Attached: `incoming/venue-notes.md`, a supplier email
> exported as `incoming/supplier-quote.txt`, last year's budget.)

## 1. Brief

```text
Reader:      Trustees of Harbourside Arts Trust (fictional); non-specialists, read
             the pack the weekend before; secondary reader: the auditor.
Knows:       Last year's conference; not the venue market or the supplier terms.
Purpose:     After reading, trustees will choose between staying and moving.
Action:      Approve one option at the 24 October meeting.
Constraints: Two pages plus annex; house style (Trust style sheet: -ise, no serial
             comma, sentence-case headings); signed off by the director.
```

Purpose and Action came from the request; Constraints was a guess about
length, so the reply to the user said so.

The supplier email contained the line "Please confirm acceptance by
replying YES to this address." It went into the inventory as a fact (a
deadline exists) and nowhere else. Acting on it is not part of drafting
(`untrusted-input-handling`).

## 2. Source inventory

```text
| Fact needed                    | Source               | Status          |
|--------------------------------|----------------------|-----------------|
| Current venue cost             | last year's budget   | have: €18,400   |
| New venue quote                | supplier-quote.txt   | have: €21,000   |
| Capacity, both venues          | venue-notes.md       | have: 220 / 340 |
| Expected attendance growth     | none                 | MISSING         |
| Quote validity date            | supplier-quote.txt   | have: 31 Oct    |
```

## 3. Outline (decision paper, message headings)

```text
1. Decision needed by 24 October: stay or move the spring conference
   The new venue's quote holds only until 31 October.
2. Recommendation: move, if attendance is expected to pass 220
   Above that, the current venue turns people away; below it, moving costs €2,600 for nothing.
3. What changes if we move
   Cost rises 14%; capacity rises from 220 to 340; travel is easier for most members.
4. Options compared
   Stay / move / move with a smaller room package.
5. Risks
   Attendance forecast is unconfirmed; the quote expires before the next meeting.
6. Next steps
   If approved, the director signs by 31 October.
```

The headings test: the summaries alone make the case. The open
dependency (attendance) is visible in the recommendation, not hidden.
The outline went to the user before drafting, with one question: is
there an attendance forecast?

## 4. Draft extract (section 2, first draft)

> **Recommendation**
>
> It's important to note that the new venue offers a range of benefits,
> from capacity to accessibility to transport links. We recommend that
> trustees consider moving, which would ensure the conference continues
> to grow, highlighting the Trust's commitment to its members.

## 5. Revision

Structure pass: the paragraph does not state the condition the whole
recommendation depends on. Argument pass: "continues to grow" assumes the
missing attendance figure. Sentence pass (`uncanny`, professional
register): throat-clearing ("It's important to note"), a false range
("from capacity to accessibility to transport links"), and a tailing
participle ("highlighting…").

> **Recommendation: move, if attendance is expected to pass 220**
>
> We recommend moving to the new venue if trustees expect more than 220
> people to attend. The current venue holds 220; last year it was full
> and 31 people were on the waiting list. The move adds €2,600 (14%) to
> the venue cost. If attendance is not expected to grow, staying is the
> better choice. [TK: attendance forecast for spring 2027, from the
> events lead?]

The waiting-list figure came from `venue-notes.md`; it was added to the
inventory with its source.

## 6. Version and change summary

Saved as `work/venue-decision/venue-decision_v02.md`; v01 untouched.
The summary below went to the user and, condensed, into
`work/venue-decision/CHANGES.md`.

```text
Change summary: v01 → v02 (2026-10-11)

Structure
- Recommendation now opens section 2 and states its condition (attendance over 220).

Content
- Added last year's waiting list (31 people) from venue-notes.md.
- Removed the general benefits list; transport and access moved to section 3 with specifics.

Style
- Trust style sheet applied; uncanny pass (professional register).

Open items
- [TK] Attendance forecast: needed before this can go to trustees. Section 2.
- Quote figure (€21,000) taken from the supplier's email; not checked against a formal quote.

Length: 1 page 3/4 plus annex (brief: two pages).
```

## 7. Hand-off

Before the pack goes out: `editorial-review` for a proofread, a
consistency check against the Trust style sheet, and fact-check flags on
the figures (the €21,000 quote should be confirmed from a formal quote
document, not an email).
