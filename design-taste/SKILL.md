---
name: design-taste
description: >-
  Remove AI tells from visual design and replace defaults with decisions —
  the aesthetic sibling of uncanny. Owns the catalogue of patterns that make
  a UI read as AI-generated (Inter-by-reflex, purple-to-blue gradients,
  cards nested in cards, grey text on coloured backgrounds, the icon tile
  above every heading, pure black and untinted grey, bounce easing) and
  their fixes; the vocabulary of distinctive type, colour, space, depth and
  motion; tone calibration (bolder/quieter); and register awareness
  (marketing vs product app vs docs vs dashboard). Use whenever building,
  restyling or reviewing ANY user-facing UI — components, landing pages,
  dashboards, docs sites, artifacts, slides, HTML emails — even if the user
  only says "make it look better", "more professional", "less generic", or
  "why does this look AI-generated". Also use in audit mode on an existing
  design. Framework-neutral taste and judgement: frontend-development
  implements what this skill decides.
metadata:
  author: Damien (adapts ideas from pbakaus/impeccable, Apache-2.0)
  version: 1.0.0
---

# Design Taste

AI-generated UI has a look, recognisable at a glance: the same typeface,
the same gradient, the same grid of identical cards, the same icon tile
above every heading. It happens for the same reason AI prose has a voice —
every model trained on the same SaaS corpus, so unguided generation
collapses to the statistical centre. This skill is the visual sibling of
`uncanny`: that one removes AI tells from prose; this one from design.

**The goal is design that reads as chosen, not generated.** The test of a
choice: would a different brief have produced a different design? If any
similar prompt yields the same look, those are defaults, not decisions.

## The prime rule: a decision, not a costume

The naive fix for "generic" swaps one uniform for another. The current
escape-hatch looks — warm cream with high-contrast serif and terracotta;
near-black with one acid accent; broadsheet hairlines at zero radius — are
training-data reflexes too, one level up: a costume change, not taste. And
overcorrecting — five signature moments, a novelty face on body text,
decoration standing in for personality — is "trying too hard", which reads
as AI just as loudly.

**Anti-rationalisation clauses.** These moves defeat the rules while
pretending to follow them:

1. **Recolouring the template is not fixing it.** The same hero, card grid
   and icon ritual in a new palette is the same tell. Restructure or cut.
2. **"The brief asked for SaaS" does not license the tells.** Register
   sets the boldness budget; it never re-admits banned patterns.
3. **More decoration is not more personality.** Personality is commitment
   in type, colour, space and motion — not accessories.
4. **"Deliberate" use of a tell is still a tell.** The viewer cannot see
   intent, only the pattern they have seen a thousand times.
5. **Fixing one instance while its twins remain is not a pass.** Tells are
   systemic: one nested card means auditing every container.

## Operating modes

- **Build** — apply at design time; never generate the default, then de-slop.
- **Restyle** — preserve the product's genuine language; fix tells, not identity.
- **Audit** — report in the output format below; redesign only if asked.

## Register before rules

Judge polish against the surface's job. The tells are banned everywhere;
only the boldness budget changes (`references/tone-and-register.md`).

| Register | Boldness budget |
|---|---|
| Marketing / landing | High — the surface is the brand; spend the signature here |
| Product app / tool | Low-moderate — personality lives in details and precision |
| Docs / long-form | Near zero decoration — typography and rhythm are the design |
| Dashboard / data-heavy | Chrome recedes; colour is reserved for meaning |

## Hard tells (fix on sight)

Catalogue date-stamped July 2026 — tells drift as models retrain; re-verify
against current model output before treating it as exhaustive. Recognition
signatures and full fixes: `references/tells.md`. Headline categories:

| # | Tell — recognition | Fix |
|---|---|---|
| 1 | **Typeface by reflex** — Inter/Roboto/Open Sans on a brand surface, chosen by no one | Type from the subject's world; system stacks in dense product UI are a register call, not a tell |
| 2 | **Purple-to-blue gradient** — indigo→violet heroes/CTAs; gradient text via `background-clip` | Commit to one solid colour |
| 3 | **Cards nested in cards**; "everything is a card" | One container level; group with space, alignment, background shifts |
| 4 | **Grey text on coloured backgrounds** — washed out | A shade of the background's own hue, or foreground at alpha |
| 5 | **The icon-tile ritual** — rounded-square tinted tile above every heading | Icons only where they disambiguate |
| 6 | **Pure black and untinted grey** — `#000`, zero-chroma ramps beside a coloured brand | Near-black; tint neutrals toward the brand hue |
| 7 | **Bounce/elastic easing** on ordinary UI | Decelerating ease-out; motion ends confidently |
| 8 | **Side-stripe accents** — 3–4px `border-left` colour stripe on cards/alerts | Full hairline border, background tint, or an icon |
| 9 | **Hero-metric template** — big number + label + stat row + gradient | Open with the subject's most characteristic thing |
| 10 | **Glassmorphism / dark glows** as default ambience | Rare and purposeful, or absent |
| 11 | **Ritual eyebrows and fake numbering** — uppercase tracked labels, 01/02/03 on every section | Structure must encode something true |
| 12 | **Border + heavy shadow together; over-rounding** (24px+ card radii) | One depth cue per surface; radius fits element size |
| 13 | **Emoji as icon system** on professional surfaces | A drawn icon set, or nothing |

