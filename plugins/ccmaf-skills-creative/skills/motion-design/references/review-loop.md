# The Review Loop — render, look, fix

The first render is a draft. Finishing is a loop:

1. render stills at named frames
2. look (describe each still as a viewer would)
3. write notes **with frame numbers**
4. fix the smallest thing that addresses each note
5. re-render only what changed

**Two to four rounds is normal.** Treat "one prompt" claims sceptically,
including your own: count follow-ups and report them.

## Views that make notes sharp

| View | How | Reveals |
|---|---|---|
| Named stills | `render.mjs --frames 0,24,48,72,96` or `?t=` hook | Composition, legibility, does each shot match the shot list |
| Contact sheet | every 12th frame tiled 4×3 (`contact-sheet.sh sheet`) | The whole clip as a storyboard; hierarchy; frames where two things move at once |
| Onion skin | 12–24 consecutive frames stacked at low opacity (`contact-sheet.sh onion`) | Spacing: even spacing = robotic/linear; spacing tightening near keys = easing works |
| Speed graph | Plot hero x/y/scale per frame as a PNG chart | Straight lines = linear; sharp corners = dead starts/stops; overshoot visible |
| Frame pair | Render frames k−1 and k+1 side by side (`contact-sheet.sh sideby`) | Pops, flicker, a fix that didn't hold |
| Loop check | Play 3 loops back to back (`contact-sheet.sh loop`) | Seam hiccups, audio clicks |
| Production overlays | Frame counter, playhead, frame-pinned labels while iterating | Makes notes cite exact frames; labels pinned to principle frames expose late moves |

The model reads contact sheets and dense charts well and is good at spotting
what changed between two images — use that.

## Numeric audit (for precise pieces)

For anything with exact timing (landings, label hits, beat sync), add a test
harness that reads the **live scene state** across every frame and asserts
the brief's numbers: e.g. "feet touch pad 3 on frame 165 (±0)", "label 2
lights on frame 140", "playhead x equals diamond x on landing frames", "blink
on frame 432". In the source's mascot piece, 71 checks across 480 frames
failed 6 on the first build — all invisible in casual viewing, all fixed
before final render. Audits catch drift that stills miss.

## Follow-up prompts that work

Use one or two per round. Pasting all of them turns a fix into a rewrite.

- *Stills check:* render frames 0/24/48/72/96; describe each in one sentence
  as a viewer would; compare against the shot list; fix mismatches only.
- *Hierarchy:* contact sheet of every 12th frame; mark frames where two things
  move at once; restore a single hero per moment.
- *Spacing:* onion-skin a 24-frame range at ~25% opacity; adjust easing until
  spacing tightens toward the keys.
- *Curves:* chart the hero's position and scale per frame; find linear or
  dead-stop segments; fix them using the tokens file.
- *Senior review:* ten notes ordered by impact, each with a frame number and
  the exact code change; apply the top five.
- *De-clutter:* remove ~30% of the motion; keep only moves that guide the eye.
- *Ending:* add a ~1.5 s hold with a 2% push and a ζ 0.8 settle.

## Notes that work vs notes that don't

| Weak | Strong |
|---|---|
| "The chrome looks bad" | "Frame 120: chrome reads flat grey — letter faces only reflect the dark floor; add a horizon strip in the reflection environment" |
| "Timing feels off" | "Impact at frame 84 peaks 2 frames late; move the scale peak to 82" |
| "Too busy" | "Frames 48–60: title and cards both travel; delay cards 4 frames and cut their travel to 60%" |
| "The glint is weird" | "Glint at frame 79 floods the whole lid face (+178 → 864 px brightness); keep the strip in the specular lookup only" |

Pixel measurements beat adjectives in review exactly as they do in briefs.

## When a fix doesn't hold

Render the frames either side of the problem, place them side by side, list
every visible difference, find the single line responsible, change only that
line, re-render both. If it still fails, check the contract: a hidden clock,
unseeded random, CSS transition or font fallback is the usual cause.

## Iteration discipline

- First run: keep the brief's numbers and change only the words/subject.
- Later runs: **change one number at a time** so its effect is attributable.
- Strip debug overlays (counter, playhead, labels) before the final render.
- Watch the final at its real size (phone-feed width) at least three loops.
