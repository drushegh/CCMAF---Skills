---
name: windows-performance-tuning
description: >-
  Measured, reversible performance tuning for a Windows PC: startup trimming,
  background apps, power plans and powercfg, storage clean-up (Storage Sense,
  Disk Cleanup, DISM component store), visual effects, safe debloat of inbox
  apps, and a verified registry tweak catalogue where every entry has a risk
  rating, effect, exact revert and Windows version/edition applicability.
  Measure before and after; nothing applied without safe-system-changes. Use
  whenever the user says "my PC is slow", "speed up Windows", "slow boot",
  "too many startup apps", "free up disk space", "C: drive full", "best power
  plan", "turn off animations", "debloat Windows", "remove bloatware",
  "registry tweaks", "optimise for gaming", or mentions powercfg, cleanmgr,
  Storage Sense, WinSxS, Remove-AppxPackage or a tweak script. Never disables
  security features and never runs unverified tweak packs.
---

# Windows Performance Tuning

Make a Windows PC feel faster **without** breaking it or weakening its
security. The method is: **measure, explain, propose, apply one change at a
time under `safe-system-changes`, re-measure, keep or revert.** Every change
has a recorded undo.

Context (October 2026, re-verify): Windows 11 24H2/25H2 is the main target;
Windows 10 reached end of support on 14 October 2025 (consumer Extended
Security Updates run to 13 October 2026 (verify)) and is only noted where
behaviour differs. Modern Standby laptops only offer the Balanced plan (plus the power
mode slider). SSDs are the norm, which makes many classic "speed-up" tweaks
pointless or harmful.

## Non-negotiables

1. **Measure first.** No tuning without a baseline: boot time, startup impact,
   CPU/memory/disk use at idle, free space. See `references/measure-first.md`.
   If you cannot measure an improvement, you cannot claim one.
2. **Find the cause before applying a fix.** A slow PC is usually one of: too
   much at startup, a full or failing disk, a runaway process, low RAM for the
   workload, thermal throttling, or malware. Tweaks do not fix hardware faults;
   hand those to `windows-diagnostics`.
3. **Everything goes through `safe-system-changes`.** Plan shown, restore point
   before the first change of a run, registry export before every registry
   edit, explicit confirmation per change, journal entry, verify, revert path.
4. **One change at a time,** then re-measure. Batches hide which change helped
   and which broke something.
5. **Only catalogue tweaks.** Registry changes come from
   `references/registry-tweak-catalogue.md`, where each entry is sourced,
   rated, and has an exact revert. Anything not in the catalogue is out of
   scope; do not improvise keys or values, and do not run third-party "tweak
   packs" or debloat scripts.
6. **Never trade security for speed.** Do not disable Defender, the firewall,
   SmartScreen, UAC, Windows Update, virtualisation-based security or memory
   integrity, and do not add antivirus exclusions for speed.
7. **Never silently delete user data.** Clean-up targets caches and system
   leftovers. Recycle Bin, Downloads and anything in a user folder are the
   user's data: show what would go and ask.
8. **Prefer the supported UI or documented command** over raw registry edits.
   A setting toggled in Settings is easier for the user to find and undo.

## Decision table

| Symptom | First look | Likely lever |
|---|---|---|
| Slow to usable desktop after sign-in | Startup apps and their impact | Startup trimming (`startup-and-background.md`) |
| Slow boot before sign-in | Boot duration events, drivers, firmware | Usually `windows-diagnostics`; fast startup is an occasional factor |
| Sluggish all the time | Task Manager: which resource is pegged | Kill the cause; background apps; power plan |
| Fan loud, battery poor | Power plan, power mode, background apps | `power-plans.md` |
| Disk nearly full | What is using the space | `storage-cleanup.md` |
| Animations feel laggy on older hardware | GPU driver, visual effects | `visual-effects-and-debloat.md` |
| Lots of unwanted preinstalled apps | Inbox apps list | Safe debloat (`visual-effects-and-debloat.md`) |
| User asks for "registry tweaks" | What problem they want solved | Catalogue entry for that problem, or none |
| Disk at 100% constantly, crashes, odd errors | Disk health, event log | `windows-diagnostics` (not tuning) |
| Unknown processes using resources | Is it legitimate? | `windows-security-hygiene` first |

