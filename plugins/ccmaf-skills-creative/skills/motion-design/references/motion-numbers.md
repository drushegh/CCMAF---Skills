# Motion Numbers — the vocabulary to put in briefs

Motion designers talk in curves and frames. Give the model curves and frames.
Everything here is implemented in `scripts/motion-tokens.js`.

## Easing

Cubic-bézier values per the standard Easings reference (easings.net):

| Token | cubic-bezier | Use for |
|---|---|---|
| ease-out-expo | `0.16, 1, 0.3, 1` | Text and logo reveals |
| ease-out-quint | `0.22, 1, 0.36, 1` | Premium entrances |
| ease-in-out-quart | `0.76, 0, 0.24, 1` | Moves across screen, camera pushes |
| ease-in-expo | `0.7, 0, 0.84, 0` | Fast exits |
| ease-out-back | `0.34, 1.56, 0.64, 1` | Playful pop with overshoot |

Rules:

- **Enter with ease-out, exit with ease-in**, traverse with ease-in-out.
- **Exits are 40–50% shorter than entrances** (Material 3 pairs ~400 ms in
  with ~200 ms out).
- **Linear only** for rotation, progress bars and loop phase. Linear on a
  positional move is the single most "rendered-looking" mistake.
- **Camera gets the softest curves** (ease-in-out-quart); objects get the
  snappier ones.

## Springs and the damping ratio

Every library names its spring parameters differently (stiffness/damping/
mass, tension/friction, bounce/duration). One dimensionless number
translates between all of them — the **damping ratio**:

```
ζ = damping / (2 · √(stiffness · mass))
```

| ζ | Feel |
|---|---|
| ≥ 1.0 | No bounce (critically/over-damped) |
| 0.7–0.85 | Premium — one subtle settle |
| 0.4–0.6 | Playful |
| < 0.3 | Cartoon wobble |

Reference points: Remotion's default spring (mass 1, damping 10,
stiffness 100) is ζ = 0.5; react-spring's default (tension 170, friction 26)
is ζ ≈ 1.0.

**Bounce budget (Material 3 rule):** position and size may overshoot;
opacity and colour never do.

For rendered video, use a **closed-form spring** (progress as a direct
function of `t`) rather than a simulated one — frame 84 must be computable
without stepping through frames 0–83. Specify springs in briefs as
"ζ 0.7, 2 Hz", which maps directly onto `spring(t, zeta, freqHz)` in the
tokens file.

## Durations

| Thing | Duration |
|---|---|
| UI feedback (press, toggle) | 100–200 ms (≈100 ms reads as instant — NN/g) |
| UI moves / transitions | 200–500 ms |
| Hero reveals | 600–900 ms |
| Exits | 40–50% of the matching entrance |

At 24 fps one frame ≈ 41.7 ms: 400 ms ≈ 10 frames, 750 ms ≈ 18 frames.
**Say durations in frames for video**; ms for live UI.

## Stagger

| Unit | Gap |
|---|---|
| Letters | ~1 frame apart (≈30–40 ms) |
| Words | 60–120 ms |
| List items / cards | 40–80 ms |

**Overlap rule:** start the next element when the previous is 30–50% done.
Fully sequential looks robotic; all-at-once looks cheap.

## Beat grid

```
framesPerBeat = fps × 60 / BPM
```

120 BPM @ 24 fps = 12 frames; 120 BPM @ 60 fps = 30 frames.
128 BPM @ 30 fps = 14.0625 — **non-integer**. Compute each beat's frame as
`round(n × 60 / BPM × fps)` from time; never keep adding a rounded 14
(after 32 beats you are 2 frames off the music).

- Cut on the beat; change layout on the bar (4 beats).
- Hits land on beats; ambient motion ignores the grid.

## Holds

- On-screen text holds **≥ 0.3 s per word + 0.5 s** (two-word title ≥ 1.1 s).
- During a hold, a slow ~2% push (scale or dolly) keeps the frame alive
  without disturbing reading.
- End on a hold that settles on a spring (ζ≈0.8) rather than a hard stop.

## Camera

- FOV 35–50° is a safe default for product/3D; narrower (18–30°) for a
  telephoto "studio product" look with less distortion.
- Never fully park during holds: a slow creep or small orbit.
- One push-in per shot, eased (expo out for a punch, quart in-out for drift).
- Parallax starting speeds: foreground 1.0, mid 0.5, background 0.2.

## Animation principles, written as numbers

From Thomas & Johnston's twelve (*The Illusion of Life*, 1981). Five do most
of the work in a short loop; write each as frames and scale factors:

| Principle | What it does | Brief phrasing (example values) |
|---|---|---|
| Anticipation | Wind-up before the move | "11-frame crouch to scale 1.2 × 0.75" |
| Squash & stretch | Shows weight and speed | "stretch 0.85 × 1.28 at takeoff; squash 1.25 × 0.7 on landing" |
| Overlapping action | Parts start later than the body | "arms lag 4 frames, legs 6" |
| Follow-through | Parts keep moving after the body stops | "arms settle at 2.2 Hz, ζ 0.22" |
| Arcs | Natural paths | "flip along a dotted arc 3.5 units high" |
| Slow in / slow out | Accelerate and settle | "spring back at ζ 0.55" |
| Timing | Frame count sets weight | "25 frames of air per hop" |

Squash/stretch should roughly preserve volume (x·y ≈ 1 in 2D).

Also: **staging** is the one-hero rule. **Exaggeration** matters more at
phone size — push key poses 10–30% further than feels right, because the
feed shrinks everything.

**Make principles testable:** pin on-screen labels or markers to the exact
frame a principle should happen; a move running late then shows as a label
lighting before its move.

## Accessibility thresholds (WCAG 2.2)

- Text contrast ≥ 4.5:1 on **every** frame, including over moving backgrounds.
- No more than **3 flashes per second**.
- Live UI: honour `prefers-reduced-motion` — swap travel for opacity
  crossfades or remove non-essential motion; never remove state feedback.

## Live UI specifics

These numbers also govern product motion, with extra rules:

- Animate only `transform` and `opacity` (no width/height/top/left) to stay
  on the compositor.
- Motion must be interruptible: a new interaction retargets from the current
  value; springs handle this better than fixed-duration tweens.
- Don't block input on decorative motion; feedback within 100 ms.
- The tokens file is the same — import it in the component layer.
