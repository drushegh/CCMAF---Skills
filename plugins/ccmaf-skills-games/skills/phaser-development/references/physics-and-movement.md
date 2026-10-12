# Physics and Movement

## Arcade vs Matter

| | Arcade | Matter |
|---|---|---|
| Shapes | Axis-aligned boxes and circles | Polygons, compound bodies, rotation |
| Features | Velocity, acceleration, drag, bounce, gravity, colliders/overlaps | Constraints and joints, friction, stacking, sensors |
| Cost | Very cheap: hundreds to thousands of bodies | Heavier; fine for dozens to low hundreds |
| Pick for | Platformers, shooters, top-down, most arcade games | Physics toys, ragdolls, rotating platforms, stacking puzzles |

Choose one per game where you can. Mixing systems means two world
steps and no collisions between them.

## Arcade essentials

```ts
this.player = this.physics.add.sprite(100, 300, 'hero');
this.player.setCollideWorldBounds(true);
this.player.body.setSize(20, 30).setOffset(6, 2);   // trim the hitbox to the art
this.physics.add.collider(this.player, this.groundLayer);
this.physics.add.overlap(this.player, this.coins, (_p, coin) => {
  (coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
});
```

- Move bodies with velocity or acceleration. Setting `x/y` directly
  teleports them, which skips collision for that step.
- Tilemaps: `layer.setCollisionByProperty({ collides: true })` (or by
  index), then `collider(sprite, layer)`.
- Fast projectiles tunnel through thin walls. Make walls thicker, cap
  speeds, or raycast/sweep projectiles yourself.
- `debug: true` in the arcade config draws bodies. Turn it on first
  when collisions "don't work". Most often the cause is a body size or
  offset that doesn't match the art, or a collider that was never
  registered.
- The Arcade world steps at a fixed rate by default (`fps: 60`), so
  physics is consistent across display refresh rates (verify the
  `fixedStep` default on your version).

## Manual motion and delta

`update(time: number, delta: number)`: **`delta` is in milliseconds.**

```ts
update(_t: number, delta: number): void {
  const dt = delta / 1000;
  this.cloud.x += this.cloudSpeed * dt;          // px per second
}
```

Smoothing: `Phaser.Math.Linear(a, b, 1 - Math.exp(-rate * dt))` is
frame-rate independent. A fixed `lerp(a, b, 0.1)` per frame is not.
Tweens are time-based already, so prefer them for UI motion.

## Determinism (auto-battlers, replays, netcode)

- Run game rules in a **fixed-step logic loop** detached from
  rendering: accumulate `delta`, step the simulation at a fixed
  interval, and render the latest state (interpolate if needed).
- Use a **seeded RNG** passed in explicitly. `new
  Phaser.Math.RandomDataGenerator([seed])` works, or use your own PRNG
  in the rules module. Never mix in `Math.random()` or `Date.now()`.
- Keep the simulation in plain TS with no Phaser imports, so a
  headless unit test can replay a recorded seed and inputs and compare
  a state hash pinned to a constant (`testing-development`).
- Order-dependent effects (on-hit triggers, "after damage" hooks) need
  a documented, tested order. Iteration order over objects and maps is
  part of your game rules.

## Feel

Acceleration curves, coyote time, jump buffering, variable jump height
and screenshake are design decisions owned by `game-feel`. Implement
them here as tunables (a config object), not as literals scattered
through `update`.
