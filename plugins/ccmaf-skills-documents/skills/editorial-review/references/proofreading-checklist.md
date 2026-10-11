# Proofreading Checklist

Most proofreading errors are boring and repetitive, which is exactly why
a careful read misses them. Turn every check that can be a search into a
search, and keep a list of searches run to put in the review report.

## The parts that get missed

Check each one explicitly; tick it off in the report.

- Title page, document title field and file name agree.
- Running headers and footers (wrong title, old date, old version).
- Table of contents matches the headings and page numbers.
- Figure and table captions; numbering in sequence; every figure cited
  in the text.
- Table contents: units, totals, alignment, column headings.
- Footnotes and endnotes: numbering, every note cited.
- Cross-references: "see section 4", "as shown in Table 2", "page 12".
- Appendix and annex lettering and references to them.
- Lists: numbering restarts, parallel grammar, consistent punctuation.
- Alt text on images, and slide speaker notes where present.
- Document metadata (author, company and title fields) for anything
  leaving the organisation: stale or internal values are an easy leak to
  miss.
- Hyperlinks: link text matches destination; no internal-only links in
  external documents. Check that a link resolves; do not submit or sign
  in to anything it leads to.
- Placeholders left behind: `[TK`, `TBC`, `XX`, `???`, `lorem`, `[insert`.
- Comments and tracked changes left in a "final" file.

## Mechanical search recipes

Run these in an editor with regular-expression search, or with a
command-line search tool over plain-text sources. Each finds candidates;
each candidate needs a judgement.

| Check | Search (regular expression) | Notes |
|---|---|---|
| Doubled words | `\b(\w+)\s+\1\b` (case-insensitive) | "the the", "that that" (some are legitimate) |
| Double spaces | `  ` (two spaces) | Also after full stops, if house style is single |
| Placeholders | `\[TK\|TBC\|XX\|\?\?\?\|lorem\|\[insert` | Any hit blocks issue |
| US spellings in a UK document | `iz(e\|ed\|es\|ing\|ation)\b`, `\bcolor\b`, `\bcenter\b`, `ou?r\b` reviewed by eye | Check the house rule: some UK houses use -ize |
| Inconsistent hyphenation | Search both forms: `e-mail` / `email`, `co-ordinate` / `coordinate` | Record the choice in the term list |
| Spaced hyphen as dash | ` - ` | Usually should be an en dash, a colon or a comma per house style |
| Numerals one to nine | `\b[1-9]\b` | Check against the number rule; units and tables excepted |
| Percent forms | `per cent\|percent\|%` | One form per house style |
| Dates | `\b\d{1,2}(st\|nd\|rd\|th)\b`, `\b\d{1,2}/\d{1,2}/\d{2,4}\b` | Ordinals and slash dates are ambiguous or off-style |
| Straight vs curly quotes | `"` and `'` versus curly forms | Mixed quotes in one document |
| Trailing spaces | ` +$` | Harmless in print, noisy in diffs |
| Acronyms | `\b[A-Z]{2,}\b` | Each defined on first use, in the term list |

Escape the pipes or adjust syntax for the tool in use; the table escapes
them only for Markdown.

## Commonly confused words

Check every occurrence, not a sample:

affect / effect; complement / compliment; ensure / insure; principal /
principle; stationary / stationery; practice (noun) / practise (verb, UK);
licence (noun) / license (verb, UK); dependent / dependant (UK noun);
discreet / discrete; its / it's; their / there / they're; fewer / less;
who's / whose; lead / led; loose / lose; compose / comprise ("comprises
three parts", not "comprises of").

## Numbers and calculations

- Recompute every total, subtotal and percentage. Percentages of a whole
  should sum to 100, allowing for stated rounding.
- The same figure in the summary, body, tables and charts must match.
- Units stated and consistent (€k vs €m; thousands separators).
- Ranges in a consistent form (2019–2024 with an en dash, or "2019 to
  2024").
- Dates match their weekdays where both are given; check against a
  calendar.
- Rounding stated where it matters.

Numeric mismatches are reported as "must fix" items, not silently
corrected: the reviewer may not know which of the two figures is right.

## Names and titles

- Every person, organisation and place spelled the same way throughout,
  and the same way as the source or the owner's own usage.
- Job titles capitalised per the style sheet.
- Fictional or anonymised names used consistently (an anonymised client
  must not slip back to a real name in one table).

## Grammar and sentence-level checks

- Subject and verb agree, especially across long intervening phrases.
- Pronouns have a clear antecedent.
- Lists are grammatically parallel and each item completes the lead-in.
- Modifiers attach to the right noun ("Having reviewed the budget, the
  plan was approved" has no reviewer).
- Tense consistent within a section.

## Final-format checks

On the rendered output (PDF, printed page, slide show):

- Headings not stranded at the foot of a page.
- Tables not split awkwardly; repeated header rows on multi-page tables.
- Images legible at the printed size; colour not the only carrier of
  meaning.
- Page numbers present and continuous.

Rendering and fidelity checks for specific office formats belong to
`office-formats`.

## Recording what was checked

End the proofread with a short list in the report:

```text
Searches run: doubled words (2 hits, fixed), placeholders (1 hit: AQ3),
-ize forms (0), spaced hyphens (5, tracked), numerals 1–9 (3, tracked),
acronyms (4 defined; "KPI" undefined, AQ4).
Parts checked: body, tables 1–3, captions, footers, TOC, metadata.
Not checked: embedded spreadsheet in Annex C.
```
