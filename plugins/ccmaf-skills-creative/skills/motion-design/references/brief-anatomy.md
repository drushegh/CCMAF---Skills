# Brief Anatomy — directing motion with numbers

A motion brief exists to remove decisions from the model. Each unfilled line
is a choice the model makes for you, and its unguided choices converge on the
same look: gradients, glow, particles, everything centred, everything fading
up together. Length is a side-effect, not the goal.

## The template

Fill every line before generating anything.

```
GOAL:    one sentence — what the viewer should feel or do
OUTPUT:  engine + format, W x H (e.g. "single self-contained HTML, 1080x1080";
         "Remotion composition, 1920x1080, 30 fps, 450 frames")
TIME:    seconds x fps = total frames; loop yes/no; BPM if scored
LOOK:    palette in hex, ONE accent and where it may appear; backdrop;
         typeface + weight + size + tracking
MOTION:  easings as cubic-bezier (or token names), springs as damping ratio
         + frequency, durations in frames
SHOTS:   frame ranges; one hero move per shot; the handoff into the next
         (hard cut on the beat / match cut / mask wipe — default to the cut)
BANNED:  named defaults you never want to see
QA:      stills at named frames, a contact sheet, fix, then full render
```

For 3D add:

```
MODEL:   primitives and proportions in units; materials (roughness, metalness,
         clearcoat, hex)
CAMERA:  field of view, distance, orbit range in degrees, push-ins with easing
         and frame ranges; "never fully parked" during holds
LIGHTS:  key / fill / rim with colour, colour temperature or hex, intensity and
         direction; environment/reflection source
```

For anything with an identity add:

```
INVARIANTS: what may NOT change — character proportions, logo geometry,
            brand colours, type. This line is the guardrail that keeps a
            mascot recognisable when rebuilt in 3D or restyled.
```

Order of writing: **GOAL → TIME → SHOTS → MOTION → LOOK → BANNED → QA**.
TIME before everything else because frame ranges, beats and holds all derive
from it.

## Ban lists

Start every brief from a baseline and grow it per project:

- purple/blue gradients, glow, glow orbs, bloom (unless asked), neon, lens flares
- decorative floating particles
- everything fading in at once
- fade-and-slide-up applied to every element
- centred-everything layouts
- generic spinning turntable product shots
- dark backgrounds as the default "premium" signal
- text that moves while it is being read
- overshoot/bounce on text, opacity or colour

**Keep it alive.** After every first render, look for which defaults the
model used anyway, name them specifically, and add them. "Avoid generic
looks" doesn't work; "no radial vignette glow behind the logo" does.

## Hierarchy: one hero per shot

- One orchestrated hero move per shot lands better than scattered effects.
- **Secondary** moves travel 50–70% of the hero's distance and start
  100–200 ms after it.
- **Ambient** motion stays under ~5% of the hero's travel, runs on a slow
  sine, and never stops (a frozen frame reads as a bug).
- Non-hero elements wait, dim (to ~40%), or hold still.
- Change layout on the bar (every 4 beats), cut on the beat. Changing
  everything every beat exhausts the viewer.

## Translating feelings into numbers

Never act on a feeling-note directly. Convert first:

| Adjective | Becomes |
|---|---|
| Premium | Named materials (roughness, clearcoat), ease-out-quint entrances, ζ≈0.8 springs, accent restricted to one surface |
| Cool / striking | A defined studio: key, fill, rim with exact colours/strengths; no glow |
| Modern | A camera spec: narrow-ish FOV, a camera that never parks, a single eased push-in |
| Animated / lively | A beat grid and springs: BPM, anticipation frames, damping per part, follow-through lag in frames |
| Playful | ease-out-back pops, ζ 0.4–0.6, squash/stretch ratios |
| Pop | Scale 1.0 → 1.08 → 1.0 over ~6 frames on the beat |
| Snappy | Shorter durations (UI moves 200–300 ms), expo out, exits 40–50% shorter than entrances |

## Worked comparison: vague vs directed

The source ran a controlled test: same subject (earbuds in a charging case),
same engine, same canvas, same loop length. The vague brief was one sentence
asking for something cool, premium and modern. The directed brief filled the
template. Observed results:

- The vague brief produced nearly every banned default: gradients, glow,
  particles, a turntable spin, a dark backdrop. It took ~30 min with zero
  follow-ups.
- The directed brief took ~90 min including **4 visual review rounds**
  (15 creative follow-ups across picture and sound). Review rounds were
  driven by measuring pixels in stills, not taste.
- What changed, mapped from adjective to spec:
  - "premium" → specified ceramic and chrome materials, accent colour only
    on the inner deck;
  - "cool" → key/fill/rim lights with exact colours and strengths, code-built
    reflection environment, soft contact shadows, no glow;
  - "modern" → a defined FOV, an always-moving camera orbit, one expo push-in;
  - "animation" → 120 BPM grid, 3-frame anticipation before the lid springs at
    ζ 0.6, staggered bud rise with looser follow-through;
  - defaults named and banned outright.

Typical first-round notes on a directed 3D piece (useful as a checklist):
white object melting into a light backdrop (reduce ambient/dome so unlit
sides fall off); chrome reading flat grey (needs dark and bright bands to
reflect); a flat slab where a hollow part should be; a round dark feature
reading as an "eye"; geometry poking through walls; an accent colour shifting
hue under specular washout; glints too faint or flooding whole faces (keep
moving highlight strips in the reflection pass only).

## An original example brief (2D, plain HTML)

```
GOAL:    A viewer understands in 3 s that the app turns scattered notes
         into one timeline.
OUTPUT:  single self-contained HTML, 1080x1350 (4:5), no libraries.
TIME:    5 s x 24 fps = 120 frames. Loop: yes. 120 BPM (12 frames/beat).
LOOK:    backdrop #F3F1EC; ink #1A1A1A; one accent #2F6BFF on the timeline
         line only. Inter Tight 600, 64 px, tracking -0.02em for the title.
MOTION:  tokens from motion-tokens.js only. Entrances EASE.enter, moves
         EASE.move, exits EASE.exit. Cards settle with spring ζ 0.75, 2.2 Hz.
SHOTS:   0–23   six note cards scattered, drifting ≤ 4 px on slow sines.
         24–59  hero: cards snap onto a vertical timeline, 2 frames apart,
                top first; line draws down with them.
         60–95  hold; title "One timeline." types on, 1 frame per letter;
                2% push.
         96–119 cards and title exit EASE.exit; frame 119 flows into frame 0.
BANNED:  gradients, glow, drop-shadow blur > 8 px, particles, centred stacks,
         fade-and-slide-up, any motion on text after it finishes typing.
QA:      stills at 0, 24, 42, 60, 96, 119; contact sheet of every 12th frame;
         confirm 119 → 0 is seamless before the full render.
```
