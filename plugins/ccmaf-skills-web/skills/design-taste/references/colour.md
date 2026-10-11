# Colour as Strategy

The reflex palette is an indigo-to-violet gradient over zero-chroma greys.
The decision is a small palette with named roles and a stated level of
commitment. More colour is not better colour; every hue must have a job.

## The commitment spectrum

Choose a strategy per surface and state it — each is legitimate, drifting
between them is not:

- **Restrained** — tinted neutrals + one accent on ≤10% of the surface.
  The accent must then be genuinely reserved: if everything is
  highlighted, nothing is.
- **Committed** — one saturated colour owning 30–60% of the surface.
- **Full palette** — three to four colours with distinct roles beyond the
  neutrals.
- **Drenched** — the surface *is* the colour; neutrals become the accent.

Weight the palette roughly 60/30/10 (dominant/secondary/accent) as visual
weight, not pixel count.

## Neutrals are colours too

- **Zero-chroma grey beside a coloured brand feels lifeless.** Tint the
  neutral ramp slightly toward the brand hue — in OKLCH, roughly
  0.005–0.015 chroma — so text, surfaces and brand cohere without reading
  as deliberately tinted.
- Near-black, never `#000`; near-white, never stark `#fff` behind long
  reading.
- Work in **OKLCH**: it is perceptually uniform, so equal lightness steps
  look equal (HSL lies — 50% lightness in yellow and in blue are wildly
  different). To build a ramp, hold hue steady, vary lightness, and pull
  chroma down as you approach white or black:

```css
:root {
  --ink:     oklch(22% 0.012 260); /* near-black, tinted to brand hue */
  --surface: oklch(98% 0.005 260);
  --brand:   oklch(55% 0.17 260);
}
```

## The recurring failures

- **Grey text on coloured backgrounds** — use a darker/lighter shade of
  the background's own hue, or the foreground at reduced alpha.
- **Colour alone carrying meaning** — pair state colours with an icon or
  label; red/green alone excludes roughly 8% of men.
- **The default gradient** — see the tells catalogue. A deliberate
  gradient stays within one hue's lightness range or between neighbouring
  hues, on one surface, and never runs through text.
- Contrast floors (4.5:1 body, 3:1 large text and UI) are the
  accessibility floor, not a target → `accessibility-development`.

## Theme as scene, not reflex

Dark mode by default for "tech" and light for everything else is a
category reflex. Choose the theme from the product's actual scene: who is
using it, where, in what light, in what mood. A night-shift monitoring
tool earns dark; a tax form does not.

**Dark mode is not inverted light mode:**

- Elevation comes from *lighter surfaces*, not shadows — shadows are
  nearly invisible on dark.
- Desaturate accents a step; fully saturated colour vibrates on dark.
- Consider a small font-weight reduction for light-on-dark legibility.

## The colour self-check

1. Name the strategy (restrained/committed/full/drenched). Can you?
2. Could someone guess the palette from the product category alone?
   (Fintech → navy and teal; AI → purple on black.) Rework the reflex.
3. Are the neutrals tinted toward the brand hue, or straight grey?
4. Does any grey text sit on a coloured surface?
5. Does every non-neutral colour have a nameable job?
