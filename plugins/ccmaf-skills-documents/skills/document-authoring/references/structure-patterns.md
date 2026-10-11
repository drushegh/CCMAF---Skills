# Structure Patterns

Anatomies for the documents general and business readers receive. Treat
each as a default, not a form to fill: drop sections the reader does not
need and follow the house template where one exists. Developer document
genres (README, ADR, runbook, changelog) live in `technical-writing`.

## Answer first (inverted pyramid)

The base pattern for nearly every workplace document. The most important
information goes first; each later section adds detail a reader can stop
before. Test: cut the document at any paragraph break and the reader
still has the most important part.

## SCQA (the pyramid principle)

For persuasion and recommendations:

1. **Situation**: what the reader already accepts. Short.
2. **Complication**: what changed or what is wrong.
3. **Question**: what the complication makes the reader ask (often
   implicit).
4. **Answer**: your recommendation or conclusion.

Then the supporting arguments, grouped: three to five groups, each a
claim with its evidence beneath, ordered by importance or logic. Each
group should be distinct (no overlaps) and together they should be
sufficient (no obvious gap a sceptic would name).

## Decision paper

```text
1. Decision required      What, by whom, by when. One or two sentences.
2. Recommendation         The option recommended and the main reason.
3. Background             Only what the decision-maker lacks.
4. Options                Each: description, cost, benefit, risk, who is affected.
                          Include "do nothing" when it is a real option.
5. Assessment             How the options compare against stated criteria.
6. Risks and mitigations  For the recommended option.
7. Next steps             What happens after approval, and who does it.
Annexes                   Detailed figures, method, consultation responses.
```

Pitfalls: options that are straw men next to the favoured one; criteria
invented after the choice; costs presented differently per option.

## Report (findings)

```text
Summary          Findings and recommendations, standing alone.
Introduction     Scope, question asked, method in brief, limitations.
Findings         What is true, with evidence. Grouped by theme, not by source.
Implications     What the findings mean for this reader.
Recommendations  Numbered, each traceable to a finding, each with an owner.
Annexes          Method, data, sources.
```

Keep findings and recommendations apart. A finding is "Two of five sites
missed the deadline"; a recommendation is "Add a fortnightly check-in for
sites behind plan". Mixing them makes both harder to challenge.

## Proposal and tender response

- **Mirror the request.** Use the asker's section numbers, headings and
  terminology exactly. Evaluators score against their own question list
  and should never have to hunt.
- **Compliance matrix first.** A table of every requirement, where it is
  answered, and compliant / partial / not compliant. Be honest about
  partials; evaluators find them anyway.
- **Answer the question, then add value.** First sentence answers what was
  asked, in their words. Evidence and differentiators follow.
- **Evidence over adjectives.** A named, fictionalised or anonymised case
  with a number beats "extensive experience".
- **Word and page limits are hard.** Over-length answers can be truncated
  or rejected. Check the counting rule (does it include tables? headings?).

## Policy or procedure

```text
Purpose            Why the policy exists, in two or three sentences.
Scope              Who and what it covers, and what it does not.
Policy statements  Numbered rules using "must" / "must not" / "may".
Responsibilities   Who does what.
Exceptions         How to request one, and who approves.
Related documents  Links.
Owner and review   Named role, approval date, next review date.
```

Keep rationale out of the rule text. "Staff must lock their screen when
leaving their desk" is a rule; the reasons go in Purpose.

## Briefing note

One to two pages for a reader who must speak or decide soon.

```text
Purpose      Why the reader is getting this, and what for (meeting, call, decision).
Key points   Three to six bullets the reader can say aloud.
Background   Brief.
Issues       Each with a suggested line to take.
Handling     Likely questions and suggested answers; sensitivities.
Contact      Who to ask for more.
```

## Executive summary

- Written last, read first. It must stand alone: assume nothing else is
  read.
- States findings and recommendations, not topics. Never "This report
  examines…".
- Includes the key numbers and the ask.
- Roughly a tenth of the document's length, and rarely more than a page.
- Contains nothing that is not in the body.

## Letter or formal email

1. Purpose in the first sentence ("I am writing to ask you to approve…").
2. The detail the reader needs to do it.
3. The action, deadline and how to respond.

One letter, one main action. Subject lines state the content and any
deadline ("Approval needed by 24 Oct: revised venue budget").

## Newsletter or update

Lead with what changes for the reader. Group by reader impact, not by
team. Every item answers "what does this mean for me, and do I need to do
anything?" Dates and actions in bold only where the reader must act.

## Choosing when patterns compete

- Decision needed: decision paper, even if the source material is a
  report.
- Persuading a sceptic: SCQA, with the strongest evidence group first.
- Reader will look things up later: label headings, numbered sections,
  reference structure.
- Reader will present it: briefing note shape, with lines to take.
