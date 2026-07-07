---
name: uncanny
description: >-
  Remove AI tells from prose without replacing them with a different costume.
  Use this skill whenever writing, editing, reviewing, or rewriting any prose a
  human will read: documents, reports, tender responses, emails, blog posts,
  articles, READMEs, announcements, LinkedIn posts, executive summaries. Use it
  even if the user only says "write X", "draft Y", "make this sound less AI",
  "humanise this", "polish this", or "does this sound like AI?". Also use it in
  audit mode when asked to review someone else's text for AI patterns.
  Do NOT use for code, config, commit messages, or structured data.
metadata:
  author: Damien (extends hardikpandya/stop-slop, MIT, and
    Wikipedia:Signs of AI writing, WikiProject AI Cleanup)
  version: 1.1.0
---

# Uncanny

AI prose sits in an uncanny valley: grammatical, polished, and almost human, yet wrong in aggregate. Readers sense the machine before they can name it. This skill names it, then removes it: the phrases, structures, and rhythms that betray machine origin regardless of subject matter.

**The goal is prose that is unremarkable in style and remarkable in substance.** Not punchy. Not minimalist. Not a different recognisable voice. A reader should notice what the text says, never how it was generated.

## The prime rule: no costume-swapping

Most anti-slop rulebooks fail by overcorrecting. Strip every stylistic device and chop every sentence short, and you produce a second machine voice: staccato Hemingway parody, six-word sentences, manufactured bluntness. That is equally detectable and often worse for professional writing.

So this skill separates:

- **Hard tells**: patterns with near-zero legitimate use, or patterns readers flag on sight regardless of legitimacy. Any occurrence gets fixed.
- **Soft tells**: legitimate devices AI overuses. Judged by *density*, not presence. One triple on a page is rhetoric; a triple in every sentence is a signature.

**Anti-rationalisation clauses.** These are the moves that defeat the rules while pretending to follow them. If you catch yourself making one, that is the violation:

1. **Synonym-swapping is not fixing.** Replacing "delve into" with "dive deep into" or "it's worth noting" with "notably" keeps the structure and swaps the token. The structure is the tell. Restructure or delete.
2. **"But here it's justified" is not an argument for a hard tell.** Hard tells are hard because the justification instinct is itself the pattern. If a sentence needs "It's important to note that", the sentence should demonstrate importance instead.
3. **Compressing is not the same as improving.** Cutting a 20-word sentence to 6 words is only a fix if the 6 words carry the same information. If meaning was lost, you performed style, not editing.
4. **A quota is not a target.** "Soft tells judged by density" does not mean "use your allowance". It means stop counting individual instances and start reading the page.
5. **Rewriting the flagged sentence while leaving its twin two paragraphs down is not a pass.** Tells cluster. Finding one means searching for the rest.

## Operating modes

Infer the mode from the request; state which one you're in if ambiguous.

