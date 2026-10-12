---
name: kenney-asset-integration
description: >-
  Integrating Kenney's free CC0 game-asset packs (kenney.nl) into a game:
  the 3D kits' GLB layout and the shared external colormap atlas,
  per-character skins, wildly varying raw scales, glTF +Z facing versus
  engine forward, modular tiles on a grid (GridMap/MeshLibrary,
  autotiled roads), coplanar z-fighting, and 2D sprite/tile sheets.
  Covers Godot 4 first, plus three.js and Phaser. Licence and
  provenance are recorded too. Use whenever importing Kenney models
  (.glb/.gltf/.obj/.fbx) or sprite sheets, models come in untextured,
  white, magenta, T-posed, giant or facing backwards, "could not load
  texture colormap.png" appears, building a level from Kenney modular
  tiles, autotiling Kenney roads, or choosing which Kenney kit to use.
  Trigger on "Kenney", "colormap", "city kit", "blocky characters",
  "cube pets", "prototype kit", "low-poly CC0 assets", even when only
  the pack name is mentioned.
---

# Kenney Asset Integration

Kenney (kenney.nl) publishes hundreds of game-asset packs: 3D kits,
2D sprites and tiles, UI, icons, fonts and audio. **They are released
under CC0 1.0 (public domain).** Commercial use is allowed and
attribution is optional; crediting "Kenney" is welcome
(`references/licensing-and-provenance.md`). They are the default
placeholder-to-shipping art for prototypes, which is why the same
integration mistakes recur from project to project.

This skill owns the *asset* conventions and the traps specific to
these packs. The engine side (importers, materials, scenes) belongs to
the engine skill named in Boundaries.

## The five facts that cause most bugs

1. **The texture is external, not embedded.** Modern 3D kits ship GLBs
   whose single material references `Textures/colormap.png` by
   **relative URI**. Copy a `.glb` alone and it imports untextured
   (white or magenta), with one error and one warning per mesh in the
   import log. One project's design doc asserted, and tagged as
   "verified", that the atlas was embedded. It wasn't. **Check the
   GLB's `images[].uri` yourself** (`references/kit-conventions.md`).
2. **The expected path varies.** Depending on how a kit was extracted
   or re-exported, a GLB may want `colormap.png` next to it or in
   `Textures/` under it. The import error names the exact path, so put
   the atlas where the error says (or in both places).
3. **Raw scales differ wildly between kits.** Tiles are about 1 unit,
   but character and animal kits range from about 0.8 to 1.7 units tall
   raw. A pet can be taller than a two-storey house. **Measure world
   AABBs in-engine and set a per-model scale.** Never assume one import
   scale fits every kit, and never trust a hand-rolled GLB parser for
   sizes (it misses composed node transforms).
4. **glTF assets face +Z; Godot's "forward" is −Z.** The glTF spec says
   the front of an asset faces +Z, so a Kenney character dropped into
   Godot looks backwards relative to `-basis.z` (shots leave from its
   back, the camera ends up in front). Use `Vector3.MODEL_FRONT` /
   `look_at(…, use_model_front = true)` or a 180° yaw on the model
   child. Verify by moving or shooting and watching, not by reading
   the file.
5. **Coplanar pieces z-fight until something disappears.** Flat floor
   pads at y = 0 over a ground plane at y = 0 don't shimmer, they can
   vanish entirely, with every test still green. Give coplanar layers
   an explicit order (small offset or depth bias). Only rendering and
   looking catches this.

## Workflow

1. **Pick kits deliberately** (`references/kit-conventions.md`): prefer
   kits that share the colormap convention. Avoid mixing legacy packs
   with different tile sizes or origins on one grid.
2. **Extract only what you need.** Copy the named `.glb` files and the
   kit's `Textures/` folder into `assets/<kit-name>/` (drop the
   `kenney_` prefix and the version suffix from the folder name).
   Importing a whole kit bloats the engine's import cache with hundreds
   of unused meshes. Keep the raw zips out of git; record what you
   took (`references/licensing-and-provenance.md`).
3. **Import and read the log.** Zero "could not load texture" or
   missing-file lines is the first acceptance gate. In Godot, run
   `godot --headless --path <project> --import` and grep the output.
