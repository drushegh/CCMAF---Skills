# Registers: how the rules change

Stop-slop-style rulebooks are calibrated for one register: the punchy personal essay. Applying that register's fixes to a tender response or API doc produces text that is wrong twice: still detectable, and now inappropriate for its audience. Identify the register before editing, and apply this file's overrides.

The hard tells (throat-clearing, contrast-reframes, tailing participles, puffery, vague attribution, chatbot residue) are hard in **every** register. What changes is the soft-tell calibration and the *fixes*.

## Conversational / essay / blog

The baseline register; the main skill file's guidance applies as written. "You" address, occasional fragments, and contractions are natural here. The overcorrection risk is highest here too; this is where staccato Hemingway parody gets produced. Vary sentence length; let some sentences be long because the thought is long.

## Professional / formal (tenders, proposals, reports, client-facing documents)

UK English throughout: organise, prioritise, licence (noun) / license (verb), programme (initiative) / program (software), colour, behaviour, "whilst" sparingly if at all, no "gotten". Dates as 7 July 2026. € before amounts, no space. Note the em-dash ban overrides UK house styles that favour spaced en dashes for parentheticals; use commas, parentheses, or colons instead. En dashes stay for numeric ranges only.

**Overrides:**

- **No "You" address, no fragments, no manufactured punchiness.** Full sentences, measured tone. The essay-register fixes are errors here.
- **Passive voice is sometimes correct.** "The solution will be deployed to the Department's Azure tenancy" is fine; the deploying party is established by the document's frame. Fix passives that evade accountability ("delays were experienced"), keep passives that foreground the object.
- **Institutional agency is legitimate.** "Northwind will provide", "the Authority requires", "the contract provides for": organisations are the actors in this register. The false-agency rule targets abstractions ("the roadmap demands", "the transformation journey delivers"), not institutions.
- **Mirror scored terminology.** If the requirements matrix says "comprehensive training programme", the response says "comprehensive training programme", because evaluators score keyword coverage. The plain-word substitutions from lexicon.md Tier 2 apply everywhere the client's own vocabulary doesn't.
- **Structure is scored.** Headings mapped to requirements, numbered sections, and tables are correct here even though they'd be formatting-spam in an essay. The tell in this register isn't structure but *empty* structure: a bullet that restates its heading, boilerplate paragraphs interchangeable between any two bids, benefit claims with no mechanism or number.
- **The professional slop signature.** In this register the loudest tells are: significance inflation ("a truly transformative solution"), unfalsifiable benefit claims ("driving efficiency and unlocking value"), synergy-class jargon, hedge-free overpromising ("will seamlessly integrate"), and Tier 3 vocabulary density. The fix is always the same: mechanism + number + named thing. "Reduces case triage from 4 days to same-day by routing via the FHIR API" survives any detector because it's a claim about the world, not about itself.
- **Adverb policy tightens.** Emphasis adverbs read as padding to evaluators counting pages. Information adverbs ("independently audited", "formerly manual") stay.

## Technical documentation (READMEs, API docs, runbooks, ADRs)

- **Imperative mood, second person implied**: "Run the installer", "Set `TIMEOUT` to 30". This looks like a rule-of-brevity violation from the essay register; it's the genre's grammar.
- **Repetition is a feature.** Docs are read non-linearly. Repeating a warning in two sections is service, not slop. The uniform-paragraph rule relaxes; the parallel-structure rule *inverts*: parallel steps should be phrased in parallel.
- **Passive acceptable for system behaviour**: "The token is refreshed every 3600 seconds."
- **The tells that still bite here:** significance inflation ("this powerful feature"), marketing vocabulary in reference material ("seamlessly", "robust"), tailing participles ("returns a 200, ensuring reliability"), and filler intros ("In this guide, we'll walk through…" → delete; start at step 1).

## Marketing / announcement copy

The genre legitimately uses devices other registers ban: second person, short sentences, occasional triples, even a contrast if it's earned. The bar shifts from "no rhetoric" to "no *stock* rhetoric": "game-changing", "seamless experience", "unlock the power of", "we're thrilled to announce" are dead on arrival because every AI announcement uses them. The fix is specificity (the one concrete thing this launch does that the last one didn't) and restraint: one rhetorical device per paragraph, chosen, not defaulted.

## Cross-register rule

When editing someone else's text, match *their* register and voice, minus the tells. If a colleague writes long, subordinate-clause-heavy sentences, the edit removes their "leverage"s and tailing participles; it does not convert them into a different writer.
