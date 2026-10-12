# Fixes — symptom → cause → fix

The same failures recur on every project. Fix, then add the rule to the
render contract or ban list.

| Symptom | Likely cause | Fix |
|---|---|---|
| Flicker / jitter between frames | Clock time, timers, CSS transitions, unseeded random | Every value a pure function of `t`; seeded RNG; remove timers and transitions |
| Wrong or fallback font in some frames | Font not loaded at capture | `font-display: block`; await `document.fonts.ready` (and `__ready`) before frame 0 |
| Hiccup at loop seam | Frame N rendered; non-integer cycles; unsettled spring | Render 0…N−1; phase = frame/N with whole cycles; settle or cycle by design |
| Audio drifts off the beat | Accumulated rounded beat lengths; GIF delay rounding | Compute each beat as `round(n·60/BPM·fps)`; fix GIF delays (40/50 ms pattern) |
| Jank / dropped frames (live UI) | Animating layout properties | Animate only `transform` and `opacity` |
| Banding in GIF | Gradients through a 256-colour palette | Flat colour, or dithered single palette |
| Blurry or shimmering text | Sub-pixel resting positions; small type | Snap resting text to whole pixels; render at 2× and downscale |
| Text moves before it can be read | No hold budget | Hold ≥ 0.3 s/word + 0.5 s; no motion on text while reading |
| Everything moves at once | No hierarchy | One hero; others +150 ms at 60% travel; dim the rest |
| Looks generic / "AI" | Adjective brief; default styles | Name the defaults used, ban each, re-render |
| Feels robotic | Linear easing; strict sequencing | Ease every move; overlap next at 30–50% of previous |
| Lands soft / no weight | Missing anticipation and squash | Add crouch frames, stretch on takeoff, squash on landing, spring settle |
| Dead stop at end | Hard cut-off | Hold with 2% push; settle on ζ≈0.8 spring |
| Character off-model in 3D | No invariants | Add an INVARIANTS line with exact proportions/colours |
| 3D looks washed out | Too much fill/ambient; flat grade | Reduce fill so unlit sides fall off; tone-map; check accent hex on lit faces |
| Chrome reads grey | Nothing bright/dark to reflect | Add dark and bright bands/strips to the reflection environment |
| Moving highlight floods a face | Highlight light affects diffuse | Keep the strip in reflections/specular only |
| Props cross titles/labels | No safe zones | Define a keep-out region; check every frame in the audit |
| Sound feels early | Hit peak before picture | Shift so peaks land ~1 frame after the visual event |
| Hits late by ms | Phase-0 sines, waveshaper, look-ahead | Cosine-phase onsets, no oversampled shaping on hits, compensate latency |
| Mix vanishes on phone | Energy concentrated in sub-bass | Raise bass octave, knock ~190 Hz on kick, brighter pad; check phone band |
| Click at loop seam (audio) | DC offset; AAC padding; gain start | Subtract loop mean; seamless WAV master; tiny raised-cosine fades for single loops; ramp gains from 0 |

## Escalation when a fix doesn't hold

1. Render the frames either side of the problem (k−1, k+1) side by side.
2. List every visible difference.
3. Find the single responsible line; change only that line.
4. Re-render both frames; repeat.
5. Still failing → audit against the render contract (hidden clock, random,
   transition, font fallback, async asset not awaited).
