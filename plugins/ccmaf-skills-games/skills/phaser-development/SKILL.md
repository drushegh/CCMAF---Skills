---
name: phaser-development
description: >-
  Phaser (3.x and 4.x) HTML5 game development in JavaScript/TypeScript:
  game config and the scene lifecycle (init/preload/create/update,
  start/launch/sleep, passing data), game objects, Containers and Groups
  and what really gets destroyed, object pooling, input (topOnly hit
  testing, drag vs click), Arcade vs Matter physics, the asset loader,
  sprite sheets and atlases, pixel art and the Scale Manager, cameras,
  tweens and timers, and the Phaser 3 → 4 migration (render nodes,
  Filters replacing FX/masks, tint modes). Use whenever code imports
  `phaser`, a `Phaser.Game` config or a `Phaser.Scene` subclass appears,
  or someone wants a 2D browser game, "a Phaser scene", an HTML5 game
  with sprites/tilemaps/arcade physics, or is upgrading Phaser 3 to 4.
  Also for "scene starts without its data", "memory grows every
  restart", "clicks don't reach the object underneath", or "setTintFill
  is not a function".
---

# Phaser Development

Phaser is an MIT-licensed 2D game framework for the browser (WebGL
with a Canvas fallback). This skill holds the senior-practitioner rules
and the traps that cost real projects time. API-level detail is in the
references, and in the version-matched skills Phaser ships itself (see
below).

## Version reality (checked Oct 2026; re-check before quoting)

- **Phaser 4** is current: v4.0.0 "Caladan" shipped 10 April 2026, and
  npm `latest` was **4.2.1** at the time of checking. It has a new
  WebGL renderer ("render nodes" replace v3 pipelines), and FX and
  masks are unified into **Filters**. Most standard-API code (sprites,
  text, tilemaps, Arcade physics, input, tweens, audio) ports with
  little change.
- **Phaser 3** is the final 3.x line (3.90.0 was the last release
  seen). It is still everywhere in tutorials, answers and existing
  projects. **Check `package.json` before writing code.** v3 snippets
  that use `setTintFill`, `preFX`/`postFX`, `BitmapMask`, `Geom.Point`
  or custom pipelines break on v4 (`references/v3-to-v4-and-tooling.md`).
- **The npm package ships its own agent skills.** `phaser@4.x` includes
  `node_modules/phaser/skills/<topic>/SKILL.md` (scenes, loading-assets,
  physics-arcade, tilemaps, v3-to-v4-migration and more), matched to the
  installed version. Read the relevant one for API detail, because it
  can't drift from the code you are running. TypeScript types are
  bundled (`types/phaser.d.ts`).

## Non-negotiables

1. **State resets in `init()`, not the constructor.** A scene's
   constructor runs once; `init(data)` → `preload()` → `create(data)`
   run on every start or restart. Fields set in the constructor or
   class body survive a restart and leak stale state.
2. **Clean up on `shutdown`.** Scene-owned systems (display list,
   tweens, timers, scene events) are torn down for you. **Listeners on
   anything that outlives the scene are not**: `this.game.events`,
   `this.registry.events`, `this.scale`, `window`, `document`, sockets.
   Register them with a matching `this.events.once('shutdown', …)`
   removal, or they stack up on every restart.
3. **Know what removal destroys.** `container.remove(child)` /
   `removeAll()` and `group.remove()` / `clear()` **detach without
   destroying** by default, so removed objects stay alive and render
   nowhere: a silent leak. Pass `destroyChild = true`, or destroy the
   children yourself. Destroying a Container destroys its children
   (while `exclusive`, the default); destroying a Group does not unless
   asked (`references/game-objects-and-memory.md`).
4. **Frame-rate independence.** `update(time, delta)` gives `delta` in
   **milliseconds**. Scale manual motion by `delta / 1000`, or let
   physics bodies move things. Never assume 60 fps; high-refresh
   displays run `update` faster.
5. **Pool what you spawn often.** Bullets, particles-as-sprites,
   damage numbers: `group.get()` + `setActive/setVisible(false)`
   instead of create/destroy churn (garbage collection stutters).
6. **Load in `preload` (or a Boot/Preloader scene), use in `create`.**
   Keys are global to the game's texture and cache managers. Reusing a
   key silently keeps the first asset.
7. **v4: no raw WebGL calls.** Direct `gl` calls desynchronise the
   renderer's state tracking. Use an `Extern` game object if you must.
8. **Keep game rules out of scenes.** Put combat maths, AI decisions
   and economy in plain TS modules with seeded RNG, so they unit-test
   without a canvas. Scenes render and route input.

