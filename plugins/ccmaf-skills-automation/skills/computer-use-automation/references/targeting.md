# Reliable targeting

The model sees a screenshot and outputs coordinates. Coordinates can be
wrong by a few pixels, can refer to a stale screen, or can be in the wrong
coordinate space. Targeting well means reducing how often a pixel guess is
needed at all, and making the guesses that remain easy.

## Order of preference

1. **Keyboard shortcuts and accelerators.** `Ctrl+S`/`Cmd+S`, `Alt` menu
   keys on Windows, `Cmd+,` for preferences on macOS, `F2` to rename,
   `Ctrl+L` to focus an address field. Deterministic, no coordinates.
2. **Typed search.** Start menu or Spotlight to open apps; in-app command
   palettes and search boxes to reach settings; type-to-select in lists and
   drop-downs.
3. **Focus navigation.** `Tab`/`Shift+Tab`, arrow keys, `Space`/`Enter` to
   activate. Slower to plan but robust to layout.
4. **Clicking a large, clearly labelled target** after reading its label in
   the current screenshot.
5. **Clicking a small or unlabelled target** after a `zoom` on its region.

Note the tier limits: on Claude Code, terminals and IDEs are click-only and
browsers view-only, so keyboard-first applies to "full control" apps.

## Making the guess easy

- **Aim for the centre** of the control, not its edge or its label's first
  letter.
- **Describe the target positionally before clicking** ("the 'Apply' button
  at the bottom right of the Display settings dialog, left of 'Cancel'").
  Saying it forces a check that there is only one.
- **Zoom small things.** The `zoom` action captures a region at higher
  detail; use it for icons, small text, checkboxes, and to read a value
  before and after changing it.
- **Enlarge, do not shrink.** If controls are too small after downscaling,
  increase the app's zoom or font size. Do not change the user's display
  resolution to suit the agent.
- **Maximise the target window** so controls stay put between screenshots.
- **One target per action.** Do not chain clicks on predicted positions
  of controls that have not appeared yet.

## Coordinate spaces and scaling

On the Claude Code surfaces, screenshots are downscaled and coordinates are
mapped for you. In your own API harness they are not:

- Coordinates are in **screenshot pixels**, origin top left.
- If you downscale screenshots to fit the model's image limits, divide
  the model's coordinates by the same scale factor before clicking.
- On macOS Retina, captures are at 2× logical resolution; halve
  coordinates (or downscale by 2) before clicking.
- The API docs suggest modest resolutions: about 1024×768 or 1280×720 for
  general desktop work, 1280×800 or 1366×768 for web apps, nothing above
  1920×1080.
- Symptom map: clicks consistently offset in one direction → scaling bug;
  clicks near but missing small targets → zoom and lower DPI; wrong element
  entirely → positional description and smaller steps.

## Things that move

- **Notifications and toasts** cover corners. Wait for them to clear or
  dismiss them with their own close control.
- **Animations** (slide-in panels, fades) mean the screenshot may catch a
  control mid-flight. Wait briefly (a bounded `wait`) and re-screenshot.
- **Lazy-loaded content** shifts lists down as it arrives.
- **Tooltips and hover menus** appear under the pointer and hide what was
  behind them; move the pointer away before the verification screenshot.
- **Auto-update prompts, "rate this app", licence nags** pop over
  everything. They are not part of the task: close them neutrally ("Not
  now", "Later") or stop if closing them commits to something.

## Text entry

- Click into the field, confirm the caret or focus ring is there, then
  type.
- Select existing content (`Ctrl+A`/`Cmd+A` inside the field) before
  replacing it.
- Zoom to read the field back after typing; input masks and autocomplete
  change values.
- Never type into a field whose purpose is unclear, and never type
  passwords, PINs, recovery codes or card numbers.

## Scrolling, lists and spreadsheets

- Prefer `Page Down`/`Page Up`, `Home`/`End` and arrows where scroll-wheel
  events do not register.
- Scroll with the pointer over the pane you mean to scroll; many apps
  scroll whatever is under the pointer, not the focused pane.
- Spreadsheets: use the name box or `Ctrl+G` (Go To) to reach a cell, and
  keyboard selection (`Shift+arrows`) rather than drags. For anything more
  than a few cells, use a file-level route (`office-formats`) instead of the
  GUI.

## When targeting keeps failing

After two misses on the same target: stop guessing. Re-orient with a fresh
full screenshot, try a different method (keyboard route, search,
maximising the window). After a third failure, stop and tell the user what
the target is and where it should be; they can click it in a second.
