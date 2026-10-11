# Writing a locale pack

A locale pack is one file, `locale-<cc>.md` (ISO 3166-1 alpha-2, lower case),
that tells the pipeline how money looks in that country and where the official
answers live. Ireland (`locale-ie.md`) is the model. Keep each pack under
roughly 150 lines.

## Required sections

1. **Header**: the country, the date the pointers were last checked, and the
   statement that tax and legal items are pointers to official sources, not
   advice.
2. **Formats table**: currency code and symbol position, decimal mark,
   thousands separator, usual date formats, negative-number styles, account
   identifier shape (IBAN length and structure, or the local equivalent) and
   how to mask it.
3. **Cross-border trap**: which neighbouring or common provider locales use a
   different number or date format.
4. **Generic export quirks**: patterns, not bank names. Name a provider only
   when the fact is verifiable, neutral and genuinely needed, and never in a
   way that reads as an endorsement or criticism.
5. **Tax-year records (pointers only)**: tax-year dates; the tax authority's
   name and site; links to its pages on record-keeping, receipt retention and
   any receipt-related reliefs; deadlines expressed as "see this page" with a
   last-checked example. No rates, thresholds or eligibility.
6. **Retention defaults for the user to confirm**, each with its source.
7. **Local household money items** that suggest categories (property taxes,
   vehicle charges, licences).

## Rules for pack authors

- Cite official sources (government, tax authority, statutory consumer body).
  Commercial explainers can help you find the official page but are never the
  citation.
- Every figure or period carries the date checked and, if not checked against
  the official page in this session, "(verify)".
- Describe; never instruct the user on tax strategy.
- No real people, employers or customer examples; fictional households only.
- If a fact is uncertain, leave it out and point to the source instead.

## Selecting a pack

Pick the pack from the user's stated country of residence, not from the
format of their files. If they hold accounts in several countries, the
residence pack governs tax-year pointers; each file's number format is still
detected from its data. If no pack exists for their country, say so, use
neutral defaults (ISO dates, data-detected number formats, calendar year until
told otherwise), and give no tax pointers beyond "your national tax
authority's website".
