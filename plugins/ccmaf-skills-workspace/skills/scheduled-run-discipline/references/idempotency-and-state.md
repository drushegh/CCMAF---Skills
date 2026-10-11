# Idempotency and state

A scheduled run will be interrupted: the machine sleeps, the usage window
closes, the launcher times out, a step throws. Design every step so that
running it again from the top produces the same end state. State lives in
files in the workspace, never in the conversation.

## 1. The state folder

```text
<workspace>/
  runs/
    .lock                    # present only while a run is active
    state.json               # small, machine-readable cross-run state
    2026-10-12T0900-a3f1/    # one folder per run (see run-log-and-summary.md)
  .done/                     # optional: one marker per processed item
```

`state.json` holds only what the next run needs to resume and to escalate:

```json
{
  "schema_version": 1,
  "last_run_id": "2026-10-12T0900-a3f1",
  "last_status": "partial",
  "processed_ids_file": "runs/processed-ids.txt",
  "backlog": 112,
  "failures": { "fetch-feed:timeout": { "count": 2, "first_seen": "2026-10-10T0900" } }
}
```

Keep it small. If it grows beyond a screen, it is a log, and logs go in run
folders.

## 2. Done-markers and processed-ID lists

Identify items by something stable: a file's content hash, a message ID, a
URL plus date, a record key. Not by "newer than last run": a missed run, a
clock change or a file copied with an old timestamp all break time windows.

Two patterns:

- **Marker per item:** create `.done/<id>` after the item's effect is
  complete and verified. Checking is a file-exists test. Good up to a few
  thousand items.
- **Append-only ID list:** append `<id>` to `processed-ids.txt` after the
  effect. Check with a lookup at the start of the run. Rotate yearly.

The order matters: **effect, verify, then marker.** Writing the marker first
means a crash between marker and effect silently loses the item forever.
Writing it after means a crash between effect and marker repeats the item
once, so the effect itself must tolerate a repeat (next section).

## 3. Making effects repeat-safe

| Effect | Repeat-safe form |
|---|---|
| Write an output file | Write to `<name>.tmp`, then rename over the target. A rerun overwrites with the same content. |
| Append to a digest | Include the item ID in the entry; skip if the ID is already present. |
| Move a file | Check the destination first; if the source is gone and the destination exists, the move already happened. |
| Name collision on move | Deterministic suffix from the content hash, never "file (2)". |
| Create a calendar entry, task or note | Search for an existing one with the item ID in its body or metadata first. |
| Call an API that creates something | Use an idempotency key if the API supports one; otherwise look up before create. |
| System change | Read current value; if already the target value, log "already set" and skip. The journal records both. |

If an effect cannot be made repeat-safe, it does not belong in an unattended
run. Make it a proposal.

## 4. The lock protocol

Overlap happens when a run outlasts its interval, or when the owner starts
one by hand while the schedule fires.

1. At start, try to create `runs/.lock` exclusively (fail if it exists).
   Write into it: run ID, start time, host name, process ID if known, the
   run's time budget.
2. If the lock exists and is **live** (start time + budget + margin is still
   in the future): log "previous run `<id>` still active", write a one-line
   summary with status `skipped-locked`, exit.
3. If the lock is **stale** (older than budget + margin): log the stale lock's
   contents, record it under "Needs you" (a run died without cleaning up),
   then replace it with your own and continue. Recovery (section 5) runs next.
4. Release the lock as the last step of wrap-up, after the summary is written.

Exclusive create in PowerShell: `New-Item -ItemType File -Path runs\.lock`
without `-Force` fails if the file exists. In Bash with `noclobber`
(`set -C`), `> runs/.lock` fails if the file exists; `flock` (util-linux) is
the stronger option on Linux. A lock in a cloud routine's fresh clone protects
nothing across runs; there, rely on the schedule's own non-overlap and on
idempotency.

## 5. Recovering a partial run

At the start of every run, before planning new work:

1. Read `state.json`. If `last_status` is `running` (never updated), the last
   run died. Record that.
2. Look at the last run folder. If it has no `summary.md`, write a short
   retrospective summary for it ("interrupted; last log line: …") so the owner
   sees a complete history.
3. Re-derive progress from done-markers, not from the dead run's plan. Items
   with a marker are done; items without one are not, whatever the log says.
4. Check for half-written outputs (`*.tmp`). Delete only temp files the run
   itself creates by pattern, and log each one; never delete anything else.
5. Then plan this run's work as normal.

## 6. Anti-patterns

- Holding the item list in memory and writing all markers at the end.
- A "last run time" as the only state.
- Locks deleted on sight ("probably stale").
- Renaming user files to mark them processed (the owner's names are not the
  run's state).
- State in a hidden location the owner cannot find; keep it under `runs/`.