4. **Check the material**: one shared colormap material per kit,
   nearest filtering, no mipmaps bleeding swatches together.
5. **Measure and normalise**: AABB height per model → a `model_scale`
   knob; facing → a yaw knob or `MODEL_FRONT`-aware code.
6. **Assemble**: grid tiles via GridMap/MeshLibrary or instancing
   (`references/modular-tiles-and-autotiling.md`); characters with an
   idle clip playing.
7. **Look at it.** Render, screenshot or play-test. Colour, facing,
   scale and z-fighting are visual facts (`ui-verification`).

## Non-negotiables

- Always take `.glb` when a kit offers it. `.obj` loses the scene graph
  and animation and needs its `.mtl`; `.fbx` needs a converter. Use
  `.gltf` only where a legacy pack ships nothing else.
- Copy the atlas *before* the first import. Some engines bake a broken
  material on first import that a later re-import does not fix (seen
  with Godot and per-character skins). If that happens, delete the
  imported cache entry and re-import.
- One atlas → one material per kit. Recolour by duplicating the
  colormap once and repointing, never per mesh.
- Expose scale and facing as tunables (`model_scale`, `model_yaw_deg`).
  An agent can't see the viewport, so the user's play-test fix should
  be a number, not a code change.
- Record measured facts (scale, facing, axis) in the project's own
  notes with how you measured them. A confident sentence in a design
  doc is not a measurement.

## High-frequency pitfalls

- Untextured meshes: atlas missing, or at the wrong relative path.
- **Pure-white T-posed characters**: a per-character-skin kit imported
  without its skin PNG (white material baked) and no animation playing
  (rigs bind in T-pose). Prefer shared-colormap character kits, and
  play the `idle` clip on spawn.
- Everything oversized next to the buildings: raw character scale
  assumed to match the 1-unit tiles.
- Roads laid "N–S" with lane markings running across them: a straight
  road piece runs along its **local X** in at least one city road kit.
  Measure, then encode the rotation.
- "Some autotiles are wrong, not all": an internally inconsistent yaw
  table. Fix the 90°/270° pair, not a blanket offset
  (`references/modular-tiles-and-autotiling.md`).
- A zip that won't unzip by the documented name: downloaded zip names
  carry version suffixes (`kenney_<kit>_2.0.zip`). List the real
  filename first.
- Linear filtering or mipmaps on the colormap: the palette swatches
  bleed and the flat look turns muddy.

## How to verify

| Claim | Evidence that counts |
|-------|----------------------|
| "Textured correctly" | Import log free of texture errors **and** a render or screenshot |
| "Right size" | Printed world AABB per model, next to the reference tile |
| "Facing forward" | Moving or shooting in-game, observed |
| "Tiles align" | Grid render with debug grid or navmesh overlay visible |
| "Licence fine" | Kit name, version, source URL and the bundled licence file recorded |

## References

| File | Load when |
|------|-----------|
| `references/kit-conventions.md` | Choosing kits; folder layout, formats, the colormap, skins, scales, facing, naming, legacy packs; inspecting a GLB |
| `references/godot-import.md` | Importing into Godot 4: placement, import settings, measuring AABBs, characters and idle clips, GridMap/MeshLibrary |
| `references/modular-tiles-and-autotiling.md` | Building levels from tiles: cell sizes, origins, road orientation, autotile yaw tables, z-fighting |
| `references/web-and-2d.md` | three.js (GLTFLoader) and Phaser/2D sheets: paths, filtering, atlases, tile spacing |
| `references/licensing-and-provenance.md` | CC0 terms, attribution, provenance records, mixed-licence projects |

## Boundaries with sibling skills

- Engine APIs, scenes, physics and headless runs → `godot-development`;
  the MCP-driven run loop → `godot-mcp-workflow`.
- Browser 3D → `threejs-development`; Phaser games →
  `phaser-development`; other engines → `unity-development`,
  `unreal-engine-development`.
- Editing or re-exporting meshes (re-rigging, merging, re-UVing) →
  `blender-development`.
- How movement, camera and squash/stretch *feel* → `game-feel`.
- Rendering and looking at the result → `ui-verification`.
