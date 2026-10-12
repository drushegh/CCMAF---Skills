# Importing Kenney Kits into Godot 4

Engine-general Godot rules (typing, scenes, headless runs) live in
`godot-development`. This file covers what is specific to Kenney
assets.

## Placement

```
res://assets/city-roads/
  road-straight.glb
  road-bend.glb
  Textures/colormap.png        <- relative to the GLBs, per the GLB's URI
res://assets/pets/
  animal-cat.glb
  Textures/colormap.png        <- each kit has its OWN atlas; never share across kits
```

Then warm the import cache and read the log:

```bash
godot --headless --path . --import 2>&1 | tee import.log
grep -iE "colormap|texture|Can't open|ERROR" import.log
```

If the error names a different path (`res://assets/pets/colormap.png`
rather than `…/Textures/colormap.png`), the GLB's URI differs from its
siblings'. Put the atlas where the error says, or in both places.

**Copy the atlas before the first import.** If a GLB was imported
without it, Godot can bake a broken material that a plain re-import
doesn't rebind (seen with per-character skins). Delete that file's
entries under `.godot/imported/` and re-import.

## Import settings

- **Scene (`.glb`)**: root scale 1.0; keep animation import on for
  characters and pets; no physics generation for props you'll place on
  a GridMap (collision is added in the MeshLibrary step).
- **Atlas (`colormap.png`)**: the glTF sampler's nearest filter is
  carried onto the imported material's `texture_filter`. Check that the
  material shows Nearest. Turn off mipmaps on the texture import if you
  see swatch bleeding at distance.
- **Shared material**: every mesh in a kit references the same atlas,
  so expect one material. To recolour a kit, duplicate `colormap.png`
  once and repoint the material via an override. Don't edit meshes.

## Measure, don't assume

Kits vary from about 0.8 to 1.7 units tall raw. Measure the composed
world AABB in-engine:

```gdscript
static func world_aabb(root: Node3D) -> AABB:
	var out := AABB()
	var first := true
	for n: Node in root.find_children("*", "VisualInstance3D", true, false):
		var vi := n as VisualInstance3D
		var box: AABB = vi.global_transform * vi.get_aabb()
		out = box if first else out.merge(box)
		first = false
	return out
```

Print `world_aabb(model).size.y` for each candidate next to a
reference tile, then pick per-model scales. Expose the scale on the
wrapper scene:

```gdscript
@export var model_scale: float = 1.0
@export var model_yaw_deg: float = 180.0   # glTF front is +Z; Godot forward is -Z

func _ready() -> void:
	$Model.scale = Vector3.ONE * model_scale
	$Model.rotation.y = deg_to_rad(model_yaw_deg)
```

If a squash/stretch or landing effect animates `$Model.scale`, it
must decay towards `Vector3.ONE * model_scale`, not `Vector3.ONE`.
Otherwise it erases the size (`game-feel`).

## Facing

`Vector3.MODEL_FRONT` is `(0, 0, 1)`, the front of imported assets.
For aiming and mounts on an unrotated model, use
`global_basis * Vector3.MODEL_FRONT` (that is, `+basis.z`), not
`-basis.z`. `look_at(target, Vector3.UP, true)` (`use_model_front`)
points the model's front at a target. If you rotate the model child
180° instead (`model_yaw_deg`), the parent's −Z becomes forward again.
Pick one convention per entity and let each entity report
`camera_forward()`. Verify by playing.

## Characters

- Prefer shared-colormap character kits. Per-skin kits need the
  matching `texture-x.png` present *before* first import.
- Play an idle clip on spawn, or a skinned rig shows its T-pose:

```gdscript
func _play_idle(model: Node) -> void:
	var ap := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap == null:
		return
	var clip := &"idle"
	if not ap.has_animation(clip):
		for n: StringName in ap.get_animation_list():
			if n != &"RESET":
				clip = n
				break
	ap.play(clip)
```

- Non-skinned pets animate nodes. They drive through the same imported
  `AnimationPlayer`.

## GridMap + MeshLibrary

1. Make a temporary scene whose root's **direct children** are
   `MeshInstance3D`s, one per tile, named as the tile should appear in
   the palette (`road-straight`). Conversion collects direct children
   (and their immediate children). Deeper nesting is skipped, so
   flatten imported scenes first.
2. For collision, give each `MeshInstance3D` a child `StaticBody3D` +
   `CollisionShape3D` (box, or trimesh for static world pieces).
3. Convert: **Scene ▸ Export As… ▸ MeshLibrary** in the editor
   (wording varies by version; verify), or headlessly through
   godot-mcp's `export_mesh_library` (`godot-mcp-workflow`).
4. `GridMap`: assign the library; **cell size = tile size**
   (`(1, 1, 1)` for modern kits); centre X/Z on for centred origins,
   off for corner origins. One library per kit and tile size.
5. Odd-footprint buildings can overhang a cell. Place them as
   standalone instances beside the grid instead of forcing them in.
6. Navmesh: put the GridMap under a `NavigationRegion3D` and bake, then
   check with Debug ▸ Visible Navigation. For procedural or runtime
   navmesh recipes, see `godot-development`
   (`references/physics-2d-3d.md`).

## Acceptance checklist

- [ ] Only the named GLBs extracted; each kit folder has its own atlas.
- [ ] `--import` log has no texture or missing-file errors.
- [ ] Materials show Nearest filtering; one material per kit.
- [ ] World AABB printed per model; scale and yaw knobs set.
- [ ] Characters play idle; nothing T-posed or white.
- [ ] Grid cell size matches the tile size; render looked at.
