# Input and UI

## Hit testing: what can receive a pointer event

1. Only objects that called `setInteractive()` (with a hit area) take
   part. Plain sprites are invisible to input. They never block, and
   they never receive.
2. With `this.input.topOnly === true` (the default), only the
   **top-most interactive object** under the pointer receives the
   event. Nothing "bubbles" to interactive objects beneath it.
3. Events fire at three levels: on the object (`'pointerdown'`), on
   the scene's input plugin per object (`'gameobjectdown'`), and
   globally (`this.input.on('pointerdown', (pointer, currentlyOver) => …)`).

The classic bug: a decorative overlay (a selection ring, glow or
portrait frame) was made interactive for a hover effect. It now sits
on top and swallows clicks meant for the board marker under it.
Options, best first:

- Make the decoration non-interactive. Drive its hover from the
  marker's own `pointerover`/`pointerout`.
- Make the *marker* the single interactive object, with a hit area
  that covers the decoration too
  (`setInteractive(new Phaser.Geom.Rectangle(...), Phaser.Geom.Rectangle.Contains)`).
- Forward explicitly: the decoration's handler calls the marker's
  logic.
- `this.input.setTopOnly(false)`. Every interactive object under the
  pointer now gets the event, so you must arbitrate (sort
  `currentlyOver` by depth and pick). Use this sparingly.

Inside a handler, `event.stopPropagation()` (the 4th argument on
object-level pointer events) stops the scene-level events for that
pointer action.

## Hit areas

- Default hit area = the frame rectangle. Transparent corners still
  catch clicks. `pixelPerfect: true` (or `this.input.makePixelPerfect(alphaTolerance)`)
  costs a texture read per test, so keep it to a few objects.
- Containers have no size. `container.setSize(w, h).setInteractive()`,
  otherwise nothing hits.
- Visualise with `this.input.enableDebug(obj)` when "clicks do
  nothing".

## Click vs drag

`this.input.dragDistanceThreshold` (pixels) and `dragTimeThreshold`
decide when a press becomes a drag. Set the distance threshold (for
example 6–8 px, more for touch) so a slightly shaky tap still counts
as a click on draggable cards and units. For a scrolling map under
tappable units, classify on `pointerup` by travel distance.

## Keyboard and gamepad

- `this.input.keyboard.addKeys('W,A,S,D,SPACE')` returns key objects;
  `Phaser.Input.Keyboard.JustDown(key)` for edge-triggered actions in
  `update`. Polling `isDown` every frame suits held movement.
- Remap through an action table (`jump → [SPACE, W, pad A]`), not
  scattered key codes. This is what makes remapping (an accessibility
  requirement) possible later.
- Gamepad: enable `input: { gamepad: true }`, then wait for the
  `'connected'` event. Pads report nothing until a button is pressed.
- Browser focus: keys stop arriving when the canvas loses focus. Don't
  let page shortcuts (Space scrolling the page) fight the game. Call
  `preventDefault` through Phaser's key capture
  (`addCapture`), and only while the game has focus.

## HUD and menus

- Run HUD as a **parallel scene** (`this.scene.launch('Hud')`) placed
  above the game scene, so camera shake and zoom don't move it.
  Communicate via registry or events (`scenes-and-lifecycle.md`).
- Or `setScrollFactor(0)` on HUD objects in the same scene. That is
  fine for a few labels, and fragile once camera zoom arrives.
- Text-heavy or form-like UI (settings, login, chat) → a DOM overlay
  or the `DOMElement` game object. In v4 a `DOMElement` requires a
  parent container (`dom: { createContainer: true }` in the config).
  Real HTML gives text input, screen-reader access and focus handling
  for free (`frontend-development`, `accessibility-development`).
- Menus must be keyboard and gamepad navigable: a focus index, a
  visible focus ring, Enter/A to activate, Esc/B to go back.
