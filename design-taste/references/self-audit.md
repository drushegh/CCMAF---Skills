# The Self-Audit

How to judge a design — yours or someone else's — against this skill. The
standard: **if someone could look at the interface and say "AI made that"
without hesitation, it has failed**, regardless of how clean the code is.

## The guess test (two orders)

The sharpest single instrument. Ask before and after designing:

- **First order**: could someone guess the palette, theme and layout from
  the product category alone? "AI startup" → purple gradient on dark;
  "fintech" → navy, teal, trust-badges; "wellness" → sage green and soft
  serifs. A guessable design is a reflex, not a decision.
- **Second order**: could someone guess your *escape route* from
  "category + not-the-default"? "Not SaaS-purple" → cream, editorial
  serif, terracotta is now itself guessable. Rework until both answers
  are non-obvious — the design should only be explicable from the
  *subject*, not the category.

The test of a real choice: a different brief would have produced a
different design.

## Build/restyle audit workflow

1. **State register and strategy** (one line each: register, colour
   commitment, type roles, the signature). Cannot state them → the design
   has no decisions to defend yet.
2. **Guess test**, both orders.
3. **Tell sweep** — walk the hard-tell catalogue (`tells.md`) against the
   markup and styles; the recognition signatures are greppable
   (`border-left:`, `background-clip: text`, overshooting cubic-beziers,
   `#000`, nested rounded containers).
4. **Density read** — soft tells: card grids, scroll reveals, centring,
   pills, uniform radius/shadow, monotone rhythm. One is fine; a pattern
   is a signature.
5. **Signature count** — exactly one place where boldness is spent. Zero
   means default; three means costume.
6. **Subtraction pass** — remove one decoration that does not serve the
   brief. There is always one.
7. **Register check** — polish budget matches the surface's job
   (`tone-and-register.md`).
8. **Floor check** — contrast, focus visibility, reduced motion
   (`accessibility-development`). Taste never trades against the floor.
9. **Render and look** (`ui-verification`) — a tell sweep of unrendered
   code misses half the catalogue; grey-on-colour and monotone rhythm
   only show in pixels.

## Audit mode output

When reviewing without changing:

`[severity: hard|soft-density] [category] "located element or selector"
(suggested fix)`

Close with one paragraph: does this design read as AI-generated, and what
are the two highest-value fixes? Counts, locations and density
observations are diagnostic; marks out of ten are theatre. Do not return a
redesign unless asked.

## Calibration examples

Each row: the reflex, the overcorrection, and what a decision looks like.
The third column is the target; the second is the trap this skill exists
to prevent.

| Brief | Reflex (first order) | Overcorrection (second order) | A decision |
|---|---|---|---|
| AI dev-tool landing page | Dark theme, purple→blue gradient hero, Inter, three-column icon-tile features | Cream background, oversized editorial serif, terracotta accent, 01/02/03 eyebrows | Terminal-derived aesthetic: the product's own output as the hero, mono accents from real logs, one committed accent from the brand |
| Accountancy product app | Navy + teal, trust badges, card-grid dashboard | Broadsheet: hairlines, zero radius, Tiepolo serif everywhere | Quiet system stack, tinted warm neutrals, density tuned for daily use, one precise signature in the numbers' typography |
| Photographer portfolio | Masonry grid, white, Inter, fade-up reveals on scroll | Brutalist: raw HTML look, system yellow, marquee text | The photographs set the palette; type recedes to captions; the one motion moment is how images hand over to each other |

The pattern: the decision column is always *derived from the subject's own
world* — its materials, vernacular and artefacts — which is why it cannot
be guessed from the category and cannot be reused for the next brief.

## When the human disagrees

Taste disputes are not verdicts to win. If the user asks for a banned
pattern explicitly, say why it is on the list, offer the fix once, then
build what they asked for — the brief's words beat the catalogue. Note it
and move on; this skill removes *defaults*, not *choices*.
