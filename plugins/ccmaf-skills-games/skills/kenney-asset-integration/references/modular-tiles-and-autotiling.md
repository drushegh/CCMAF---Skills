# Modular Tiles and Autotiling

## Grid fundamentals

- **Cell size = tile size.** Modern kits are 1-unit tiles with centred
  X/Z origins and base at y = 0, so cell `(1, 1, 1)` with centring on.
  A legacy 3 × 3, corner-origin pack needs its own grid (cell 3,
  centring off). **Never mix tile sizes or origin conventions on one
  grid.**
- One grid or library per kit and tile size. Odd-footprint pieces
  (houses wider than a cell) go in as free instances aligned to lot
  centres.
- Greybox first with a prototype kit that shares the conventions. The
  art pass then swaps pieces without moving the layout.

## Know each piece's local axis

Rotation tables depend on which way the *unrotated* piece runs. Don't
guess. In one city road kit, `road-straight` lays its asphalt and lane
markings along **local X**. A layout that assumed "unrotated = runs
N–S along Z" put every straight 90° off, with lane lines crossing the
road like zebra stripes.

Procedure for every directional piece (straight, bend, T, end):

1. Place it unrotated at the origin with axis gizmos visible.
2. Note the open sides (which neighbours it connects to) at yaw 0.
3. Write those down as the canonical mask for yaw 0. Derive the other
   yaws by rotating the mask.

Swap ambiguous pieces for symmetric ones (a plain straight instead of
a dead-end cap) until you have measured them.

## Autotiling with a neighbour bitmask

Encode the four neighbours as a bitmask, for example N = 1, E = 2,
S = 4, W = 8, and map each mask to `{piece, yaw}`:

| Shape | Masks | Piece |
|-------|-------|-------|
| Straight | 5 (N+S), 10 (E+W) | straight at two yaws |
| Bend | 3, 6, 12, 9 | one bend model at four yaws |
| T-junction | 7, 11, 13, 14 | one T model at four yaws |
| Crossroad | 15 | symmetric, yaw 0 |
| Dead end | 1, 2, 4, 8 | end cap at four yaws |
| Isolated | 0 | your choice |

### The consistency rule (debugging yaw tables blind)

Every bend reuses **the same model** at 90° steps (likewise every T).
A correct table is therefore *internally consistent*: going round the
four bend masks clockwise, the yaw changes by a uniform ±90° each
step. That gives a strong diagnostic when you can't see the viewport
and a play-tester reports back:

- **All four of a type wrong** → the table is consistent but offset.
  Apply one uniform offset (often 90° or 180°).
- **Some wrong, not all (typically two)** → the table is
  *inconsistent*. The two consistent tables that differ in exactly two
  of four entries differ on the **90°/270° diagonal**, so swap the two
  masks currently at 90° and 270°. A blanket ±180° would keep it
  inconsistent and make the other two wrong.
- Chasing individual tiles, or trying uniform offsets on an
  inconsistent table, diverges. Reason from consistency first, then
  fix.

Observed working table (one project, Godot, yaw = rotation about +Y,
the road kit whose straight runs along X): straight E–W 0 / N–S 90;
bend NE(3) = 180, SE(6) = 90, SW(12) = 0, NW(9) = 270; T missing-N(14) =
0, missing-E(13) = 270, missing-S(11) = 180, missing-W(7) = 90;
crossroad 0. **Re-derive it for your kit and engine.** Yaw sign and
axis conventions differ (three.js and Godot both rotate
counter-clockwise about +Y seen from above, but your mask and piece
orientation may not match).

Expose the table as data (a Resource, JSON or a const dictionary) so a
play-test correction is a one-line edit.

## Coplanar surfaces and z-fighting

Flat pads, road surfaces and floor tiles at y = 0 over a ground plane
at y = 0 fight in the depth buffer. With thin pads the result can be a
**fully invisible** piece, not a shimmer, while every automated check
passes. Fixes, in order of preference:

1. Don't render the redundant surface: no ground plane under fully
   tiled areas.
2. Lift the overlay layer by a tiny offset (0.001–0.01 units, scaled to
   the camera's near/far range).
3. Use a depth or polygon offset on the overlay material (three.js
   `polygonOffset`; in Godot, render priority on transparent materials
   or a small vertex offset in a shader; verify per renderer).

Any two coplanar layers need an explicit order. Find them by rendering
and sampling pixels at known positions (`ui-verification`).

## Navigation over tiles

GridMap and tile geometry are valid navmesh sources. After painting:

- bake, then show navigation debug and confirm coverage over walkable
  tiles;
- watch the agent radius against tile width. Narrow kit paths can bake
  to nothing at a large radius;
- for kinematic NPCs following the path, flatten the direction to the
  ground plane and own gravity (`godot-development`).
