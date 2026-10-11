# The Tells Catalogue

Date-stamped July 2026. Tells are statistical: they drift as models
retrain, so re-verify against current model output before treating this
list as exhaustive. The *method* — find the statistical centre, then
decide rather than default — outlives any entry. CSS fragments are
recognition signatures for sweeps, not code to ship.

## Hard tells — fix every occurrence

### 1. Typeface by reflex

`font-family: Inter` (or Roboto, Open Sans, Arial) on a landing page or
brand surface, chosen by no one — Inter is the training corpus's house
font. Fix: pick type from the subject's world (`typography.md`). A system
stack is legitimate *inside dense product UI* — a register decision;
record it as one.

### 2. The purple-to-blue gradient

`linear-gradient(..., #6366f1, #8b5cf6)` and neighbours on heroes, CTAs,
logos; gradient text via `background-clip: text`. Fix: one solid colour,
emphasis via weight and size; gradients done deliberately: `colour.md`.

### 3. Cards nested in cards

A rounded, bordered or shadowed container inside another; grids where
every child re-states the parent's chrome — containment as reflex. Fix:
one container level; group with spacing, alignment, background shifts and
hairline rules (`space-and-depth.md`); a card is earned only by distinct,
actionable content.

### 4. Grey text on coloured backgrounds

Neutral greys (`color: #6b7280` and kin) on a coloured surface read washed
out. Fix: derive muted text from the background's own hue (darker on
light, lighter on dark), or the foreground colour at reduced alpha.

### 5. The icon-tile ritual

A rounded-square tinted icon tile above every heading and feature — the
same 40–48px square, six times per screen. Fix: icons only where they
disambiguate; one strong illustration beats twelve ritual glyphs. If you
cannot render it well, ship none.

### 6. Pure black and untinted grey

`#000` body text; a zero-chroma neutral ramp beside a coloured brand.
Fix: near-black, never black; tint neutrals toward the brand hue
(`colour.md` for values).

### 7. Bounce and elastic easing

Overshooting cubic-beziers (any y above 1, e.g.
`cubic-bezier(0.68, -0.55, 0.265, 1.55)`) on ordinary UI — dated, and it
points the eye at the animation. Fix: decelerating ease-out; motion ends
confidently (`motion.md`).

### 8. Side-stripe accents

`border-left: 4px solid` (or right) as the colour accent on cards, alerts
and quotes. Fix: a full hairline border, a background tint, or an icon.

### 9. The hero-metric template

Oversized number + small label + supporting stats + gradient accent as a
page's opening. Fix: open with the most characteristic thing in the
subject's world (a headline in its vernacular, an image, a live demo);
the metric hero is only right when the number is the story.

### 10. Glassmorphism and dark glows by default

`backdrop-filter: blur(...)` panels everywhere; large saturated glow
shadows on dark themes. Fix: rare and purposeful, or absent — depth comes
from a coherent elevation system, not frosted ambience.

### 11. Ritual eyebrows and fake numbering

Tiny uppercase letter-spaced labels ("FEATURES", "PROCESS") above every
section; 01/02/03 markers where order carries no information. Fix:
structure must encode something true — one deliberate sequence is voice;
numbered eyebrows on every section is machine grammar.

### 12. Border plus heavy shadow; over-rounding

`border: 1px solid` *and* a `box-shadow` with 16px+ blur on one box, both
decorative; radii of 24px+ on cards. Fix: one depth cue per surface; cards
top out around 12–16px; full-pill rounding belongs on pills and buttons.

### 13. Emoji as icon system

🚀✨💡🎯 standing in for an icon set on professional surfaces — renders
differently per platform, reads as placeholder effort. Fix: a drawn,
visually consistent icon set, or none.

## Soft tells — judge by density

Each is legitimate once; the tell is uniformity.

- **Identical card grids** — every section the same three-column grid.
  Vary spans and sizes, mix in plain content, or drop the cards.
- **Fade-and-rise scroll reveals** on every section. Spend motion on one
  orchestrated moment; let the rest simply be there.
- **Centred everything** — every block centre-aligned. Asymmetry and a
  strong grid edge are cheap sources of intent.
- **Badge and pill overuse** — chips as decoration rather than status.
- **Uniform radius and shadow** on every element regardless of size or
  role — flattens hierarchy; reads as tokens applied by loop.
- **Monotone rhythm** — equal gaps everywhere; the same section shape
  repeated. Rhythm needs contrast: tight within groups, generous between.
