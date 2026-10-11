# Watchers and Schedules

Folder rules become most useful when they run without being asked, and most
dangerous for the same reason. The behaviour of any unattended run (the
contract, lock, caps, run log, summary, no questions) is owned by
`scheduled-run-discipline`; read it before scheduling anything. This file
covers what is specific to files.

## Sweep or watcher?

| | Periodic sweep | Watcher |
|---|---|---|
| Latency | Minutes to a day | Seconds |
| Survives reboot, sleep, logoff | Yes, if scheduled properly | Only if itself run as a service or task, and it misses events while down |
| Sees files that arrived while not running | Yes | No |
| Event storms (unzip of 5,000 files) | Irrelevant | Buffer overflow and lost events |
| Idempotency | Natural: each run plans from current state | Needs care: one file can raise several events |
| Recommended | **Default** | Only for near-real-time filing, always with a sweep as backstop |

A watcher is a trigger for a sweep, not a replacement for one: on an event,
debounce, then run the normal plan-and-apply over the affected folder.

## Unattended grants for file rules

Interactive runs approve each plan. Unattended runs cannot, so the run
contract (`scheduled-run-discipline`) must grant action kinds explicitly.
Sensible defaults:

| Action | Unattended default |
|---|---|
| `move` / `rename` under an approved rule set, inside scope, no conflicts | Allowed if granted |
| Conflict of any kind | `skip` and report; never `suffix` or quarantine unattended unless granted |
| `quarantine` exact duplicates | Allowed only if granted, with a per-run cap |
| Quarantine by age or type ("installers older than 30 days") | Proposal only, unless explicitly granted |
| Emptying quarantine | Never unattended |
| Changing the rules file | Never unattended |
| Anything outside scope | Never |

Caps per run (for example 200 operations, 2 GB moved) keep a bad rule from
doing damage at scale; hitting the cap is a reported outcome, not an error.

The unattended run still writes the plan, manifest, journal entry and
summary; the plan is simply approved by the grant instead of by a person.
If the plan contains anything outside the grant, apply the granted rows and
list the rest under "Needs you".

## Readiness: is the file finished?

A watcher fires when a file *appears*, which is usually before it is
complete. Before acting on any file:

- Skip partial-download and lock patterns: `*.crdownload`, `*.part`,
  `*.partial`, `*.download`, `*.tmp`, `~$*`, `.~lock.*#`.
- Require a settle time: unchanged size and modified time across two checks
  some seconds apart (the rule file's `skip_newer_than_minutes` for sweeps).
- Try to open the file for exclusive read; if that fails, it is in use; skip
  and let the next sweep take it.
- Debounce events: collect events for a short window (for example 10–30 s)
  and act once per file, after the window closes.

## Windows

**Scheduled sweep (preferred):** a Task Scheduler task that runs the sweep
script as the user, only when logged on unless the user agrees otherwise,
with "do not start a new instance" so runs cannot overlap. Create it with
`Register-ScheduledTask` (see `windows-administration` for triggers,
principals and the exact cmdlets), or let the CCMAF-App's own scheduling
launch the run.

**Watcher:** .NET `System.IO.FileSystemWatcher`, from PowerShell via
`Register-ObjectEvent` or in a small compiled tool. Facts that matter
(from the .NET documentation):

- The internal buffer defaults to 8 KB and can be raised to at most 64 KB;
  when many changes arrive quickly it overflows, the `Error` event fires
  with `InternalBufferOverflowException`, and individual events are lost.
  On overflow, run a full sweep.
- One move can raise several `Changed`, `Created` and `Deleted` events; a
  folder pasted into the watched folder may be reported as one rename, not
  as its contents.
- Antivirus and sync clients raise extra events.
- Keep handlers tiny: enqueue the path, do the work elsewhere.
- The watcher only lives while its process lives; a PowerShell window that
  closes stops it.

## Linux

- **Sweep:** cron or, better, a systemd user timer (`OnCalendar=`,
  `Persistent=true` to catch up after sleep). Details →
  `linux-administration`.
- **Watcher:** `inotifywait` from inotify-tools, for example
  `inotifywait -m -e close_write -e moved_to --format '%w%f' "$dir"`.
  `close_write` fires when a writer closes the file, which is a better
  readiness signal than `create`. The per-user watch limit
  (`fs.inotify.max_user_watches`) caps recursive watches on large trees.
- **systemd path units** (`.path` with `PathChanged=` or
  `DirectoryNotEmpty=`) start a service when a folder changes; good for an
  "inbox" folder, and the service is the normal sweep.

## macOS

- **Sweep:** a `launchd` user agent with `StartCalendarInterval` (cron also
  works but launchd handles sleep better).
- **Watcher:** `launchd` `WatchPaths` / `QueueDirectories` keys, or `fswatch`
  (free, install separately). FSEvents coalesces events, so treat every
  notification as "something in this folder changed" and sweep it.
- Folders under Desktop, Documents and Downloads are privacy-protected;
  background tools need the user to grant access in System Settings
  (Privacy and Security; verify the exact pane for the macOS version).

## Pitfalls specific to automation

- **Feedback loops.** A rule that moves files into a watched folder triggers
  itself. Destinations must be outside the watched scope.
- **Sync client fights.** Moving files inside a synced folder while the
  client is mid-upload can produce conflict copies. Prefer sweeps at quiet
  times, and settle times long enough for uploads.
- **Sleeping laptops.** A task scheduled for 03:00 does not run on a closed
  laptop unless configured to wake or to run when available; document which.
- **Silent rule drift.** If the user edits the rules file, the next
  unattended run must log the rules file's version or hash, so a change in
  behaviour can be traced.