## Decision guides

| Question | Default | Switch when |
|----------|---------|-------------|
| Physics | **Arcade** (AABB/circle, fast) | Rotated or complex bodies, joints, stacking → **Matter** |
| Renderer | `Phaser.AUTO` (WebGL) | Canvas only for legacy or blend-mode niches (deprecated in v4) |
| Scaling | `Scale.FIT` + `CENTER_BOTH` | Pixel art at integer zoom; full-bleed UI → `RESIZE` with layout code |
| Many identical sprites | Group pool | Thousands of static sprites → blitter/GPU layer types (v4 has `SpriteGPULayer`; verify) |
| UI | Phaser Text/containers | Rich forms or accessibility needs → DOM overlay (`frontend-development`) |

## High-frequency pitfalls

- **Scene auto-start ignores your data.** The *first* scene in the game
  config's `scene: [...]` array auto-starts with empty data. If it
  needs data (a level id, a save slot), its `init(data)` runs with `{}`
  first. Put a Boot scene first that starts the real one with
  `this.scene.start(key, data)`, or register late scenes with
  `this.scene.add(key, SceneClass, false)` and start them explicitly.
- **`scene.start()` is queued**, not immediate, and it shuts down the
  calling scene. Use `launch()`/`run()` for parallel scenes (HUD over
  game). Don't read the target scene's state in the same frame.
- **Clicks don't reach the object underneath.** Only interactive
  objects are hit-tested, and with `input.topOnly` (default `true`) only
  the top-most interactive object under the pointer gets the event.
  There is no bubbling to what lies beneath. A decorative sprite made
  interactive (for a hover effect) swallows clicks meant for the marker
  under it. Make decorations non-interactive, forward the event, or set
  `this.input.setTopOnly(false)` and arbitrate yourself
  (`references/input-and-ui.md`).
- Containers have no size: call `setSize(w, h)` before
  `setInteractive()`, or input never hits.
- v3 code on v4: `setTintFill()` is gone (use
  `setTint(c).setTintMode(Phaser.TintModes.FILL)`), `Math.TAU` changed
  value (now 2π), and `roundPixels` defaults to `false`.
- Chroma-keying generated sprite art by a luminance threshold eats
  dark interior pixels (eyes, outlines). Flood-fill the background from
  the border instead (`references/assets-and-art.md`).
- Sleeping scenes still receive registry or global events. Guard
  handlers, or remove them on `sleep`.

## How to verify

- **Logic**: unit tests on the plain-TS rules modules (Vitest or
  similar) with a fixed seed. No Phaser needed.
- **Scenes**: run the game in a real browser (Playwright). Expose a
  debug handle (`window.__game` in dev builds only), drive input, and
  assert on game state, not pixels alone. Check memory or object counts
  across 10 scene restarts to catch leaks.
- **Visuals**: screenshot and look (`ui-verification`). A green test
  suite can't tell you the sprite is behind the background.
- **Feel**: jump, hit and camera tuning needs a human play-test
  (`game-feel`).

## References

| File | Load when |
|------|-----------|
| `references/scenes-and-lifecycle.md` | Game config, scene lifecycle, start/launch/sleep, data passing, cleanup, scene ordering |
| `references/game-objects-and-memory.md` | Containers, Groups, pooling, destroy semantics, leak hunting |
| `references/input-and-ui.md` | Pointer/keyboard/gamepad, topOnly, drag vs click, hit areas, HUD scenes, DOM overlays |
| `references/physics-and-movement.md` | Arcade vs Matter, bodies, colliders/overlaps, delta time, determinism |
| `references/assets-and-art.md` | Loader, sprite sheets and atlases, pixel art, Scale Manager, chroma-key, audio unlock |
| `references/v3-to-v4-and-tooling.md` | Upgrading 3 → 4, project setup (Vite + TS), builds, testing |

## Boundaries with sibling skills

- TypeScript language and tooling → `typescript-development`; testing
  practice → `testing-development`.
- Page shell, CSS and DOM UI → `frontend-development`; menu and HUD
  usability → `ux-design`; accessibility of menus →
  `accessibility-development`.
- Movement, jump and juice *feel* → `game-feel`. Kenney CC0 sprite and
  tile packs → `kenney-asset-integration`.
- 3D in the browser → `threejs-development`; desktop or console 2D/3D
  engines → `godot-development`, `unity-development`.
- Load time, bundle size and frame budget in the browser →
  `web-performance-development`.