## Workflow

1. **Interview.** What feels slow, since when, after what change, what the PC
   is used for (office, gaming, development), laptop or desktop, edition
   (Home, Pro, Enterprise), managed by work or not. Work-managed devices are
   out of scope beyond read-only advice.
2. **Baseline.** Run the read-only measurements and save them into the
   workspace (`measure-first.md`).
3. **Diagnose.** Name the bottleneck with evidence. If it is hardware, a
   failing disk, drivers or malware, stop tuning and route to the right skill.
4. **Propose.** A short ranked list: change, expected effect, risk, how we
   will measure it, how to undo. Lead with the highest-value, lowest-risk
   item (almost always startup trimming or freeing disk space).
5. **Apply one change** under `safe-system-changes`.
6. **Re-measure** the same metric under the same conditions (reboot where the
   metric needs it). Keep the change only if it helped and broke nothing.
7. **Report.** Before/after numbers, what changed, journal references, how to
   revert each item.

## High-frequency pitfalls

- **Tweaking without a baseline,** then reporting "feels faster". Placebo is
  not a result.
- **Disabling services by list.** Search indexing, SysMain, Print Spooler,
  Windows Update and similar get disabled by internet guides; the cost is
  broken search, broken printing, missing security patches, and usually no
  measurable gain on an SSD.
- **Disabling the page file** "because I have lots of RAM": crashes and lost
  crash dumps. Leave it system-managed.
- **Running debloat scripts** that remove the Store, frameworks or Windows
  components; removing the Microsoft Store is unsupported and breaks app
  updates.
- **Deleting WinSxS by hand.** Microsoft warns this can make the PC unbootable.
  Use DISM.
- **`/ResetBase` without warning the user** that installed updates can no
  longer be uninstalled.
- **High performance plan on a laptop** for a problem that was really one
  background app: more heat and noise, worse battery, same lag.
- **Policy keys on Home edition.** Many policies are honoured only on Pro,
  Enterprise or Education; check the catalogue's applicability column before
  writing anything.
- **Forgetting the user sees policy changes** as "Some settings are managed by
  your organisation". Tell them, and journal it.
- **Clearing the Recycle Bin or Downloads as "temp files".** That is user data.

## How to verify

- The before and after measurements use the same method, same power state
  (plugged in or not), and comparable conditions (fresh boot, idle period).
- Each kept change has a journal entry with its revert, and the revert was
  checked to be valid (key path exists, prior value recorded, or the UI
  location noted).
- The PC still does what the user needs: search works, printing works, updates
  install, security status in Windows Security is green.
- After a reboot the change persisted (policies and some settings revert if
  applied incorrectly).

## Reference index

Load on demand:

- `references/measure-first.md` — read-only baselines: boot duration, startup
  impact, resource use, free space, and how to compare before and after
- `references/startup-and-background.md` — startup trimming, background apps,
  scheduled tasks and the "do not disable" services list
- `references/power-plans.md` — `powercfg` plans, power mode, hibernation,
  energy and sleep reports
- `references/storage-cleanup.md` — Storage Sense, Disk Cleanup (`cleanmgr`),
  DISM component store clean-up, finding large folders, what never to delete
- `references/visual-effects-and-debloat.md` — visual effects and transparency,
  safe inbox app removal and reinstall, what never to remove
- `references/registry-tweak-catalogue.md` — the only allowed registry and
  policy tweaks, each with risk, effect, exact revert and applicability, plus
  the rejected list

## Boundaries

- **The change protocol** (restore point, export, confirmation, journal,
  revert) → `safe-system-changes`.
- **Crashes, BSODs, failing disks, driver faults, event-log triage** →
  `windows-diagnostics`.
- **Unknown or suspicious processes and autostarts** →
  `windows-security-hygiene`.
- **Services, scheduled tasks, winget, Windows Update administration** →
  `windows-administration`.
- **Capturing the tuned state as files and detecting drift** →
  `machine-config-as-code`.
- **Scripting the measurements robustly** → `powershell-development`.
- **Running tuning checks on a schedule** → `scheduled-run-discipline`.
- **Linux and WSL performance** → `linux-administration`.
