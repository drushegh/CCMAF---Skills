# Purposeful Motion

Motion conveys state, gives feedback and clarifies hierarchy. Motion that
exists only to decorate is the visual equivalent of filler prose — and
"extra animation everywhere" is itself an AI tell. The saturated default
is a fade-and-rise reveal on every scrolled section plus a bounce on every
button; the decision is one orchestrated moment and quiet, fast feedback
everywhere else.

## Where motion earns its place

- **Feedback** — an action acknowledged (press, toggle, submit).
- **State transitions** — menus, tooltips, accordions appearing without a
  jarring cut.
- **Relationships** — showing where something came from or went.
- **One signature moment** — a page-load sequence, one scroll reveal, one
  hover surprise. One lands; five compete; the same reveal on every
  section is wallpaper.

If an animation fits none of these, cut it.

## Timing

- **100–150ms** — instant feedback (buttons, toggles).
- **200–300ms** — state transitions (menus, tooltips).
- **300–500ms** — layout changes (accordions, modals).
- **500–800ms** — entrances and hero reveals only.
- Exits at roughly **75% of the entrance** duration; leaving should be
  quicker than arriving.
- Feedback beyond ~500ms reads as lag, not polish.
- **Stagger cap**: total sequence ≤ ~500ms (10 items × 50ms is the
  ceiling, not the pattern).

## Easing

Decelerating ease-out curves make UI feel confident — fast start, settled
end. Never bounce or elastic on ordinary UI (see the tells catalogue);
reserve `linear` for continuous motion (spinners, progress, marquees);
`ease-in-out` for elements moving within the screen.

```css
:root {
  --ease-out-smooth:  cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-snappy:  cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-strong:  cubic-bezier(0.16, 1, 0.3, 1);
}
```

## What to animate

- Prefer **`transform` and `opacity`** — composited, cheap, smooth. Avoid
  animating layout properties (`width`, `height`, `top`, margins) unless
  the layout change *is* the point; deep performance work →
  `web-performance-development`.
- **Reveals enhance an already-visible default** — never gate content's
  visibility on an animation firing; a failed observer must not mean an
  empty page.
- **Never animate images on hover** — no scale-on-hover, no
  `group-hover` zoom through a parent. Animate the container's border,
  background or shadow instead.
- Bind expensive effects (blur, backdrop-filter) to small areas and few
  moments.

## The floor

Reduced motion is mandatory, not optional polish
(`accessibility-development` owns the standard):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Prefer per-animation alternatives (crossfade instead of movement) over the
blanket kill where the motion carries meaning.

## The motion self-check

1. Name each animation's job (feedback / state / relationship /
   signature). No name → cut.
2. Count signature moments: one.
3. Any curve overshooting (bounce/elastic)? Replace with ease-out.
4. Does anything essential stay invisible until an animation runs?
5. Does the design still work with reduced motion on?

Game-world motion (control response, physics, juice) → `game-feel`; this
file is UI motion only.
