# Input and responsiveness

Responsiveness dominates feel. Most of it is latency reduction plus a set of
small **forgiveness** mechanics that make controls feel fair — invisible when
present, glaring when absent ("the game ignored me").

## Latency

The chain from button to pixel: input poll → game logic → physics step →
animation → render → display. Cut the avoidable delay:

- Read input and apply intent **the same frame**; don't wait for an animation to
  finish before the character responds.
- Avoid unnecessary buffering/queues in the input path; mind fixed-timestep vs
  render-frame ordering (apply input in the step that runs before the render).
- Keep frame pacing stable; a hitch reads as unresponsiveness.

## Forgiveness mechanics (the ones players never see)

**Coyote time** — let the player still jump for a short window *after* leaving a
ledge (≈5–8 frames, i.e. ~80–130 ms at 60 fps; express it in seconds so it's
frame-rate independent). Without it, frame-perfect ledge jumps feel
broken.

```text
COYOTE_TIME = 0.1            # seconds, not frames — frame-rate independent
each step(dt):
    if grounded: coyote_timer = COYOTE_TIME     # refill only while on the ground
    else:        coyote_timer -= dt
    can_jump = grounded or coyote_timer > 0
do_jump():
    velocity.y = JUMP_VELOCITY
    coyote_timer = 0          # consume the window — else a second press
                              # mid-air within it is a free double jump
```

Refilling while grounded (rather than on a "left the ground" event) means
walking off a ledge grants the window but jumping off it doesn't, because
`do_jump` zeroes it.

**Jump buffering** — if the player presses jump slightly *before* landing,
remember it and jump on touchdown (≈0.1 s; track it in seconds, like coyote
time). Without it, early presses are
eaten and the game feels unresponsive.

```text
JUMP_BUFFER = 0.1            # seconds
on_jump_pressed: buffer_timer = JUMP_BUFFER
each step(dt):
    buffer_timer -= dt
    if buffer_timer > 0 and can_jump:
        do_jump(); buffer_timer = 0          # consume the buffered press
```

**Variable jump height** — hold for a higher jump, tap for a hop: cut upward
velocity when the button is released during ascent. Gives analogue control from
a digital button.

```text
on_jump_release: if velocity.y < 0 (rising): velocity.y *= 0.4
```

**Corner correction / edge nudging** — when the player clips the corner of a
platform on the way up, nudge them around it instead of stopping them dead.
Makes tight gaps feel fair.

**Sticky/forgiving collision** — small snap to ledges, slightly generous
hitboxes for the player (and often *smaller* for incoming damage) — fairness
tuned in the player's favour.

## Tuning windows

The exact frame windows are feel choices, tuned by playtest, not universal
constants. Typical starting points: coyote ~0.1 s, buffer ~0.1 s (≈6 frames at
60 fps — store seconds, not frame counts), but a
fast precision platformer and a floaty exploration game want different values —
expose them and tune (`tuning-and-verification.md`).

## Analogue and accessibility

- Support analogue input (stick magnitude → speed) where the platform has it,
  and dead-zones to avoid drift.
- Make controls **remappable** and don't require frame-perfect or
  rapid-mash inputs as the only path (→ `accessibility-development`).

## Diagnosing "unresponsive"

If a control feels laggy or unfair, check, in order: (1) input applied this
frame or gated by animation? (2) latency in the input/physics ordering? (3)
missing coyote/buffer forgiveness? (4) frame pacing hitches? Usually it's (1) or
(3), not the polish. Implementation per engine → the engine skill.
