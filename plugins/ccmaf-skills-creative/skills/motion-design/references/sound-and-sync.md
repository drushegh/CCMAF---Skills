# Sound and Sync — scoring motion in code

Feeds autoplay muted. **The picture must work in silence first.** Sound is
a separate pass, written against frame numbers, after picture lock.

The model can't hear. It scores by the numbers and verifies by measurement:
decoding the rendered audio and locating each hit relative to its frame.

## The sound brief

A separate prompt with the same discipline as the picture brief:

```
TIME:    same frames/fps/BPM/key as the picture; loop yes/no
SOURCE:  synthesise everything in code (Web Audio API / OfflineAudioContext);
         no samples, no downloads
SYNC:    each hit lands 1 frame after its visual event
BED:     tempo, bars, chord roots per bar; which voices (kick, shaker, bass,
         pad) enter on which frames; where the bed rests or ducks
EVENTS:  frame-by-frame list — "lid snap 120; seat click 285; shimmer
         240–267; landings 105/165/225/285 pitched by squash amount"
MIX:     hits N dB over the bed (loudness-weighted); nothing harsh above
         ~12 kHz; mono-compatible
MASTER:  48 kHz stereo WAV, ≈ −14 LUFS integrated, true peak ≤ −1 dBTP,
         no click at the loop seam; mux into the MP4
VERIFY:  decode the muxed MP4 and report each hit's offset from its frame
```

Map sound design to motion semantics: crouch → creak/inhale riser; takeoff →
upward swish; landing → squash thump pitched by squash scale; light on →
click; reveal → ting; merge → gloop. Label/UI pings can climb a scale.

## Sync rules

- **Sound arrives ~1 frame after the picture, never before.** Light reaches
  us before sound; early audio feels wrong much sooner than slightly late audio.
- "Lands" means the **waveform's main peak**, not the note-on. Attacks,
  waveshapers, filters and compressors all delay the peak.
- Put the bed on the same beat grid as the picture (`beatFrame()`).

## Hard-won technical rules

These come from real fix rounds where measured hits were 10–20 ms late or
the mix collapsed on phone speakers:

1. **Phase-align onsets.** Start tonal hits in **cosine phase** with a short
   (~0.5 ms) attack so the first crest lands exactly on the target sample.
   Sines starting at phase 0 put the peak a quarter-cycle late.
2. **Avoid oversampled waveshapers and look-ahead dynamics on hits** — they
   add latency. A compressor/limiter with look-ahead shifts everything by
   its window; account for it or bypass it on transients.
3. **Watch harmonic stacking.** When all partials crest on the same sample
   (and coincide with a kick crest), the limiter clamps that hit by several
   dB. Offset harmonic phases or lower the coincident element so the limiter
   stays under ~1.5 dB of reduction.
4. **Measure the phone band, not just the full mix.** A first render had ~80%
   of its energy below 60 Hz — loud on headphones, near-silent on a phone.
   Move bass up an octave, open its filter, shorten the kick and give it a
   ~190 Hz knock, raise the pad. Check loudness in roughly 200 Hz–6 kHz as
   well as full-band.
5. **Set hit levels relative to the bed** (e.g. 6–9 dB over it, LUFS-weighted)
   and re-measure after every change; one hit too hot or too buried is the
   commonest note.
6. **Duck the bed** under the biggest moment rather than pushing the hit.
7. **Remove DC** — subtract each channel's loop mean so the seam doesn't thump.
8. **Avoid start-up clicks** — gain nodes must start at 0 and ramp; render
   twice and keep the second pass if the engine has warm-up artefacts.
9. **Leave true-peak headroom for the codec.** Master the WAV around
   −2.2 dBTP so the decoded AAC stays under −1 dBTP.

## Codec padding and loops

AAC adds encoder priming/padding, so the MP4's audio runs a few tens of ms
longer than the video. Consequences:

- A looping player cuts audio hard at the video end, plays a gap, then
  restarts — an audible click/stutter.
- **Keep a seamless master WAV** for multi-loop posts.
- For a single-loop MP4 (e.g. embedded inline), apply a very short raised-
  cosine fade (a few ms) to the first and last samples only.
- Always verify sync and seams on the **muxed, decoded** file, not the WAV.

## Mixing and muxing with ffmpeg

```bash
# music + sfx → mixed, normalised, muxed under the picture
ffmpeg -i out/anim.mp4 -i music.wav -i sfx.wav -filter_complex \
  "[1:a][2:a]amix=inputs=2:duration=first,loudnorm=I=-14:TP=-1:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/final.mp4

# loudness report
ffmpeg -i out/final.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12
```

`loudnorm` single-pass is approximate; for precise targets run the two-pass
form (measure, then apply with `measured_*` values).

## Verifying sync

1. Decode the final MP4's audio (ffmpeg to WAV, or `decodeAudioData` in a
   browser).
2. For each scripted event, find the hit's largest peak in a window around the
   expected sample: `expected = (frame + 1) / fps × sampleRate`.
3. Report offsets in ms; target 0 to ~1.5 ms from the planned position.

Expect sound to take its own rounds: in the source, 5 sound follow-ups for
one loop, 12 for another, 0 when the brief was tight from the start.
