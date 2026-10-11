# Typography With Intent

Type is the fastest way to make a design read as chosen — and the fastest
tell when it is not. The reflex is Inter at every size with weight doing
all the work. The decision is a small system with named roles.

## Choosing

- **Choose from the subject's world.** A coffee roaster, a legal practice
  and a synth plugin should not share a typeface by accident. Name the
  personality axes before browsing: serif/sans, geometric/humanist,
  warm/cold, quiet/characterful.
- **A playful brand should not wear a corporate typeface** — and the
  reverse. Type is the voice; mismatch reads as template.
- **System stacks are a decision, not a failure** — inside dense product
  UI where performance and neutrality serve the user, they are often
  right. Record the choice as a register call (`tone-and-register.md`).

## Pairing

- Pair on **contrast axes**, never on similarity. Two geometric sans faces
  fight; a serif display over a humanist sans, or a mono accent over a
  grotesque body, converse. If in doubt, **one family across weights** is
  a stronger answer than a timid pairing.
- Two families per project; three only when the third has a genuine
  utility role (captions, data, code).
- **Roles**: a characterful display face used with restraint; a
  complementary, highly readable body face; optionally a utility face.
  The display face never sets body text.

## Scale and hierarchy

- Build a **modular scale** (ratios around 1.25, 1.333 or 1.5) and commit.
  Adjacent muddy sizes (14/15/16px) signal no system.
- Hierarchy combines **size + weight + colour** — never size alone. A
  step down in lightness does what two steps up in size does, quieter.
- Display headings top out around `clamp(..., 6rem)` — above ~96px reads
  as shouting. Test headlines at every breakpoint; overflow is a defect,
  not a vibe.

## Setting text

- Body at 16px/1rem minimum, sized in `rem`.
- **Measure**: 45–75 characters; `max-width: 65ch` is the working default.
- Line height ~1.5–1.7 for body, ~1.1–1.2 for display.
- **Tracking**: tighten display type, but not past about −0.04em or
  letters collide; never tighten body text; small uppercase labels take
  slight positive tracking.
- Light-on-dark needs compensation: a touch more line height
  (+0.05–0.1), a whisper of tracking (+0.01–0.02em), or a weight step
  down (400 → 350 with a variable font).
- `text-wrap: balance` on headings; `text-wrap: pretty` on long prose.

## Loading (route deep work to web-performance-development)

- `font-display: swap`; preload only the critical above-the-fold weight.
- Three or more weights of one family → prefer a variable font.

## The type self-check

1. Could this typeface appear on any similar product unchanged? If yes,
   it was not chosen.
2. Does the display face appear in body sizes anywhere? Demote it.
3. Is hierarchy carried by size alone? Add weight and colour steps.
4. Read a paragraph at the widest breakpoint — is the measure past 75ch?
5. Is there any heading that wraps into an orphaned single word?
