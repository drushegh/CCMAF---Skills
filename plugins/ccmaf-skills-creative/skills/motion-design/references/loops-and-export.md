# Loops and Export

## Seamless loops

- **Render frames 0…N−1, never N.** Frame N is frame 0; including it shows
  the first frame twice — the hiccup people see at the seam.
- Drive every looping value from **phase = frame / N** with **whole-number
  cycles**: a square rotating exactly 90° per loop, a wave completing exactly
  2 cycles, a colour cycle of exactly 1.
- Organic drift: sample noise **along a circle** (e.g. 2D/4D noise at
  `cos(2πp), sin(2πp)`) so it returns to its start. Periodic noise, never
  free-running noise.
- Springs and eases must have **settled** (or be mid-cycle by design) at the
  seam; check frame N−1 → 0 explicitly.
- Motion blur and sound must wrap across the seam too (the renderer wraps
  subframe times; audio needs a seamless master).
- **Frame 0 must be a finished composition** — it's the poster and what shows
  while a GIF loads.
- Test: `contact-sheet.sh loop` plays three loops back to back.

## Canvas sizes

Pick before frame one; changing later means re-directing every shot.

| Aspect | Size |
|---|---|
| 16:9 | 1920 × 1080 |
| 1:1 | 1080 × 1080 |
| 4:5 | 1080 × 1350 |
| 9:16 | 1080 × 1920 |

## Encoding

MP4 for posts (H.264 High, yuv420p, faststart so it plays immediately):

```bash
ffmpeg -framerate 24 -i out/frames/%04d.png -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -crf 18 -movflags +faststart out/anim.mp4
```

GIF for inline loops/articles — **one palette for the whole clip** so colours
don't flicker between frames:

```bash
ffmpeg -framerate 24 -i out/frames/%04d.png -vf \
 "scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
 -loop 0 out/anim.gif
```

GIFs band on gradients: design GIF-bound pieces with flat colour, or accept
dithering.

### The GIF timing trap

GIF frame delays are stored in **hundredths of a second**. At 24 fps a frame
is 41.67 ms, which can't be stored; rounding every frame to 40 ms makes the
loop run ~4% fast and drift off any beat grid. Fix: alternate delays —
five frames at 40 ms then one at 50 ms (average 41.67 ms), keeping a 6 s loop
at exactly 6.00 s. Alternatively use an fps that divides 100 cleanly
(20, 25, 50). Check the delays of the produced GIF (e.g. with `gifsicle -I`)
rather than trusting the encoder.

## X (Twitter) media limits

Per X's media documentation as reported in Sep 2026 — re-verify before
relying on them:

| | GIF | Video |
|---|---|---|
| Size / length | ≤ 15 MB | ≤ 140 s without Premium |
| Dimensions | ≤ 1280 × 1080 | 1920 × 1080 for 16:9; aspect 1:3 to 3:1 |
| Frames / rate | ≤ 350 frames | ≤ 60 fps |
| Format | single palette, loop forever | H.264 High, yuv420p, AAC |
| Sensible default | 1200 px wide, 24 fps | CRF 18, faststart |

At 24 fps the 350-frame cap means a GIF tops out ≈ 14.5 s; a 4–6 s loop is
96–144 frames.

## Publishing receipts

If posting the work, publish the brief and every follow-up (picture and
sound) alongside it. Honest prompt counts are more persuasive than "one
prompt", and they make the piece reproducible.
