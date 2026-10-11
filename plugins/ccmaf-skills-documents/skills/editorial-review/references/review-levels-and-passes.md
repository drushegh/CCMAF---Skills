# Review Levels and Passes

## Scoping the job

Ask, or state your assumptions, before starting:

- **Level:** structural, copyedit, proofread, fact-check, or a named
  combination. "Have a look at this" defaults to copyedit with
  suggestions, plus fact-check flags on anything that looks wrong.
- **Stage:** an early draft (structure matters, commas do not) or final
  copy (commas matter, structure is settled). Do not proofread a draft
  that will be restructured.
- **Reader and purpose** of the document, so tone and completeness can be
  judged against something.
- **House style and terminology:** a guide, a template, a previous
  document, or none (then derive a style sheet; see
  `terminology-and-consistency.md`).
- **Return format:** tracked changes in the file, suggestions in an
  online editor, a marked-up copy, or a numbered list
  (`tracked-changes-etiquette.md`).
- **Authority:** may you fix clear errors directly, or only suggest? The
  default is suggest.
- **Exclusions:** parts not to touch (legal wording, quoted material,
  approved sections).

## Levels in detail

### Structural review

Questions for the whole document, answered in comments:

- Does the opening tell the reader what they need (answer, ask, deadline)?
- Is anything missing that this reader will need?
- Is the order the reader's order?
- Is any section redundant or misplaced?
- Do the conclusions follow from the evidence?

Output: a short memo with recommendations, ranked. Do not restructure the
document yourself unless asked; that is `document-authoring` work.

### Copyedit

Sentence- and word-level: grammar, clarity, ambiguity, consistency with
the style sheet and term list, tone, defined acronyms, parallel lists,
correct use of words that are often confused. Fixes clear errors as
suggestions; queries taste.

### Proofread

The last check on final copy, ideally in the final format (rendered page,
PDF proof). Typos, doubled words, spacing, numbering, headers and
footers, page breaks, widowed headings, broken cross-references, figure
and table numbering. Changes are minimal; a proofread that reflows pages
creates new errors.

### Fact-check

Every checkable claim is extracted and checked against a source.
Output is a flag list, never edits to claims (`fact-checking.md`).

## Pass order for a full review

1. **Read once without marking,** to understand the argument and reader.
   Note impressions for the structural memo.
2. **Structural notes** (if in scope).
3. **Fact-check** claims, figures, names, dates, quotations.
4. **Build or confirm the style sheet and term list.**
5. **Consistency pass,** mechanically: search for each variant.
6. **Tone pass** against reader and purpose (`tone-and-register.md`).
7. **Copyedit pass,** sentence by sentence.
8. **Proofread pass** on the final rendered form, including the parts that
   get missed (`proofreading-checklist.md`).
9. **Re-check every changed passage.**

Doing facts before style means the copyedit is not wasted on sentences
whose claims turn out to be wrong.

## Reading techniques

- **Change the medium.** Read the rendered output or a PDF, not just the
  source; layout errors are invisible in source.
- **Slow the eye.** For proofreading, read line by line; for numbers and
  names, read tables column by column.
- **Read backwards** sentence by sentence for typos; it breaks
  comprehension, so the eye sees words, not meaning.
- **Search, do not trust.** Any check that can be a search should be
  (`proofreading-checklist.md`).

## The review report

Return a report alongside any marked-up file. Order by severity:

```text
Review: venue-decision draft v2 (copyedit + fact-check), 2026-10-11

Must fix before issue (3)
1. Section 3, table: total €21,600 does not equal the rows (€21,000). Recompute.
2. Section 2: "last year it was full": venue-notes.md says 214 of 220 seats sold. Query: "full" or "nearly full"?
3. Annex A: trustee named "A. Byrne" here, "A. Burne" in section 6. Which is correct?

Fact-check flags (4): see list below; 2 verified, 1 needs author, 1 unverifiable here.

Consistency (6 edits, tracked): dates to 14 October 2026 form; "per cent" → "%" per style sheet.

Tone (1 note): section 5 shifts to "you" address; rest of the paper is third person.

Queries for the author (2): marked AQ1, AQ2 in the file.

Not reviewed: Annex C (spreadsheet extract): numbers not rechecked.
```

Rules:

- Lead with the items that could mislead or embarrass.
- Count items per category so the author sees the scale at a glance.
- Locate every item precisely (section, paragraph, table row, page).
- Say what was not reviewed. Silence implies coverage.
- Keep the report free of praise padding and of verdicts on the author.

## Reviewing at scale (a folder or a long document)

- Build one style sheet and term list for the whole set first.
- Review in a fixed order and keep a running issues log so patterns
  ("every chapter misnumbers figures") are reported once as patterns.
- Prefer fixing systemic issues at the source (the template, the term
  list) and noting it, over hundreds of identical edits.