## Soft tells (judge by density)

Legitimate devices AI overuses. One is a choice; everywhere is a signature.

1. **Identical card grids** every section — vary spans/sizes, or no cards.
2. **Fade-and-rise reveals** everywhere — spend motion on one moment.
3. **Centred everything** — asymmetry is a free source of intent.
4. **Badge and pill overuse** — chips as decoration rather than status.
5. **Uniform radius and shadow** regardless of element size or role.
6. **Monotone rhythm** — equal gaps; every section the same shape.

## Decision table

| Situation | Lever | Reference |
|---|---|---|
| "This looks AI-generated" | Tell sweep + the guess test | tells.md, self-audit.md |
| "Make it look better / professional" | Usually space and depth discipline, not decoration | space-and-depth.md |
| "Too bland, needs impact" | Bolder = commitment, never effects | tone-and-register.md |
| "Too loud / busy" | Quieter, keeping the point of view | tone-and-register.md |
| Choosing or pairing fonts | Type with intent, roles, scale | typography.md |
| Palette, dark mode, gradients | Colour as strategy | colour.md |
| Adding animation | Purposeful motion, durations, easing | motion.md |
| Reviewing someone else's UI | Audit mode + output format | self-audit.md |

## Pre-delivery self-audit

Walk this before presenting any design; full method in
`references/self-audit.md`. On any hit, fix and re-run.

1. **Guess test, first order**: could someone guess palette and theme
   from the product category alone? Rework the reflex.
2. **Guess test, second order**: could they guess your *escape* from
   "category + not-the-default"? Rework again.
3. **Tell sweep**: search markup and styles for hard-tell signatures.
4. **Density read**: soft tells clustered? Break the pattern.
5. **Signature count**: exactly one. Zero is a default; three is costume.
6. **Subtraction pass**: remove one decoration that serves nothing.
7. **Register check**: does the polish level match the surface's job?
8. **Floor check**: contrast, focus, reduced motion — never traded for
   taste (`accessibility-development`).
9. **Render and look** — never judge from code (`ui-verification`).

## Audit mode output format

Per finding: `[severity: hard|soft-density] [category] "located element or
selector" (suggested fix)`. Close with a one-paragraph judgement: does this
design read as AI-generated, and what are the two highest-value fixes?
Counts and locations are diagnostic; marks out of ten are not.

## References

- `references/tells.md` — full catalogue: signatures (with CSS), why, fixes.
- `references/typography.md` — pairing axes, roles, scale, measure, display.
- `references/colour.md` — tinted neutrals, commitment spectrum, dark mode.
- `references/space-and-depth.md` — rhythm, containers beyond cards, depth.
- `references/motion.md` — durations, easing, what to animate, reduced motion.
- `references/tone-and-register.md` — bolder/quieter levers; register budgets.
- `references/self-audit.md` — guess test, workflow, output format, examples.

## Boundaries

- **Implementation** (HTML/CSS/Tailwind, tokens, theming) →
  `frontend-development` — it builds what this skill decides; use both.
- **Interaction and perception** (eye path, targets, choices, Gestalt,
  unhappy paths) → `ux-design` — aesthetic hierarchy here, scanning and
  finding hierarchy there.
- **The render → view → critique loop** → `ui-verification` — this skill
  is a rubric that loop critiques against.
- **Prose tells** in copy → `uncanny`, the sibling discipline.
- **Contrast, focus, reduced motion, WCAG** → `accessibility-development`
  — a hard constraint taste never overrides.
- **Font loading, animation cost, Web Vitals** → `web-performance-development`.
- **Game motion feel** → `game-feel`; UI motion is here, real-time control there.

## Credits

Adapts ideas from [impeccable](https://github.com/pbakaus/impeccable) by
Paul Bakaus (Apache-2.0) — the tells catalogue, the bolder/quieter axis and
the category-reflex test originate there; the treatment is this library's
own. Structure mirrors the sibling skill `uncanny`. Worth reading in full.