- **Write**: generating new prose. Apply everything at generation time; do not draft slop and clean it after.
- **Edit**: transforming existing text. Preserve the author's meaning, register, and any voice that is genuinely theirs. Fix tells, not personality.
- **Audit**: reviewing text without rewriting it (e.g. checking a colleague's contribution). Report findings as pattern, location, severity, and suggested fix. Do not return a rewritten version unless asked.

## Register before rules

Identify the register first; several rules invert between registers. Read `references/registers.md` when the target is professional/formal or technical documentation. The blog-voice fixes ("You" address, fragments, six-word sentences) are themselves errors there.

Registers: **conversational/essay**, **professional/formal** (tenders, proposals, reports, client emails; UK English unless told otherwise), **technical documentation**, **marketing**.

## Hard tells (fix every occurrence)

Full catalogue with fixes in `references/lexicon.md` and `references/structures.md`. Headline categories:

1. **Em dashes.** Banned outright, in every register. Not because the punctuation is wrong, but because it is the single most recognised AI tell: readers flag it at a glance without reading the sentence. Replace with a comma, colon, parentheses, or a full stop, and restructure where a mechanical swap would create a splice. En dashes survive only in numeric ranges (2019–2024, pp. 40–70); parenthetical spaced dashes go the same way as em dashes.
2. **Throat-clearing and meta-commentary.** "Here's the thing", "Let's unpack", "In this section we'll", "It's worth noting", "It's important to note". State the content.
3. **Significance inflation.** "stands as a testament to", "plays a pivotal role", "underscores the importance of", "marking a significant milestone". Puffery about importance instead of evidence of it.
4. **Tailing participle clauses.** Sentence ends with ", highlighting…", ", underscoring…", ", reflecting…", ", showcasing…", ", ensuring…" tacked on to assert unearned significance. Delete the clause or make its claim a sentence that carries weight.
5. **The contrast-reframe.** "It's not just X, it's Y", "The question isn't X. It's Y", "Not because X. Because Y." State Y. (Genuine contrast between two real ideas is fine; the tell is negation as a drum-roll.)
6. **Negative listing.** "It wasn't X. It wasn't Y. It was Z." State Z.
7. **False ranges.** "from X to Y" where X and Y are not endpoints of anything ("from strategy to execution to culture"). Name the actual items or the actual range.
8. **Vague attribution.** "Industry experts say", "Studies show", "It is widely regarded" with no nameable source. Name the source or drop the claim.
9. **Vague declaratives.** "The implications are significant." Name the implication.
10. **False agency.** "The decision emerged", "the data tells us", "the culture shifted". Name who did what. (Professional register permits some institutional agency; see registers.md.)
11. **Chatbot residue.** "I hope this helps", "Certainly!", "Great question", "Let me know if", knowledge-cutoff disclaimers, prompt echoes. Delete on sight.
12. **Summary bow endings.** Final paragraph beginning "In conclusion", "Overall", "Ultimately" that restates the piece. End when the content ends.

## Soft tells (judge by density and placement)

1. **Rule of three.** Legitimate rhetoric. AI triples *everything*: adjectives, examples, clause rhythms. If three consecutive sentences or bullets each contain a triple, break the pattern. Sometimes two examples; sometimes four; sometimes one.
2. **Adverbs and intensifiers.** "really", "actually", "genuinely", "incredibly" are usually deletable filler. But a blanket adverb ban mutilates prose; "deliberately misled" and "roughly €2M" carry meaning. Delete adverbs that add emphasis; keep adverbs that add information.
3. **Hedging.** "might", "could", "in many cases", "somewhat" stacked in one sentence is a tell; calibrated uncertainty stated once is honesty. One hedge per claim, maximum, and only where uncertainty is real.
4. **Bold-spam and formatting.** Bolding key phrases in every paragraph, emoji-headed sections, title-case headings on everything, bullets where prose belongs. Formatting is for navigation, not emphasis-by-default.
5. **Uniform paragraph shape.** Every paragraph 3 or 4 sentences ending in a neat bow. Vary length; let one paragraph be a single sentence when it earns it, and let another run long.
6. **AI vocabulary.** delve, tapestry, landscape, leverage, robust, seamless, holistic, vibrant, boasts, fosters, crucial, intricate, comprehensive, streamline, elevate. None banned; all statistically loud. One is noise; three in a paragraph is a signature. Prefer the plain word (see lexicon.md for pairs).

## Pre-delivery self-check

Walk this before returning any prose. On any hit, fix it and re-run the check on the changed text.

1. Search the text for the em dash character (and spaced parenthetical dashes). Any hit outside a numeric range: restructure the sentence.
2. Search the text for every other hard tell category above. Any hit: fix, not synonym-swap.
3. Count triples. Over density threshold: restructure the worst offenders.
4. Read the openings of every paragraph aloud (mentally). Same shape twice in a row: vary.
5. Scan sentence endings for tailing participles.
6. Find the three most confident claims. Each has a named source, a number, or a demonstrable basis? If not, hedge once honestly or cut.
7. Check the ending. Does the last paragraph add anything, or is it a bow?
8. Register check: does every fix belong to the *target* register? Any staccato fragments or "You" address in a formal document is an overcorrection; revert to full sentences.
9. UK English throughout if professional register (organise, prioritise, colour, no "gotten").
10. **Overcorrection pass:** does the result read like it's *performing* plainness? If every sentence is under 10 words, you swapped costumes. Restore natural variation.

## Audit mode output format

For each finding: `[severity: hard|soft-density] [category] "quoted fragment" (suggested fix)`. Close with a one-paragraph overall judgement: is this text detectably AI, and what are the two highest-value fixes? No scores out of 50. Counts of hard tells and density measurements are diagnostic; subjective 1 to 10 ratings are not.

## References

- `references/lexicon.md`: words and phrases, tiered (delete / replace / density-watch), with plain-word replacement pairs.
- `references/structures.md`: structural and rhythm patterns with fixes and the overcorrection trap for each.
- `references/registers.md`: how rules change across conversational, professional/formal (UK), technical, and marketing registers. Read before editing professional or technical text.
- `references/examples.md`: before / after / overcorrected triples. The third column is what NOT to produce.

## Credits

Extends [stop-slop](https://github.com/hardikpandya/stop-slop) by Hardik Pandya (MIT) and the pattern catalogue maintained by Wikipedia's WikiProject AI Cleanup ("Signs of AI writing"). Both are worth reading in full.
