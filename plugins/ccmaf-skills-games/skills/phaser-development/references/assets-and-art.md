# Assets and Art

## Loading

- Load in `preload()` of a dedicated Preloader scene, show progress
  with `this.load.on('progress', (p: number) => …)`, then start the
  game scene. Later scenes can load more on demand
  (`this.load.start()` outside `preload` after queueing).
- Keys are **global** (texture manager and caches). Loading a second
  file under an existing key keeps the first one silently. Namespace
  keys (`ui/button`, `units/knight`).
- `this.load.setPath('assets/')` / `setBaseURL` keep URLs tidy. Serve
  assets as static files. Bundler-hashed imports work too, but then
  pass the imported URL, not a literal path.
- Check for 404s in the network panel. A missing texture renders as
  Phaser's built-in "missing" placeholder texture, not an error you'll
  see in tests.

## Sprite sheets vs atlases

| Source art | Loader | Frames by |
|------------|--------|-----------|
| Uniform grid | `load.spritesheet(key, url, { frameWidth, frameHeight, margin, spacing })` | Index |
| Packed atlas, JSON hash or array (TexturePacker and similar) | `load.atlas(key, png, json)` | Name |
| Packed atlas, Starling XML | `load.atlasXML(key, png, xml)` | Name |
| Aseprite export | `load.aseprite(key, png, json)` + `this.anims.createFromAseprite(key)` | Tags |

`margin` and `spacing` must match the sheet exactly, or frames drift
progressively. Tilemaps take the same numbers:
`map.addTilesetImage(name, key, tileW, tileH, margin, spacing)`.
For Kenney CC0 sheets and tilesets, see `kenney-asset-integration`.

Animations are global too. Create them once (Preloader or a module)
with `this.anims.create({ key, frames: this.anims.generateFrameNumbers(...), frameRate, repeat })`
and guard against re-creating them on scene restart
(`if (!this.anims.exists(key))`).

## Pixel art and scaling

- `pixelArt: true` → nearest filtering and no antialiasing. In v4,
  `roundPixels` defaults to `false` (it was `true` in v3), and
  per-object `vertexRoundMode` controls snapping. Enable camera
  `roundPixels` for crisp, axis-aligned pixel art.
- Scale Manager: `FIT` + `CENTER_BOTH` letterboxes a fixed design
  resolution. For crisp pixels, pick a small base resolution and use
  integer zoom (`zoom: 2`, or compute the largest integer that fits).
  `RESIZE` gives a full-bleed canvas but means you must lay out UI on
  `scale.on('resize')`.
- Text: bitmap fonts stay crisp at pixel scales. With `Text`, set
  `resolution` (or render at a higher font size and scale down) to
  avoid blur on high-DPI screens.

## Cleaning generated sprite backgrounds (chroma-key)

Art from image generators or old sheets often comes on a flat
background colour. **A global threshold ("make every near-black or
near-key pixel transparent") eats interior pixels of the same colour**:
eyes, outlines and dark armour vanish. Remove only the background that
is *connected to the border*:

```ts
// Flood-fill background from the image border, then feather the edge.
function keyOutBackground(img: ImageData, key: [number, number, number], tol = 40): void {
  const { width: w, height: h, data } = img;
  const dist = new Float32Array(w * h).fill(Infinity);   // Infinity = not background
  const near = (i: number) =>
    Math.abs(data[i * 4] - key[0]) + Math.abs(data[i * 4 + 1] - key[1]) +
    Math.abs(data[i * 4 + 2] - key[2]) <= tol;
  const queue: number[] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) seed(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) seed(y * w + x);
  function seed(i: number) { if (dist[i] === Infinity && near(i)) { dist[i] = 0; queue.push(i); } }
  for (let q = 0; q < queue.length; q++) {               // BFS over 4-neighbours
    const i = queue[q], x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && dist[j] === Infinity && near(j)) { dist[j] = 0; queue.push(j); }
    }
  }
  for (let i = 0; i < w * h; i++) if (dist[i] === 0) data[i * 4 + 3] = 0;
  // Optional 1-px dilation of the transparent mask to remove the halo
  // left by anti-aliased edges: clear (or half-alpha) any opaque pixel
  // that touches a transparent one AND is close to the key colour.
}
```

Use `Infinity` (not 0 or -1) as the "unvisited" sentinel so it can't
collide with a real distance. Run this offline in a build script and
commit clean PNGs. Doing it at runtime costs load time and needs
`willReadFrequently` canvases. Better still, ask for transparent
output from the source.

## Audio

- Browsers block audio until a user gesture. Phaser unlocks on the
  first input, so start music from a "Click to start" screen rather
  than in the first scene's `create`.
- Ship two formats where Ogg isn't universal:
  `this.load.audio('hit', ['sfx/hit.ogg', 'sfx/hit.mp3'])` (Phaser picks
  the first the browser can play).
- Audio sprites (one file + JSON markers) cut request counts for many
  short SFX.

## Licences

Record the source and licence of every asset (art, fonts, audio) in
one provenance table. CC0 packs need no attribution, but CC-BY ones do
(`kenney-asset-integration`, `references/licensing-and-provenance.md`).
