# Engines — choose one and name it in OUTPUT

If the brief doesn't name an engine, the model picks one for you — another
default. Name it in OUTPUT with its numbers, e.g. "Remotion composition,
1920×1080, 30 fps, 450 frames".

| Engine | Best for | Notes |
|---|---|---|
| **Plain HTML/CSS/SVG/Canvas** | One 2D idea under ~10 s: type, shapes, UI mock motion | Zero install; freezable via WAAPI/`renderAt`; render with `render.mjs` |
| **GSAP** | Timeline-heavy 2D, text splitting, SVG morph/draw, scroll-linked UI | Free incl. SplitText, MorphSVG, DrawSVG, ScrollTrigger (licence bars building a competing no-code animation builder). Freeze with `timeline.pause().seek(t)` inside `renderAt` |
| **Three.js** | Anything 3D: product shots, scenes, shaders, SDF/raymarch pieces | Drive time from the frame, never the clock; pin the version via import map; FOV 35–50° default; render on the GPU. Engine detail → `threejs-development` |
| **Remotion** | Series, templates, data-driven or long-form video (minutes) as React components | Frame-exact (`useCurrentFrame`); has official Agent Skills for Claude Code (`npx remotion skills add`); licence: free for individuals and companies ≤ 3 staff, otherwise a company licence. Engine detail → `remotion-development` |
| **HyperFrames** (HeyGen) | HTML/CSS + GSAP timelines rendered to MP4 by a CLI | Open-sourced Apr 2026 (Apache 2.0); Node 22+ and ffmpeg; Claude Code plugin available. Newer — verify current API |
| **Motion** (ex-Framer Motion) | Motion inside a live React product | MIT; no video renderer. Use the shared tokens; prefer springs for interruptible UI |

Rule of thumb:
- one idea < 10 s → plain HTML
- a series / template / data → Remotion
- you think in web pages and GSAP → HyperFrames
- 3D → Three.js
- motion lives in a product, not a video → Motion or GSAP

Scale reference points from the source: a 6–8 s loop is ~400-word brief and
2–4 review rounds; a 3-minute code-only film was ~7,400 lines of
React/TypeScript in Remotion. The same method scales across that range.

Mixing sources: 3D worlds can combine Blender-exported glTF assets,
generated textures and three.js — asset authoring → `blender-development`.

## Three.js / shader craft notes (from the source's builds)

- **Version traps are real:** in three.js r160 `TextGeometry` reads `height`
  (not `depth`) for extrusion. Pin the version and state such details in the
  brief.
- **Liquid-to-type morphs:** model blob, droplets and glyphs as one signed
  distance field and raymarch it; blend with smooth-min (larger radius while
  merged, smaller as droplets part). Bake glyph outlines into an SDF texture;
  crossfade to the real extruded mesh for the hold.
- Morphing sphere → letter by plain `mix` passes through ugly flat "coins".
  Better: per-glyph SDF channels, reveal each letter inside a sphere growing
  from its droplet (smooth-max), shrink the droplet into it.
- Bevels can fuse adjacent letters — space glyphs from **measured outlines**,
  not advance widths.
- Mesh and raymarched surfaces must share shading (e.g. shade the mesh with
  the SDF gradient) or the crossfade pops.
- Reverse/melt sequences need their own ordering pass: regrow the drops
  *before* retracting letters, or things vanish before their source exists.
- Sub-pixel camera jitter (¼ px, seeded by frame) plus subframe averaging
  gives clean anti-aliasing and motion blur.
- Studio look: dark-to-mid studio with a bright cyc behind the subject;
  explicit key/fill/rim (colour temperatures in K or hex); highlight strips
  in the reflection environment only; contact shadows; bloom only on true
  emissives; light grain (~1.5–2%, seeded per frame), ~10% vignette,
  dithered backdrop gradients to stop banding.
- Light "click-on" reads better with a 2–3 frame flicker and a light panel
  that faces camera.
- Keep props out of title/label zones on every frame; check it in the audit.

## Freezing each engine at time t

```js
// CSS / WAAPI: handled by the renderer (pauses document.getAnimations()).
// GSAP:
window.renderAt = (t) => { tl.pause(); tl.seek(t, false); };
// Three.js:
window.renderAt = (t) => { update(t); renderer.render(scene, camera); };
// Remotion: use its own renderer (npx remotion render) — frame-driven already.
// Lottie (if used): anim.goToAndStop(t * 1000, false);
```
