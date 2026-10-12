# Scenes and Lifecycle

## Game config skeleton (v4; the same shape works in v3)

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { HudScene } from './scenes/HudScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',                 // DOM element id
  width: 960,
  height: 540,
  backgroundColor: '#1d1f2b',
  pixelArt: false,                // true → nearest filtering, no antialias
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [BootScene, BattleScene, HudScene],   // ONLY the first auto-starts
});
```

## Lifecycle per start

`constructor` (once, when registered) → **`init(data)`** → `preload()`
→ **`create(data)`** → `update(time, delta)` each frame → `shutdown`
event (on stop or start-another) → … → `destroy` event (on
`scene.remove`).

- Reset per-run state in `init`. Class-field initialisers run once;
  a restart keeps their old values.
- `data` passed to `start`/`launch`/`run` arrives in both `init` and
  `create` and stays readable via `this.sys.getData()`.

## Auto-start and data (the trap)

The SceneManager auto-starts **only the first entry** of the config's
`scene` array, with empty data. Others need `active: true` in their own
config (they then start with no data too) or an explicit start.
Symptoms: a scene runs once with `{}` and crashes on a missing level
id, or your explicit `start(key, data)` appears to be "overridden"
because the auto-started instance ran first.

Patterns that avoid it:

```ts
// 1. A tiny Boot scene first that decides what runs and with what
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    this.scene.start('Battle', { levelId: 'meadow-1', seed: 1234 });
  }
}

// 2. Register on demand, without auto-start
this.scene.add('Bonus', BonusScene, false);
this.scene.start('Bonus', { reward: 50 });
```

Also guard `init(data)`: validate the fields you require and fail
loudly (`throw new Error('Battle needs levelId')`) instead of running
half-configured.

## Transitions

| Call | Effect on caller | Target |
|------|------------------|--------|
| `start(key, data)` | **Shut down** | Starts (or restarts) |
| `launch(key, data)` | Unchanged (runs in parallel) | Starts |
| `run(key, data)` | Unchanged | Resumes if paused, wakes if asleep, starts if new |
| `switch(key)` | **Sleeps** (kept in memory) | Starts or wakes |
| `pause()` / `resume()` | Update stops; **still renders** | — |
| `sleep()` / `wake()` | Update **and** render stop | — |
| `stop(key)` | Shut down | — |
| `restart(data)` | Shutdown + start self | — |

All of these are **queued to the next SceneManager update**. Don't
read the new scene's objects on the same line.

Render order follows the scene list: later scenes draw on top. Update
order is the reverse, so the top scene gets input first. Put HUD scenes
after the gameplay scene, or use `bringToTop()`.

## Cleanup discipline

```ts
create(): void {
  const onResize = (size: Phaser.Structs.Size) => this.layout(size);
  this.scale.on('resize', onResize);
  const onSave = () => this.flashSaved();
  this.game.events.on('saved', onSave);

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.scale.off('resize', onResize);
    this.game.events.off('saved', onSave);
    this.enemies = [];               // drop references to destroyed objects
  });
}
```

Torn down for you: display list objects, scene tweens, timers
(`this.time`), scene-level input handlers and `this.events` listeners.
**Not** torn down: listeners on `game`, `registry`, `scale`, `sound`
(global), `window`/`document`, workers and sockets.

Leak test: restart the scene 10 times in a dev build, then compare
`this.children.length`, listener counts
(`this.game.events.listenerCount('saved')`) and heap snapshots.

## Cross-scene communication

- `this.registry` (a game-wide DataManager) for shared values. Listen
  with `this.registry.events.on('changedata-score', …)`, and remove the
  listener on shutdown.
- `this.scene.get('Battle')` for a direct reference. Couples scenes, so
  keep it to orchestration.
- A small typed event bus module beats string events scattered across
  scenes in TS projects.
- Sleeping scenes still receive these events, so guard handlers if
  they touch objects that only exist while awake.
