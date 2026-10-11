# Style Guides

A style guide makes thousands of small decisions once, so that writers
stop making them inconsistently. Adherence is mostly mechanical, and
mechanical work should be checked mechanically, not by rereading.

## Finding the house style

Before drafting, ask or look for:

- an organisation style guide, brand voice guide or writing standards page;
- a document template (its headings, numbering and fonts encode rules);
- previous documents of the same type the reader accepted, as precedent;
- the requester's own preferences ("we always say 'customers', never
  'clients'").

Record what you found in the brief's Constraints line. If several exist,
note which is authoritative.

## Precedence when guides conflict

From strongest to weakest:

1. The user's explicit instruction for this document.
2. The organisation's house style guide or template.
3. A named external guide the organisation follows (for example the
   GOV.UK style guide, New Hart's Rules, or the Chicago Manual of Style).
4. Precedent from previous accepted documents.
5. The document's own style sheet (below).
6. Defaults in `uncanny` and this skill.

`uncanny`'s hard tells are about AI patterns, not house style; if a house
guide genuinely mandates something uncanny flags (a template that
requires "In conclusion" as a heading, say), the house guide wins and the
conflict is noted for the user.

## The style sheet (when no guide exists)

Write a short style sheet before drafting and keep it in the working
folder. It also becomes the terminology list `editorial-review` checks
against. Decide at least:

| Decision | Typical UK default | Example entry |
|---|---|---|
| Spelling variant | British, -ise | organise, prioritise, programme (not program, except software) |
| Serial (Oxford) comma | Varies; pick one | "red, white and blue" (no serial comma) |
| Numbers | Words for one to nine, numerals from 10 | "three sites", "12 sites"; always numerals with units: "5 km" |
| Dates | Day month year, no ordinals | 14 October 2026 |
| Times | 24-hour or am/pm, pick one | 14:30 / 2.30pm |
| Currency | Symbol before figure | €2.4 million (first use), €2.4m (thereafter, if allowed) |
| Percentages | Numeral plus % or "per cent" | 18% |
| Capitalisation of headings | Sentence case | "Costs rise if we delay" |
| Job titles | Lower case unless before a name | "the finance director", "Finance Director A. Byrne" |
| Abbreviations | Spell out on first use | "service level agreement (SLA)" |
| Lists | Lead-in plus parallel items; punctuation rule | Fragments: no full stops; sentences: full stops |
| Quotation marks | Single, with double inside | 'as she said, "no"' |
| Contractions | Allowed or not by register | Formal: avoid |
| Product and organisation names | As the owner writes them | Fictional: "NorthBay Housing", not "Northbay" |
| Preferred terms | Pairs of use / avoid | "customer" not "client"; "sign in" not "log in" |

Keep the sheet to what the document needs. A two-page report needs a
dozen entries, not a hundred.

## Applying a guide efficiently

- **Read the guide's top rules, not all of it.** Most guides have a
  summary or a "most common mistakes" section. Apply those to the draft,
  then look up specific rules when a question arises.
- **Turn rules into searches.** Each rule that has a detectable wrong form
  becomes a search: `organiz`, `e-mail`, `Per Cent`, ` - ` (spaced
  hyphen), numerals one to nine standing alone, `%` versus `per cent`.
  Run them all at the end of the word-level pass.
- **Templates beat instructions.** If the organisation has a template,
  draft in its structure from the start rather than reformatting at the
  end.
- **Do not overcorrect quotations.** Quoted material keeps its original
  spelling and punctuation; the house style applies to your own text.
- **Proper nouns keep their own style.** An American organisation's name
  keeps its spelling ("Center") even in a British document.

## Optional tooling

None is required; all are free to use locally.

- **Vale** (open source prose linter): encodes a style guide as rules and
  runs from the command line or an editor. Worth setting up for a team
  that produces many documents in one house style.
- **LanguageTool** (open source grammar and style checker; can run as a
  local server). A paid hosted tier exists and is optional. Do not paste
  confidential documents into any hosted checker without the user's
  agreement.
- **Editor find-and-replace with regular expressions** covers most
  checks with no setup.

Tool output is a list of candidates, not a verdict. Every flag gets a
human judgement; automated "fixes" applied in bulk break quotations,
names and code samples.

## Voice and tone guides

Some organisations publish voice guidance ("warm, plain, direct") rather
than mechanical rules. Translate each adjective into something checkable
before drafting: "plain" might mean average sentence under about 20
words and no undefined acronyms; "direct" might mean the ask in the first
paragraph and active voice for actions. Tone assessment in review is
`editorial-review`'s job; the translation into drafting rules is this
skill's.
