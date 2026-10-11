# Uncanny

A skill for removing AI tells from prose without installing new ones.

AI prose sits in an uncanny valley: grammatical, polished, almost human, and wrong in aggregate. This skill catches the lexical, structural, and rhythmic patterns that betray machine origin. Unlike most anti-slop rulebooks, it also catches the *overcorrection* voice (staccato fragments, mic-drop endings, performative plainness) that naive de-slopping produces.

## What's different from stop-slop

Built on Hardik Pandya's [stop-slop](https://github.com/hardikpandya/stop-slop) (MIT) and Wikipedia's WikiProject AI Cleanup catalogue, with four extensions:

1. **Hard vs soft tells.** Blanket bans on legitimate devices create a second detectable voice, so most devices are judged by density and placement rather than banned. The exception is the em dash: banned outright on perception grounds, because readers flag it on sight as the canonical AI tell and every use has a cheap replacement.
2. **Register awareness.** Blog-voice fixes are errors in tenders, reports, and technical docs. `references/registers.md` overrides the rules per register, including UK-English professional writing.
3. **Anti-rationalisation clauses.** The named ways an editor (human or model) defeats the rules while pretending to follow them: synonym-swapping, "but here it's justified", compression-as-improvement.
4. **Before / after / overcorrected examples.** Every example shows the trap edit as well as the fix.

Plus the Wikipedia-derived patterns stop-slop misses: tailing participle clauses, false ranges, vague attribution, significance inflation, editorial inserts, summary bows, chatbot residue, uniform paragraph architecture, and the AI vocabulary co-occurrence list.

## Structure

```
uncanny/
├── SKILL.md                 # Core rules, modes, self-check
└── references/
    ├── lexicon.md           # Words/phrases, tiered: delete / replace / density-watch
    ├── structures.md        # Structural patterns, each with its overcorrection trap
    ├── registers.md         # Per-register rule overrides (incl. UK professional)
    └── examples.md          # Before / after / overcorrected triples
```

## Modes

- **Write**: apply at generation time
- **Edit**: fix tells, preserve the author's voice and register
- **Audit**: report findings without rewriting

## Licence

MIT. Incorporates and extends stop-slop (© Hardik Pandya, MIT).
