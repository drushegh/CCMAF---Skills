# Power plans and powercfg

Power settings trade responsiveness against heat, noise and battery. The right
answer depends on the device: laptop or desktop, Modern Standby or not, plugged
in or not.

## Read the current state (read-only)

```bat
powercfg /list
powercfg /getactivescheme
powercfg /query
powercfg /aliases
powercfg /availablesleepstates
powercfg /requests
```

`/requests` (elevated) shows apps and drivers currently preventing sleep or
display-off: the usual answer to "my PC never sleeps".

Built-in scheme GUIDs (documented):

| Plan | GUID | Alias |
|---|---|---|
| Balanced | `381b4222-f694-41f0-9685-ff5bb260df2e` | `SCHEME_BALANCED` |
| High performance | `8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c` | `SCHEME_MIN` |
| Power saver | `a1841308-3541-4fab-bc81-f71556f20b4a` | `SCHEME_MAX` |

**Modern Standby devices only allow Balanced** (or plans derived from it); the
other plans may not be listed at all. On these devices, tune with the
**power mode** (Settings > System > Power & battery: Best power efficiency /
Balanced / Best performance), which layers on top of the active plan.

## Recommendations

- **Default to Balanced.** It boosts when needed and idles when not; on most
  modern CPUs it is close to High performance for interactive use.
- **Laptops:** Balanced plus the power mode. Use "Best performance" while
  plugged in for heavy work if the user accepts more fan noise.
- **Desktops** doing sustained heavy work (rendering, compiling, games) may
  benefit from High performance if it is listed. Measure: if the benchmark
  or frame time does not improve, go back to Balanced.
- **Other plans** (vendor plans, or plans reported by `powercfg /list` that
  are not listed above) can be used if present; do not create hidden plans
  from GUIDs found online.

## Switching plans (a change: journal it)

```bat
powercfg /getactivescheme                    & rem record the prior GUID
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
```

Undo: `powercfg /setactive <prior GUID>`.

## Customising a copy, not the original

```bat
powercfg /duplicatescheme 381b4222-f694-41f0-9685-ff5bb260df2e
rem note the new GUID it prints, then:
powercfg /changename <newGUID> "Balanced (tuned)"
powercfg /setactive <newGUID>
powercfg /change monitor-timeout-ac 10
powercfg /change standby-timeout-ac 30
```

`/change` settings (minutes): `monitor-timeout-ac|dc`, `disk-timeout-ac|dc`,
`standby-timeout-ac|dc`, `hibernate-timeout-ac|dc`. They apply to the active
scheme.

Undo: `powercfg /setactive <prior GUID>`, then optionally
`powercfg /delete <newGUID>` (never delete a built-in scheme).

Back up before deeper edits, into the run's backup folder in the workspace
(`<workspace>\backups\<run id>\`, per `safe-system-changes`), not into
Documents where it is easily lost or synced:

```bat
powercfg /export "<workspace>\backups\<run id>\power-balanced.pow" 381b4222-f694-41f0-9685-ff5bb260df2e
```

Record the backup path in the journal entry.

Restore with `powercfg /import <file>` (imports as a scheme; then `/setactive`).

## Hibernation and fast startup

```bat
powercfg /hibernate off
```

- Removes `hiberfil.sys` (often several GB) and **also disables fast
  startup** and hibernation.
- Worth it when disk space is tight on a desktop that never hibernates, or
  for dual-boot set-ups where fast startup locks the Windows volume.
- Not recommended on laptops that rely on hibernate for battery life.
- Capture the before state first (`powercfg /a`, and `HiberbootEnabled`).
- Undo: `powercfg /hibernate on` (then restore fast startup to its captured
  state; see catalogue entry PT-13).

A middle ground: `powercfg /hibernate /type reduced` keeps a smaller
hiberfile that only supports fast startup. Microsoft's powercfg reference
says to run `powercfg /hibernate /size 0` first so the OS manages the size
(checked October 2026); `/size` also enables hibernation. Undo with
`powercfg /hibernate /type full`.

## Reports (read-only; write into the run folder)

Without `/output` these write HTML into the current folder. Point them at the
run's backup folder instead:

```bat
powercfg /energy /output "<workspace>\backups\<run id>\energy.html"
powercfg /batteryreport /output "<workspace>\backups\<run id>\battery.html"
powercfg /sleepstudy /output "<workspace>\backups\<run id>\sleepstudy.html"
powercfg /lastwake
powercfg /waketimers
```

- `/energy` should run with the PC idle and apps closed (default 60 seconds,
  elevated).
- `/batteryreport` shows design vs full-charge capacity: a worn battery
  explains short battery life better than any setting.
- `/sleepstudy` covers Modern Standby drain over recent days.
- `/lastwake` and `/waketimers` explain unexpected wake-ups.

Reports contain device details; keep them in the workspace and share only
with the user's agreement.

## Do not

- Set processor minimum state to 100% on laptops "for speed": heat and battery
  cost, rarely measurable benefit.
- Apply power plan `.pow` files from the internet.
- Disable sleep entirely to "fix" wake problems: find the waking device or
  timer with `/lastwake` and `/waketimers` instead.
