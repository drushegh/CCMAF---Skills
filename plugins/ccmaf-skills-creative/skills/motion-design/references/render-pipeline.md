# Render Pipeline — deterministic frames from code

The model writes a program; a headless browser freezes it at each frame
time; ffmpeg encodes. Everything depends on the program being a **pure
function of time**.

## The render contract

Append this to every motion brief (wording is yours to adapt). Each line
closes one known way a render goes wrong:

1. **One self-contained file** (or project); only the libraries the brief
   names, **pinned to a version** (e.g. via an import map from a CDN).
2. **No network requests** except fonts and those pinned libraries.
3. **Every visual value is a pure function of `t` (seconds).**
4. If JavaScript drives motion, expose **`window.renderAt(t)`** that draws
   exactly that frame, from `t` alone.
5. Animate with CSS keyframes, the Web Animations API, SVG, Canvas 2D or
   WebGL — all freezable.
6. **No `Date.now`, no started `setTimeout`/`setInterval`/
   `requestAnimationFrame` loops** driving state, **no unseeded
   `Math.random`** (use a seeded generator — `rng(seed)` in the tokens file).
   No CSS transitions (they're time-driven, not freezable).
7. If async setup is needed (fonts, textures, SDF bakes), set
   **`window.__ready = true`** when finished; the renderer waits for it.
8. **Loops render frames 0…N−1**; frame N−1 must flow into frame 0.

Why each matters:
- A clock or timer → frame 84 differs every run; renders flicker.
- Unseeded randomness → shapes jitter between frames.
- Rendering frame N of a loop → the first frame appears twice → visible
  hiccup at the seam.
- Simulated physics (stepping state per frame) → can't render frame 84 alone;
  use closed-form functions (`spring(t, ζ, Hz)`).

**The contract is the project's memory.** When a fix works, add its rule
here so the failure never recurs.

### `renderAt` skeleton (Canvas/WebGL)

```js
import { spring, seg, ease, rng } from './motion-tokens.js';
const FPS = 24, N = 144;                 // 6 s loop
const rand = rng(42);
const stars = Array.from({ length: 40 }, () => ({ x: rand(), y: rand() })); // fixed at load

window.renderAt = (t) => {
  const p = (t * FPS) % N / N;           // loop phase, whole cycles only
  const s = spring(Math.max(0, t - 1.0), 0.75, 2.2);
  draw({ p, s, logoIn: seg(t, 0.5, 1.25, ease.enter) });
};
if (!new URLSearchParams(location.search).has('t')) {
  // Live preview only: drive renderAt from the clock. The renderer never
  // relies on this path because it calls renderAt directly.
  const t0 = performance.now();
  const tick = () => { window.renderAt(((performance.now() - t0) / 1000) % (N / FPS)); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
```

The preview loop is allowed because it is a *driver* of `renderAt`, not a
source of state. Keep all state derived from `t`.

## Inspecting single frames

Paste `scripts/freeze-hook.html` before `</body>`; open `anim.html?t=2.5`
(or `?f=60&fps=24&hud=1`) to see — and screenshot — an exact frame. This is
what makes the review loop cheap.

## Rendering

`scripts/render.mjs` (Playwright):

```bash
node render.mjs anim.html 6 24 --size 1080x1080                 # 144 frames
node render.mjs anim.html 6 24 --frames 0,24,48,72,96            # stills pass
node render.mjs scene.html 8 60 --gpu --subframes 4              # 3D with motion blur
```

It loads the page, waits for fonts and `window.__ready`, then for each
frame calls `renderAt(t)` and pauses every WAAPI/CSS animation at
`t × 1000` ms, waits two animation frames for compositing, and screenshots.
Each PNG is exact regardless of machine speed.

Local files are **served over `http://127.0.0.1`** by the renderer, not
opened as `file://`: Chromium refuses ES-module imports (`import … from
'./motion-tokens.js'`) from `file://` pages, so `renderAt` silently never
registers and you get the CSS layer only. (`--file` forces `file://` if you
really need it.) Put positional arguments (file, seconds, fps) before flags.

**Motion blur:** real cameras with a 180° shutter record motion across half a
frame. Render several subframes spread across that window and average them
(`--subframes S`, then the printed `ffmpeg tmix` command). Averaging in sRGB
slightly darkens blurred edges; for high-end 3D, accumulate subframes in
linear light inside the renderer (e.g. a three.js float render target) instead.

**3D on the GPU:** headless Chromium may fall back to software GL. For
three.js showcase work run with `--gpu` (or headed) and verify WebGL renderer
string in the page; software rendering changes shading and is slow at 60 fps.

**Text crispness:** snap resting text to whole pixels; for small type render
at `--scale 2` and downscale in ffmpeg (`scale=iw/2:-1:flags=lanczos`).

## Encoding

```bash
ffmpeg -framerate 24 -i out/frames/%04d.png -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -crf 18 -movflags +faststart out/anim.mp4
```

More formats and platform limits: `loops-and-export.md`.

## Setting up the lab

Prerequisites: Node (LTS), ffmpeg, Playwright + Chromium.

macOS:
```bash
brew install node ffmpeg
mkdir motion-lab && cd motion-lab && npm init -y
npm i -D playwright && npx playwright install chromium
```

Windows 11 (PowerShell; open a **new** terminal after winget so PATH updates):
```powershell
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
mkdir motion-lab; cd motion-lab; npm init -y
npm i -D playwright; npx playwright install chromium
```
Windows PowerShell 5.1 has no `&&` (use `;`). If script execution policy
blocks `npx`, call `npx.cmd`.

Linux: distro packages for node/ffmpeg, then the same npm steps
(`npx playwright install --with-deps chromium` pulls system libraries).

Set `"type": "module"` in package.json or keep the `.mjs` extension.

### No-install path (chat app)

Generate the HTML in a chat with an artifact/preview panel, iterate with
frame-numbered notes, then screen-record. Ask for a frame counter and a
space-to-pause key while iterating (remove for the final). Screen recordings
drop frames and aren't frame-exact — fine for a sketch, not for portfolio
work; use the renderer for that.

## Agent operating rule

Once the lab exists, the agent drives it: render, open the stills, describe
what it sees **before** changing anything, then fix. Default to standard
reasoning effort; escalate only when a from-scratch piece misses twice.
