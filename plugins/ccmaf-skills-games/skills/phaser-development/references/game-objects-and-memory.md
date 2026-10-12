# Game Objects, Containers, Groups and Memory

## The ownership model

A game object belongs to **one** display list: the scene's, or a
Container's. Groups are *collections* (membership only, no transform,
not rendered as a unit). Layers are display lists without transforms.

| Holder | Transform for children | Renders children | Input on itself |
|--------|------------------------|------------------|-----------------|
| Scene display list | — | Yes | — |
| `Container` | Yes (position/rotation/scale/alpha) | Yes | Needs `setSize()` + `setInteractive()` |
| `Layer` | No | Yes | No |
| `Group` | No | No (members render via the scene) | No |

## Destroy semantics (verified against v4.1–4.2 source and docs)

| Call | Default behaviour |
|------|-------------------|
| `container.remove(child, destroyChild = false)` | Detaches only |
| `container.removeAll(destroyChild = false)` | Detaches only; **children live on, unrendered: a leak** |
| `container.destroy()` | Destroys children while `exclusive` (default `true`) |
| `group.remove(child, removeFromScene = false, destroyChild = false)` | Membership only |
| `group.clear(removeFromScene = false, destroyChild = false)` | Membership only |
| `group.destroy(destroyChildren = false, removeFromScene = false)` | Destroys the group; members survive unless asked |
| `gameObject.destroy()` | Removes from its list, its input and physics, and frees it |

Rebuilding a panel every turn with `panel.removeAll()` and then
re-adding new objects grows memory and object counts on every rebuild.
Use `panel.removeAll(true)`, or keep the children and update them in
place (usually better).

After `destroy()`, drop your own references (arrays, maps, closures).
Calling methods on a destroyed object throws or misbehaves, and the
array keeps the corpse reachable.

## Pooling

```ts
this.bullets = this.physics.add.group({
  classType: Bullet,              // extends Phaser.Physics.Arcade.Sprite
  maxSize: 64,
  runChildUpdate: true,
});

fire(x: number, y: number): void {
  const b = this.bullets.get(x, y) as Bullet | null;   // reuses inactive members
  if (!b) return;                                      // pool exhausted
  b.fire(x, y);                                        // setActive(true).setVisible(true), velocity…
}

// in Bullet.preUpdate: when off-screen →
this.disableBody(true, true);     // inactive + hidden → available to get()
```

Rules: reset *every* field on reuse (tint, alpha, scale, flip,
velocity, timers), not only position; cap `maxSize`; never `destroy()`
pooled members during play.

## Data on objects

Prefer typed subclasses (`class Unit extends Phaser.GameObjects.Sprite
{ hp = 10 }`) or a separate model keyed by id over
`setData`/`getData` string bags in TS. Keep the *rules* model outside
the game object entirely, and let the sprite mirror it. Then the sprite
can be destroyed and rebuilt without losing state.

## Leak hunting checklist

1. Restart the scene, or rebuild the UI, 10 times.
2. Compare `this.children.length`, group sizes and container
   `list.length`.
3. Compare listener counts on long-lived emitters (`game.events`,
   `registry.events`, `scale`).
4. Heap snapshot in DevTools, filtered by your class names.
5. Look for `removeAll()` / `clear()` without the destroy flag,
   transient modifier or registry entries added per action and never
   removed, and timers created with `loop: true` but never removed.
