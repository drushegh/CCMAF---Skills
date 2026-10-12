# Phaser 3 → 4, Project Setup and Testing

The authoritative migration guide ships in the package:
`node_modules/phaser/changelog/v4/4.0/MIGRATION-GUIDE.md`, plus the
agent skill `node_modules/phaser/skills/v3-to-v4-migration/SKILL.md`.
Read the installed copy. This page is the triage summary (checked
against 4.2.1, Oct 2026).

## Usually unaffected

Sprites, images, text, tilemaps, Arcade and Matter physics, input,
audio, tweens, timers and standard camera properties (`scrollX/Y`,
`zoom`, `rotation`). Phaser's own advice: upgrade, run, and fix what
errors. Most standard-API games need hours, not weeks.

## Breaking changes that bite

| v3 | v4 |
|----|----|
| Custom WebGL `Pipeline`s, `setPipeline('Light2D')` | Render nodes; `setLighting(true)` for lighting; lights have an explicit `z` |
| `preFX` / `postFX`, `BitmapMask` | **Filters**: `obj.filters.internal` / `.external`; `filters.internal.addMask(maskObject)` |
| Bloom/Shine/Circle FX, Gradient FX | `Phaser.Actions.AddEffectBloom()`, `AddEffectShine()`, `AddMaskShape()`, `Gradient` game object |
| `colorMatrix.sepia()` | `colorMatrix.colorMatrix.sepia()` |
| `setTintFill(c)`, `tintFill` | `setTint(c).setTintMode(Phaser.TintModes.FILL)` |
| `Geom.Point` | `Phaser.Math.Vector2` (geometry helpers return Vector2) |
| `Math.TAU` = π/2 (sic), `Math.PI2` | `Math.TAU` = 2π; `Math.PI_OVER_2` for π/2 |
| `Struct.Set` / `Struct.Map` | Native `Set` / `Map` |
| `roundPixels` default `true` | Default `false`; per-object `vertexRoundMode` |
| DynamicTexture/RenderTexture draw immediately | Commands buffer: call `render()` |
| `Mesh`, `Plane`, Camera3D/Layer3D plugins | Removed |
| Compressed textures top-left origin | Re-compress with flipped Y (GL orientation) |
| Shader game object positional args | `ShaderQuadConfig` object; `#pragma` GLSL loading |
| Bundled Spine plugins | Use Esoteric Software's official plugin |

Watch the silent ones. `Math.TAU` changes value without an error,
and tint calls no longer clear fill mode. Grep for them explicitly:

```bash
grep -rnE "setTintFill|tintFill|preFX|postFX|BitmapMask|Geom\.Point|Math\.(TAU|PI2)|setPipeline|Struct\.(Set|Map)" src/
```

Canvas renderer: still present but deprecated, and without v4's
advanced rendering features. Target WebGL.

## Project setup (Vite + TypeScript)

```bash
npm create vite@latest my-game -- --template vanilla-ts
cd my-game && npm install phaser
```

- `import Phaser from 'phaser'`. Types ship in the package; no
  `@types/phaser`.
- Static assets in `public/assets/` are served as-is at
  `/assets/...`. Imported assets get hashed URLs.
- Phaser is large. Lazy-load the game module from a landing page if
  first paint matters (`web-performance-development`).
- Pin the exact version in `package.json` for a shipped game. Read the
  release notes before minor upgrades; 4.x minors have added features
  at pace.
- Phaser's official scaffolding (`npm create @phaserjs/game@latest`)
  offers framework templates (verify current options).

## Testing strategy

1. **Rules in plain TS → unit tests** (Vitest) with seeded RNG and
   pinned-hash determinism checks. This is where most bugs are, and it
   needs no canvas (`physics-and-movement.md`).
2. **Scene smoke tests in a real browser** (Playwright): load the
   dev build, wait for a `window.__game` debug handle (dev only),
   assert the active scene keys, drive input, and assert state through
   the handle. jsdom has no WebGL, so don't fight it.
3. **Restart loop**: start, play and restart a scene 10× in the
   browser test and assert object and listener counts stay flat
   (`game-objects-and-memory.md`).
4. **Screenshots** for layout and visual regressions
   (`ui-verification`). Mask animated regions, or pause the loop
   (`game.loop.sleep()`) before capture.
5. `type: Phaser.HEADLESS` exists for running the loop without
   rendering (for example server-side simulation). Prefer extracting
   rules over booting Phaser headless in unit tests.
