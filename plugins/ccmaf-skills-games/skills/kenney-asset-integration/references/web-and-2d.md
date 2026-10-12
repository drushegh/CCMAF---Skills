# Kenney Assets on the Web (three.js) and in 2D (Phaser)

## three.js

Engine rules (dispose, colour management, loaders) are owned by
`threejs-development`. Kenney-specific points:

- **Relative texture URIs resolve against the GLB's URL.**
  `GLTFLoader` fetches `Textures/colormap.png` relative to where the
  `.glb` was loaded from. Serve the kit folder as static files (for
  example under a bundler's `public/` directory) with the atlas beside
  it. Importing the `.glb` through the bundler as a hashed URL
  (`import url from './x.glb?url'`) moves the GLB but not the atlas,
  so it loads untextured (verify against your bundler's asset rules).
  Check the network panel for a 404 on `colormap.png`.
- **Filtering and colour space come from the file.** `GLTFLoader`
  applies the glTF sampler (nearest for Kenney atlases) and marks
  base-colour textures as sRGB. Don't override them with linear
  filtering or mipmaps "to smooth it out", because the swatches bleed.
- **Share the atlas across a kit.** Each `GLTFLoader.load` call
  creates its own texture and material. For many pieces from one kit,
  load the atlas once with `TextureLoader` and assign it to a single
  shared material after load (set `colorSpace = SRGBColorSpace`,
  `magFilter = NearestFilter`, `flipY = false` to match glTF UVs).
  Dispose the per-file duplicates. Repeated tiles → `InstancedMesh`
  per piece type.
- **Facing:** `Object3D.lookAt` turns an object's +Z towards the
  target, which matches glTF's +Z front. Cameras and lights look down
  −Z instead.
- **Scale:** measure with
  `new THREE.Box3().setFromObject(model).getSize(v)` after the model
  is added and its matrices updated. Set a per-model scale. Kits vary.
- **Coplanar tiles:** give overlay layers a small y offset or
  `polygonOffset: true, polygonOffsetFactor: -1` on the overlay
  material (`modular-tiles-and-autotiling.md`).

## 2D packs in Phaser

Engine rules belong to `phaser-development`. Kenney 2D packs come in
three shapes, and each needs a different loader call:

| Pack contents | Loader |
|---------------|--------|
| Individual PNGs per sprite | `this.load.image(key, url)` |
| Uniform grid sheet (`*_sheet.png`, tilesheets) | `this.load.spritesheet(key, url, { frameWidth, frameHeight, margin, spacing })` |
| Packed sheet + `.xml` (Starling `TextureAtlas`/`SubTexture`) | `this.load.atlasXML(key, png, xml)`; frames by name |

- **Margin and spacing matter.** Many tilesheets put 1–2 px of spacing
  between tiles to stop bleed. Read the pack's sample `.tmx` or measure
  the sheet, then pass the same numbers to `spritesheet()` and to
  `map.addTilesetImage(name, key, tileW, tileH, margin, spacing)`.
  Wrong spacing gives a slow drift: tile 1 looks right, tile 40 is
  half a tile off.
- **Pixel-art packs:** set `pixelArt: true` in the game config
  (nearest filtering, no antialiasing). For mixed art, set filtering
  per texture instead.
- **Fonts:** the bundled `.ttf` fonts are CC0 too. Load them via CSS
  `@font-face` and wait for them to be ready before creating `Text`,
  or the first frame renders a fallback font.
- **Audio packs:** `.ogg` files. Provide an `.mp3` or `.m4a` alongside
  for browsers that lack Ogg support (verify your target browsers), and
  start audio only after a user gesture.

## Other engines (pointers)

- **Unity**: import the `.glb` with a glTF importer package, or use
  the FBX folder. Unity's forward is +Z, so glTF fronts match.
  Materials need the colormap assigned per kit.
- **Unreal**: native glTF/FBX import. Forward is +X, so expect a 90°
  yaw. Set a nearest texture filter on the atlas.
  (`unity-development`, `unreal-engine-development`.)
