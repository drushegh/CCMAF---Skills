---
name: motion-design
description: >-
  Directing, building and verifying code-driven motion: rendered motion
  graphics (launch films, title reveals, product shots, explainer loops,
  social GIF/MP4) and the motion layer of live UI. Turns "cool, premium,
  modern" into numbers: the directed brief (goal, frames, palette, easings,
  springs, shot list, ban list, QA), easing/spring/duration/stagger/beat-grid
  values, animation principles as frames, the deterministic render contract
  (every frame a pure function of t, window.renderAt), the render, stills,
  contact sheet and frame-numbered notes loop, code-synthesised sound and A/V
  sync, seamless loops and export. Use for any animation, motion graphics,
  launch or promo video, animated loop or GIF, easing or spring tuning,
  "make it pop / feel premium / look less AI", frame-by-frame motion review,
  or scoring a video in code, across HTML/CSS, GSAP, Three.js, Remotion,
  HyperFrames or Motion. The engine skill owns the API; this owns direction,
  numbers and verification.
---

# Motion Design

Motion in this stack is **a program that draws frames**, never generated
pixels. The model writes HTML/JS (or a Remotion/Three.js project); a headless
browser freezes it at each frame and ffmpeg encodes the result. Three things
follow, and the whole skill leans on them:

- **Every frame is reproducible** — render frame 84 twice, get the same image.
- **Edits are cheap and surgical** — change one number, re-render.
- **The agent can inspect its own output** — stills, contact sheets, speed
  graphs and decoded audio are all things a model can read and measure.

The central claim, and the reason this skill exists: **adjectives are where
the default look lives.** "Cool", "premium", "modern", "smooth" hand every
decision back to the model, and the model's own decisions *are* the generic
AI look. Each adjective replaced by a number is a decision taken back.
A directed brief is not long for its own sake; every line removes one choice
the model would otherwise make for you.

> Honest limit: motion is judged in motion. Stills, contact sheets and
> numeric audits catch timing, hierarchy and sync errors, but whether a piece
> *feels* right still needs a human watching the full render, at the size it
> will be seen (usually a phone feed). Don't declare a piece "done" from code
> or a single still.

## Non-negotiables

1. **Write the GOAL first, in one sentence** — what the viewer should feel or
   do. If it can't be said, no curve will rescue the piece.
2. **Fix TIME next** — canvas, seconds × fps = frame count, loop yes/no. Every
   other number hangs off the frame count. Pick the canvas before frame one;
   changing aspect ratio later means re-directing every shot.
3. **Numbers, not adjectives** — easings as `cubic-bezier`, springs as damping
   ratio, durations in frames, colours in hex, type as family/weight/size/
   tracking. Translate every feeling-note before acting on it
   (`references/brief-anatomy.md`).
4. **Name the defaults you refuse.** A generic "avoid an AI look" just swaps
   one default for another. Maintain an explicit BANNED list and extend it
   after every first render with whatever the model reached for anyway.
5. **One hero per shot.** Everything else waits, dims, or holds still;
   secondary motion is ranked below it (`references/motion-numbers.md`).
6. **Honour the render contract** — self-contained, pinned dependencies,
   every value a pure function of `t`, `window.renderAt(t)`, no clocks/timers/
   unseeded randomness, loops render 0…N−1 (`references/render-pipeline.md`).
7. **Tokens, never inline numbers** — one motion-tokens file
   (`scripts/motion-tokens.js`) imported everywhere.
8. **Verify by frames, not feelings** — stills at named frames and a contact
   sheet *before* the full render; notes always cite frame numbers
   (`references/review-loop.md`).
9. **Picture first, sound second** — the piece must work muted (feeds autoplay
   silent). When scored, each sound lands ~1 frame *after* its visual event,
   never before.
10. **Accessibility floor holds in every frame** — text ≥ 4.5:1 contrast even
    over moving backgrounds, ≤ 3 flashes per second, readable holds; live UI
    respects `prefers-reduced-motion`.
11. **Receipts over "one prompt"** — count follow-ups honestly. 2–4 review
    rounds is normal; polish rounds are where quality comes from.

## Workflow

1. **Brief** — fill the template in `references/brief-anatomy.md`: GOAL,
   OUTPUT, TIME, LOOK, MOTION, SHOTS, BANNED, QA (+ MODEL/CAMERA for 3D,
   + INVARIANTS for any character or brand that must stay recognisable).
2. **Choose the engine** and put it in OUTPUT with its numbers
   (`references/engines.md`).
3. **Build to the render contract**, importing the motion tokens. Add a frame
   counter / playhead / frame labels while iterating; strip them for final.
4. **Stills pass** — render the named QA frames, describe each as a viewer
   would, compare with the shot list. Fix before rendering the whole clip.
5. **Contact sheet / onion skin / speed graph** — check hierarchy, spacing and
   dead starts. One or two notes per round, each with a frame number.
6. **Numeric audit (for anything precise)** — read the live scene state on
   every frame and assert the brief's numbers (landing frames, label frames,
   positions). Fails become fixes.
7. **Full render**, then watch it at target size, three loops back to back.
8. **Sound** (optional) — one separate prompt against frame numbers; verify
   sync by decoding the *muxed* file (`references/sound-and-sync.md`).
9. **Export** for the destination (`references/loops-and-export.md`).
10. **Feed the contract** — when a fix works, add it to the render contract or
    ban list so the failure never recurs.

