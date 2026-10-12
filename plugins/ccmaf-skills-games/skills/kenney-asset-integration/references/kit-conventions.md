# Kit Conventions

Kenney kits are consistent within a generation, and different across
generations. Everything below was observed in real projects in 2026.
Treat it as a strong prior, and confirm it on the copy you downloaded
(pack contents change between versions).

## Download layout (modern 3D kits)

```
kenney_<kit-name>_<version>.zip
  Models/
    GLB format/            <- take these
      <piece>.glb
      Textures/colormap.png
    FBX format/ …           (redundant)
    OBJ format/ …           (redundant, + .mtl)
  Previews/ …               (PNG thumbnails, useful for picking pieces)
  License.txt               (read it, keep it with your provenance notes)
```

- **Zip names carry version suffixes** (`_20`, `_1.0`, `_2.1`). A
  manifest or doc that writes `kenney_<kit>.zip` may not match the
  disk. List first: `unzip -Z1 kenney_<kit>_*.zip | head -50`.
- **Folder naming in your project:** `assets/<kit-name>/` with no
  `kenney_` prefix and no version, so an upgrade doesn't rename every
  path.

## The shared colormap atlas

Most modern kits UV-map every mesh onto swatches of one small palette
image, `colormap.png`, so a whole kit is effectively one material.
Consequences:

- One texture import and one material per kit: cheap and batch-
  friendly.
- The GLB references the atlas **externally**:
  `"images":[{"uri":"Textures/colormap.png"}]`. It is not embedded
  bytes. (Observed: the GLBs were written by a Unity glTF exporter.)
- The sampler asks for **nearest** filtering (`magFilter: 9728`).
  Keep it. Linear filtering or mipmaps blend neighbouring swatches.
- Some kits also ship palette variants (`variation-a.png` …) in a
  separate `Textures/` folder. These are optional recolours.

**Exceptions seen:**

| Kit family | Texturing |
|------------|-----------|
| Most modern kits (city, prototype, market, furniture, pets, vehicles) | Shared `colormap.png` |
| `blocky-characters` | **Per-character skins** `texture-a.png` … one per model. Copy the matching skin for every character you take |
| Legacy `3d-road-tiles` | No texture at all: baked vertex colours; `.gltf` with embedded buffer only |

## Inspecting a GLB without an engine

A GLB is a 12-byte header followed by a JSON chunk. To read the
texture URIs, node names and animation names:

```python
# glb_info.py: print the JSON chunk summary of a .glb (read-only)
import json, struct, sys
with open(sys.argv[1], "rb") as f:
    magic, version, length = struct.unpack("<4sII", f.read(12))
    chunk_len, chunk_type = struct.unpack("<I4s", f.read(8))
    doc = json.loads(f.read(chunk_len))
print("images:", [i.get("uri", "<embedded>") for i in doc.get("images", [])])
print("samplers:", doc.get("samplers"))
print("animations:", [a.get("name") for a in doc.get("animations", [])])
print("skins:", len(doc.get("skins", [])), "nodes:", len(doc.get("nodes", [])))
print("generator:", doc.get("asset", {}).get("generator"))
```

Use this for **texture paths, animation clip names and skinning**. Do
**not** use accessor min/max for sizes. They ignore the node-transform
chain (scale and rotation on parent nodes), and a hand-rolled parser
gets composed transforms wrong. Measure size in-engine
(`godot-import.md`).

## Scale and origin

| Kind | Typical raw size | Origin |
|------|------------------|--------|
| Building/prop/road tiles (modern) | about 1 unit across | Centred in X/Z, base at y = 0 |
| Suburban-style buildings | about 1.1–1.3 wide, not uniform | Centred, base at y = 0 |
| Legacy `3d-road-tiles` | **3 × 3 units** | **Corner** origin |
| Characters and animals | **about 0.8 to 1.7 tall, varying by kit** | Feet at y = 0 (usually) |

Measured in one project (world AABB height): a platformer hero about
1.10, a blocky character about 0.84, a cube-pet cat about **1.71**,
next to a 1.14-high house. Choose per-model scales from measurements.
Glance at Previews to sanity-check proportions, but never set scale
from them.

Import at scale 1.0 (the kits are authored in metres) and scale per
instance or per wrapper scene. Don't rescale on import per kit.

## Facing and axes

- glTF convention: **+Y up, front faces +Z**. Kenney characters follow
  it. In Godot (forward = −Z) they face "backwards" until handled; in
  three.js, `Object3D.lookAt` points an object's +Z at the target, so
  they face the right way.
- Vehicles and props vary. In one project the hero faced +Z while a
  car drove along −Z. **Check each model**, and let each entity report
  its own forward rather than hard-coding one convention in the camera.
- Straight road pieces in at least one city road kit run along local
  **X**, not Z (`modular-tiles-and-autotiling.md`).

## Animation

| Kit | Rig | Clips seen |
|-----|-----|------------|
| `blocky-characters` | Skinned | `static, idle, walk, sprint, sit, drive, die` |
| `mini-characters` | Shared colormap | idle/walk family (list them with `glb_info.py`) |
| `cube-pets` | **Not skinned** (node animation) | `static, idle, walk, run, eat, dance, gesture-positive, gesture-negative` |

Skinned rigs bind in a **T-pose**. With no clip playing, a character
is a T-shaped scarecrow. Play `idle` on spawn (fall back to the first
non-`RESET` clip). Clip names are usually already `idle`/`walk`, so
retargeting is rarely needed. Confirm in-engine before planning that
work.

## Naming

Modern kits use kebab-case semantic names (`building-type-a`,
`road-bend`, `wall-window`, `animal-dog`, `character-a`), one file per
entity. Legacy packs use numbered names (`roadTile_001`). A MeshLibrary
or registry built from the file names stays readable, so keep them.

## Choosing kits

- Prefer kits from the **same generation** (shared colormap, 1-unit
  tiles, base-at-zero origin). They interlock on one grid.
- For NPCs, prefer **shared-colormap** character kits. They bind
  cleanly on import, unlike per-skin kits.
- Use a greybox kit (`prototype-kit`) to block out levels before art.
  It shares the conventions, so the art pass is a swap.
- Treat legacy or odd-scale packs as separate layers (their own grid),
  or skip them.
