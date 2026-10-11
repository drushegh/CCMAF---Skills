# Terminology and Consistency

Consistency means every choice in the document matches a decision, not
that every choice matches the first one the reviewer saw. The decisions
live in two short artefacts: a style sheet (mechanics) and a terminology
list (words). Build them first, check against them second.

## Sources for the decisions

In order of authority:

1. The user's instruction for this document.
2. The organisation's house style guide and glossary.
3. A named external style guide the organisation follows.
4. Previous documents of the same series.
5. The document's own majority usage, confirmed with the author when the
   split is close or the choice matters.

If `document-authoring` produced a style sheet for this document, start
from it.

## The style sheet (mechanics)

Record one line per decision, with an example. Typical entries:
spelling variant (-ise or -ize), serial comma, numbers (words or
numerals, threshold), dates and times, currency and units, heading case,
capitalisation of job titles and departments, quotation marks,
abbreviation style, list punctuation. See `document-authoring`'s
`references/style-guides.md` for a full template; reuse it rather than
inventing a second format.

## The terminology list (words)

A table with four columns:

```text
| Use                     | Not                          | Notes                               |
|-------------------------|------------------------------|-------------------------------------|
| customer                | client, user                 | "user" only for the software        |
| sign in (verb)          | log in, login (verb)         | "sign-in" as noun/adjective         |
| Harbourside Arts Trust  | Harbourside Trust, HAT       | "the Trust" after first use         |
| service level agreement | Service Level Agreement      | SLA after first use, defined once   |
| A. Byrne                | A. Burne                     | Confirmed by author (AQ2)           |
```

What belongs in it:

- names of people, organisations, products, places and projects,
  spelled exactly as their owners spell them;
- domain terms with competing forms (email / e-mail, dataset / data set);
- preferred and banned terms from the house guide;
- acronyms, with the expansion and whether the acronym is defined in this
  document;
- capitalisation of terms that vary (Board / board, Phase 2 / phase two);
- deliberately anonymised or fictional names, so a real name slipping
  back in is caught.

## Variant hunting

Read-throughs miss variants because the eye normalises them. Search
instead:

1. **Harvest candidates.** List capitalised words, hyphenated words,
   acronyms, and words containing digits. In plain text, a search such as
   `\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b` lists capitalised phrases; sort and
   count them to see near-duplicates side by side.
2. **For each term, search every plausible variant:** spacing (data set /
   dataset), hyphenation (co-operate / cooperate), capitalisation, plural
   and possessive forms, and abbreviations.
3. **Decide using the authority order above,** then add the decision to
   the list.
4. **Apply as suggestions,** grouped in the report ("Standardised 'e-mail'
   to 'email' (7 instances) per term list").

For names, the owner's own spelling wins over majority usage. Check the
name against the source document or the organisation's own material, not
against memory.

## Consistency beyond spelling

- **Same thing, same name.** A document that says "the platform", "the
  system" and "the tool" for one thing makes readers wonder if there are
  three. Pick one.
- **Different things, different names.** One term used for two things
  ("the review" for both the audit and the annual appraisal) needs
  splitting.
- **Defined terms used as defined.** If "Eligible Member" is defined, every
  later use means exactly that; lower-case "eligible member" may read as
  something looser. Legal and policy documents depend on this.
- **Numbers and facts repeated in several places** match each other
  (`proofreading-checklist.md`).
- **Formatting of like elements:** all figure captions the same pattern,
  all list items the same punctuation, all headings at a level the same
  case.

## Across a folder of documents

When reviewing a series (chapters, a document set, monthly reports):

- Keep one term list for the set, in the folder (for example
  `terms.md`), and update it as decisions are made. It outlives the
  conversation.
- Record who decided and when for anything contested.
- Check new documents against the list before line-editing them.
- When a decision changes, list the documents that used the old form so
  they can be updated deliberately rather than left inconsistent. Do not
  bulk-edit other files without the user's confirmation
  (`safe-system-changes` for bulk operations).

## Reporting consistency changes

- Group by decision, with counts, not as hundreds of individual notes.
- Flag the decisions you made versus those taken from a guide, so the
  author can overrule yours.
- Return the term list itself with the review; it is a deliverable.