## Decision tables

| Note received | Translate to |
|---|---|
| "Make it pop" | Scale 1.0 → 1.08 → 1.0 over ~6 frames, peak on the beat |
| "Make it feel premium" | ease-out-quint entrances, springs at ζ≈0.8, no overshoot on text |
| "It drags" | Shorten holds by one beat (12 frames at 120 BPM / 24 fps), keep cuts on grid |
| "It feels busy" | One hero at a time; others start 150 ms later at 60% of travel; or cut 30% of the motion |
| "Ending is abrupt" | Add a ~1.5 s hold with a 2% push, settle on a spring at ζ≈0.8 |
| "It looks like AI" | List the defaults it used by name, ban each, re-render |
| "It feels robotic" | Overlap the sequence (start next at 30–50% of previous), replace linear moves |

| Piece | Engine |
|---|---|
| One idea, 2D, < 10 s | Plain HTML/CSS (+ optional GSAP) |
| Series, template, data-driven, long-form | Remotion |
| Web-page thinking, GSAP timelines → MP4 | HyperFrames |
| Anything 3D | Three.js |
| Motion inside a live product, not a video | Motion (React) or GSAP |

## High-frequency pitfalls

- **Adjective briefs** — "cool premium modern" produces purple gradients,
  glow, particles, a spinning turntable and a dark background, every time.
- **Linear easing on moves** — the fastest way to make a render look like a
  render. Linear is only for rotation, progress bars and loop phase.
- **Everything moving at once / everything fading in together** — no
  hierarchy, no eye path.
- **Fade-and-slide-up on every element** — the house style of generated UI.
- **Wall-clock time** — `Date.now`, `setTimeout`, `requestAnimationFrame`
  accumulators, CSS transitions: frame 84 differs per run; renders flicker.
- **Unseeded randomness** — shapes jitter frame to frame.
- **Rendering frame N of a loop** — frame N *is* frame 0; the seam hiccups.
- **Accumulating rounded beat lengths** — drifts off the music within bars.
- **Text that moves while being read**, or holds too short to read.
- **Bouncing opacity or colour** — position and size may overshoot; opacity
  and colour never do.
- **Pasting every review prompt at once** — turns a fix into a rewrite.
- **Trusting the WAV** — codec padding and limiter look-ahead shift sync and
  break loops in the *muxed* MP4; check the final file.
- **Claiming "one prompt"** when it was one prompt plus hours of agent work.

## Reference index

Load on demand:

- `references/brief-anatomy.md` — the directed brief template, ban lists, hierarchy, invariants, translating feelings to numbers, a worked vague-vs-directed comparison
- `references/motion-numbers.md` — easing table, springs and damping ratio, durations, stagger, beat grid, holds, camera/parallax, animation principles as frames
- `references/render-pipeline.md` — the render contract, determinism, frame-freeze hook, headless renderer, motion blur via subframes, lab setup (macOS/Windows)
- `references/review-loop.md` — stills, contact sheets, onion skins, speed graphs, numeric audits, frame-diffing, the follow-up prompts that work
- `references/sound-and-sync.md` — Web Audio synthesis, sync rules, loudness targets, phase-aligned onsets, codec padding at seams
- `references/loops-and-export.md` — seamless loops, MP4/GIF encoding, GIF timing trap, canvas sizes, X media limits
- `references/engines.md` — Plain HTML, GSAP, Three.js, Remotion, HyperFrames, Motion: when and how to name each
- `references/fixes.md` — symptom → fix table, and the escalation when a fix doesn't hold

Scripts (copy into the project; adapt freely):

- `scripts/render.mjs` — Playwright frame renderer (frames 0…N−1, optional subframe motion blur)
- `scripts/motion-tokens.js` — easings, durations, stagger, closed-form spring, damping-ratio converter, beat grid, seeded RNG
- `scripts/freeze-hook.html` — `?t=` URL hook that freezes any frame for inspection
- `scripts/contact-sheet.sh` — contact sheet, loop check, MP4 and GIF exports
- `scripts/smoke-test.html` — minimal piece (canvas `renderAt` + CSS keyframes + tokens) to prove a new lab works end to end

## Boundaries

- **Engine API and implementation** → `threejs-development` (scenes,
  materials, shaders, GPU perf), `remotion-development` (compositions,
  `useCurrentFrame`, rendering), `react-development` / `frontend-development`
  (live UI components, CSS). This skill owns direction, numbers and verification.
- **Interactive, input-driven motion** (jumps, hits, camera follow, juice) →
  `game-feel`. Authored timelines and UI transitions live here.
- **Capturing and critiquing renders generally** → `ui-verification`; this
  skill adds the motion-specific views (contact sheet, onion skin, speed graph).
- **Reduced motion, photosensitivity, contrast** in depth →
  `accessibility-development`.
- **3D asset authoring/export** → `blender-development`.

## Provenance

Distilled (rewritten, not copied) from Florence (@flxrnc), "Opus 5.5 Motion
Lab: Make Claude Animate Like a Studio", X Article, 30 Sep 2026
(https://x.com/flxrnc/status/2105311836190978392), cross-checked against
standard sources it cites (easings.net, WCAG 2.2, Material 3 motion,
Nielsen Norman Group). Version- and licence-specific claims (library
versions, licence terms, X limits) were true per that source in Sep 2026 —
re-verify before relying on them.
