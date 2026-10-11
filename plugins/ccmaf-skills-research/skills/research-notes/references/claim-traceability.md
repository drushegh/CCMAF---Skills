# Claim-to-source traceability

The chain is: **synthesis sentence → claim ID → source key → locator → the
words in the source.** Every link must exist, or the sentence is marked as
interpretation.

## Locators by source type

| Source | Locator |
|---|---|
| Paginated PDF, book, report | Page (use the printed page number and say so if it differs from the PDF page), plus table or figure number |
| Unpaginated web page | Section heading and paragraph number, or a short quoted anchor phrase |
| Docs site | Page title, heading, and the doc version |
| Ebook without stable pages | Chapter and section, or location number with the edition |
| Video or podcast | Timestamp `hh:mm:ss` (and which version or upload) |
| Interview or meeting | Date, who said it, timestamp if recorded or note line |
| Dataset | Table or file name, column, row filter, and the dataset version |
| Code or repository | File path, line range, commit hash |
| Legislation or standards | Section, article, clause, and the version in force |

## Quoting rules

- Verbatim, in quote marks, with a locator. Mark omissions with `…` and
  insertions with `[ ]`.
- Do not "fix" the source's wording silently. If you correct a typo, mark
  it `[sic]` or leave it.
- Keep enough context that the quote is not misleading. If the next
  sentence qualifies it, include or note the qualification.
- If the text came from OCR, a transcript or a translation, say so; quotes
  from those are only as good as the conversion.

## Paraphrase rules

- Keep hedges and scope: "may", "in this sample", "in adults over 65",
  "in 2023".
- Do not upgrade correlation to causation, or "some" to "most".
- Do not merge two sources into one paraphrase with one locator.
- If you are not sure the source says it, write `[?]` and check.

## Read status

| Status | Meaning | Can back a load-bearing claim? |
|---|---|---|
| `read` | Relevant parts read in full by you in this project | Yes |
| `skimmed` | Headings, summary, figures | Only with a note saying so |
| `abstract-only` | Only the abstract or blurb was available | No; flag it |
| `secondary` | Known only through another source's description | No; cite the source you read ("Harlow, citing X") |
| `unavailable` | Paywalled, gone, inaccessible | No |

## Claim status

| Status | Meaning |
|---|---|
| `supported` | Two or more independent `read` sources agree, none credible against |
| `single-source` | One `read` source only |
| `contested` | Credible sources disagree |
| `unsupported` | Asserted somewhere but no evidence found |
| `retracted` / `superseded` | The source was withdrawn, corrected or replaced by newer data |

**Independence:** two articles quoting the same press release are one
source. Trace claims back to the original data or statement where you can,
and record the original as the source.

## Confidence

Use plain words, defined once per project: `high` (strong, independent,
recent evidence; little disagreement), `moderate`, `low`, `unknown`. For
scholarly work, `academic-research` has a finer scale; use it there.

## Interpretation markers

- `[me]` in reading notes, and "my reading:" or "this suggests" in synthesis
  prose, mark your inferences.
- An interpretation can cite the claims it rests on: "[me] taken together,
  CL-01 and CL-04 suggest…"

## The traceability audit (before delivery)

1. List every factual sentence in the deliverable (for long ones, a sample
   of at least ten, weighted to the load-bearing ones).
2. For each: is there a claim ID or an explicit source reference?
3. Follow it to the source note: is the status adequate?
4. Open the source at the locator (if available): does the text support the
   sentence as written, without strengthening it?
5. Check quotations character by character against the source.
6. Record the result: "Audited 14 sentences; 13 traced; 1 reworded to match
   the source's hedge (CL-07)."

Fix failures by rewording to what the source supports, adding the missing
source, or marking the sentence as interpretation. Never by inventing a
locator.

## When you cannot verify

Say so in the note and the deliverable: "abstract only, full text
paywalled", "page no longer available; archived copy dated …", "could not
locate the passage the secondary source quotes". An honest gap is better
than a confident trace that does not exist.
