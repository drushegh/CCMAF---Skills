# The act-verify loop

The official guidance for computer use repeats one instruction: after each
step, take a screenshot and check whether the step achieved what it should.
This file turns that into a loop you can follow and audit.

## One iteration

1. **Observe.** Take a screenshot. Name the window in front, the state it
   is in, and anything unexpected (dialogs, notifications, a different
   account, an error).
2. **Decide.** The next step toward the goal, the target, and the method
   (keyboard, search, click).
3. **Predict.** Write the expected visible change in one line: "the
   Preferences window opens with the General tab selected". If you cannot
   say what should change, you do not understand the step yet.
4. **Act.** One action, or a short batch whose every step is predictable,
   ending in a screenshot.
5. **Verify.** Compare the new screenshot with the prediction. Zoom on the
   relevant region if the change is small (a checkbox, a value).
6. **Record.** Append one line to the run log: time, app, action, result.

## Verification means evidence of effect

| Action | Weak evidence | Real evidence |
|---|---|---|
| Save a file | No error appeared | Title bar no longer shows the unsaved marker; file has a new modified time |
| Change a setting | Clicked the toggle | Toggle shows the new state after the dialog was reopened, or the effect is visible |
| Install via a GUI installer | Installer closed | App appears in the installed list with the expected version |
| Send or submit | Button was clicked | The app shows the sent/submitted state (and this was a confirmed action) |
| Close a dialog | Clicked close | Dialog absent from the next screenshot |

Where a non-GUI check exists (reading a config file, querying a setting
from the shell, checking a file on disk), use it as well. It is cheaper and
more reliable than a pixel check.

## Batching

- Batch only steps whose outcome you can predict without looking: typing a
  known string into a field you have already focused, a fixed keyboard
  sequence in a dialog you have seen.
- End every batch with a screenshot. The API docs suggest saying so in the
  system prompt for exactly this reason.
- Never place a consequential action (send, delete, install, apply,
  purchase) inside a batch. It stands alone, after confirmation, with its
  own verification.
- In an API harness, run blocks in order and stop at the first failure;
  later blocks are answered as not executed.

## Retries and failure

- **Same step fails once:** re-observe, try a different method.
- **Fails twice:** step back to a known state (close the dialog, return to
  the main window), re-orient, try once more.
- **Fails three times:** stop. Report what the goal was, what was tried and
  what the screen shows now.
- **Something unexpected appears:** stop first, think second
  ([stop-conditions.md](stop-conditions.md)).

Never improvise a workaround that changes more than the original step
would have (for example, deleting a config file because a setting will not
toggle).

## The run log

Keep it short and in the workspace, especially for any run that changes
state. Machine changes also go into the `safe-system-changes` change
journal; the run log is the step-by-step record beneath it.

```text
10:02  Settings      opened via Start search "display"        ok
10:03  Settings      Display > Scale: 150% → 125%             confirmed by user; ok, reads 125%
10:04  Settings      "Keep changes?" dialog → Keep            ok, dialog closed
```

## Token and time budget

- Each screenshot costs roughly 1,000 to 1,800 input tokens per the API
  docs; a long loop adds up fast.
- Downscale screenshots where the tool allows (Claude in Chrome's
  screenshot takes a `scale`; your own harness can resize before sending).
- Drop old screenshots from context once the state they showed is past;
  keep the run log instead.
- Set a step budget before starting ("this should take about 15 actions");
  at twice the budget, stop and reassess with the user.
- For unattended runs, the budget and stop rules are written into the run
  contract (`scheduled-run-discipline`), and usage pacing follows
  `stay-within-limits`.

## Handing back mid-task

When the loop stops for any reason, leave the screen in a state the user
can understand: dialogs either completed (if confirmed) or cancelled, no
half-typed fields in consequential forms, and a message saying exactly
where things stand and what the next manual step is.
