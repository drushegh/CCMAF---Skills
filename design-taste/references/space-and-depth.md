# Space and Depth

Space is the most underused design tool, and the cheapest source of
quality: most "make it look better" requests are solved by spacing and
depth discipline, not by adding decoration. The reflex is uniform gaps,
a card around everything, and radius + border + shadow applied to every
box by loop.

## Rhythm through contrast

- Build on a **4pt base scale** (4, 8, 12, 16, 24, 32, 48, 64, 96) with
  semantic tokens; an 8pt base is too coarse for fine control.
- **Tight within groups, generous between them**: 8–12px between related
  elements, 48–96px between sections. Monotone spacing — the same gap
  everywhere — is structural silence: nothing reads as grouped, so the
  layout has no shape.
- Spacing states a relationship. If two unrelated blocks sit closer than
  two related ones, the design is lying (`ux-design` owns the perception
  law; this skill owns using it aesthetically).
- Let spacing breathe at larger sizes (`clamp()` for fluid gaps) rather
  than scaling everything linearly.

## Containers beyond cards

The card is the lazy answer to "these things belong together". Before
boxing anything, try, in order:

1. **Whitespace and alignment** — proximity plus a shared edge groups
   without any chrome.
2. **A background shift** — one surface a step lighter or darker.
3. **A hairline rule** — one line where the boundary genuinely helps.
4. **Typographic structure** — a strong heading with indented content.

Use a card only when the content is truly distinct and actionable (a
navigable unit, a selectable option). Never nest cards. In grids, vary
spans and sizes or mix cards with plain content — twelve identical cards
is a tell, not a layout.

## Depth as a system

- **Pick one primary depth cue** per design: borders *or* shadows.
  Both together on the same box, as decoration, is the classic
  machine-applied look.
- If shadows: define two or three **elevation levels with meaning**
  (resting, raised, overlay) from one shadow family — same light
  direction, same colour, increasing softness. Random per-component
  shadows read as unowned.
- Shadows are tinted by their environment: a pure-black shadow on a warm
  surface looks dirty; tint the shadow toward the surface hue.
- On dark themes, depth comes from lighter surfaces, not shadows
  (`colour.md`).

## Radius discipline

- One small radius scale (e.g. 4/8/12/16), applied **proportionally to
  element size**: small controls take small radii, cards top out around
  12–16px. 24px+ on a card is over-rounding.
- **Nested radii**: inner radius = outer radius − padding, or the corners
  visibly fight.
- Full-pill rounding belongs to pills, tags and buttons — not to
  containers.

## Layers

Keep a semantic z-index scale (dropdown → sticky → backdrop → modal →
toast → tooltip). An arbitrary `z-index: 9999` means the system has
already failed; fix the scale, not the number.

## The space self-check

1. Squint (or blur the screenshot): do primary, secondary and groups
   still read? If it goes uniformly flat, hierarchy is carried by nothing
   but boxes.
2. Are any two gaps identical where the relationships are not?
3. Count container levels anywhere on the page: more than one boxed
   level deep means nesting has crept in.
4. Is there a box that would survive as pure whitespace + alignment?
   Remove it.
5. Do border *and* decorative shadow coexist on any surface?
