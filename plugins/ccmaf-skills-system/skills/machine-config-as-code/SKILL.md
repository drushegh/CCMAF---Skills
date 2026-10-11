---
name: machine-config-as-code
description: >-
  Capture a Windows PC's setup as reviewable files in a workspace folder and
  rebuild or audit a machine from them: winget export/import package lists,
  WinGet Configuration files (`winget configure`, v2 0.2 schema and v3 dscv3),
  PowerShell profiles and modules, Windows Terminal settings, fonts, editor and
  app settings, selected registry preferences, plus a drift report of what
  changed since the last capture. Use whenever the user says "back up my
  setup", "capture this PC", "rebuild my machine", "new laptop, same setup",
  "what did I install since last month", "dotfiles for Windows", "make my PC
  reproducible", "check this machine matches my config", or works with
  `winget export`, `winget import`, `winget configure`, `*.winget` or
  `configuration.dsc.yaml` files, `$PROFILE`, or Windows Terminal
  `settings.json`. Changing the machine defers to safe-system-changes.
---

# Machine Config as Code

The machine is the build output; the workspace folder is the source. This
skill turns a hand-tended Windows PC into files a person can read, diff,
commit and replay: a package list, a declarative WinGet Configuration file,
the dotfiles that make the shell and terminal feel like home, and a record of
the settings that matter. From those files it can rebuild a fresh machine,
audit the current one, and report drift.

Context (October 2026, re-verify): WinGet ships with current Windows 10/11 as
App Installer. `winget configure` needs WinGet 1.6.2631 or later; the v3
configuration schema (DSC v3, `dscv3` processor) needs WinGet 1.11 or later.
`winget configure export` is newer than `configure` itself; confirm it with
`winget configure export --help` before relying on it. Syntax detail lives in
`references/winget-configuration.md`; check Microsoft Learn when a field or
flag is not listed there.

## Non-negotiables

1. **Capture is read-only.** Exporting, listing and copying settings out of
   their live locations never changes the machine. Say so to the user, and
   keep capture and apply as separate, separately confirmed steps.
2. **Apply goes through `safe-system-changes`.** Rebuilding, importing,
   running `winget configure`, or restoring a settings file over a live one
   changes the machine: dry-run first (`winget configure show` and `test`),
   show the plan, take a restore point where the protocol says to, confirm,
   journal, verify, and offer the revert. Never pass
   `--accept-configuration-agreements` or `--accept-package-agreements` on a
   first run the user has not reviewed.
3. **No secrets in the capture.** Never copy private keys, tokens, saved
   credentials, browser profiles, `.npmrc`/`.pypirc` auth lines, or
   environment variables whose names suggest secrets. Redact before writing
   and record what was redacted. A config repo is often pushed somewhere; act
   as though it will be.
4. **Review a configuration file before running it.** A WinGet Configuration
   file pulls DSC modules from the PowerShell Gallery and can run arbitrary
   script. Read every resource, check every module's publisher, and treat
   any configuration file the user did not write (downloaded, shared, found
   in a repo) as untrusted input → `untrusted-input-handling`.
5. **Declarative beats scripted.** Prefer a resource that can *test* its own
   state (`Microsoft.WinGet/Package`, `Microsoft.Windows/Registry`) over a
   script that only runs. `RunCommandOnSet` always reports "not in desired
   state"; use it only for things nothing else can do, and make the command
   idempotent.
6. **Elevate only what needs it.** Mark `securityContext: elevated` per
   resource (HKLM keys, machine-scope installs, services, Developer Mode).
   Never elevate everything, and never look for a way around the UAC prompt.
7. **Capture means a dated, committed snapshot.** Each capture lands in the
   workspace with a timestamp and a manifest, ideally as a git commit. Drift
   is measured against a known snapshot, never against memory.
8. **Unmanaged software is still inventory.** `winget export` silently drops
   apps it cannot match to a source (it warns on screen). Record them in a
   separate "manual installs" list with where they came from, or the rebuild
   will be quietly incomplete.

## Decision table

| Need | Use |
|---|---|
| Just "reinstall my apps on a new PC" | `winget export` → `winget import` (package list only) |
| Apps **plus** settings, features, registry, repeatable and testable | WinGet Configuration file (`winget configure`) |
| New file, WinGet ≥ 1.11 | v3 schema (`dscv3` processor, native resources, faster test) |
| Existing v2 (`configurationVersion: 0.2.0`) file that works | Keep it; convert to v3 when you next edit it heavily |
| Shell, terminal, editor, git dotfiles | Copy into the workspace; restore by copy (or symlink if Developer Mode is on) |
| A single preference stored in the registry | `Microsoft.Windows/Registry` resource (v3), not a `.reg` import |
| A whole app's registry branch for reference | `reg export` into `captures/`, as evidence, not as the restore path |
| Fonts | Prefer a winget package; otherwise copy files whose licence allows it |
| Is this PC still as captured? | Drift report (`references/drift-report.md`) |

## Workflow

### Capture (read-only)

1. Confirm the workspace layout exists (`references/workspace-layout.md`);
   create a dated capture folder.
2. Inventory packages: `winget export -o <capture>\packages.json
   --accept-source-agreements`. Keep the console warnings; they name the
   unmatched apps for the manual-installs list.
3. Collect dotfiles and settings from their live locations
   (`references/capture-inventory.md` has the location table), redacting as
   you go.
4. Record shell state: PowerShell modules, profile files for both PowerShell
   7 and Windows PowerShell 5.1, environment variables (names and non-secret
   values), WSL distributions, optional features (read-only queries; some need
   an elevated shell to read, which is still read-only).
5. Write `manifest.md`: machine name, Windows build, WinGet version, date,
   what was captured, what was redacted, what was skipped and why.
6. Offer to commit. Never push without being asked.

### Author or refresh the configuration file

1. Start from the package list: one `Microsoft.WinGet/Package` per app the
   user actually wants (prune drivers, runtimes pulled in by other apps,
   and vendor utilities that a fresh machine will bring itself).
2. Add settings as native resources where they exist; fall back to adapted
   modules (`Microsoft.Windows.Developer/*`, `Microsoft.Windows.Settings/*`)
   with an explicit module-install step in v3.
3. Run `winget configure validate -f <file>`; then `winget configure show
   -f <file>` so the user sees exactly what will be pulled and run.

### Rebuild or apply (changes the machine)

Follow `references/rebuild-procedure.md`: preconditions, `test` first, the
plan shown to the user, the safe-system-changes protocol, apply in phases
(packages → settings → dotfiles), verify with `test` again and a fresh drift
report.

### Audit and drift

Capture the live state into a scratch folder (never over the last snapshot),
compare, and write a dated drift report with Added / Removed / Changed /
Unmanaged sections and a suggested action for each line. The user decides
whether drift is adopted into the config or reverted on the machine.

## High-frequency pitfalls

- **Running a shared configuration file because it "looks fine".** It can
  install any Gallery module and run script elevated. Read it all.
- **Treating `winget export` as complete.** Store apps, portable tools,
  manually downloaded installers and anything with mismatched metadata may
  be missing. Cross-check against Apps & Features or the Uninstall registry
  keys.
- **`--include-versions` everywhere.** Pinning every version makes the
  rebuild install stale, sometimes vulnerable, builds. Pin only what must be
  pinned and say why in a comment.
- **Profile path assumptions.** `Documents` is often redirected to OneDrive,
  and PowerShell 7 (`Documents\PowerShell`) and Windows PowerShell 5.1
  (`Documents\WindowsPowerShell`) keep separate profiles. Resolve paths with
  `$PROFILE` and `[Environment]::GetFolderPath('MyDocuments')`.
- **Several Windows Terminal installs.** Stable, Preview, Canary and
  unpackaged each keep their own `settings.json`. Capture the one in use.
- **v2 habits in a v3 file.** v3 does not auto-install PowerShell modules for
  adapted resources, uses `type`/`name`/`properties` instead of
  `resource`/`id`/`settings`, and puts resources at the document root.
- **Restoring settings over a running app.** Terminal and editors rewrite
  their settings on exit; close them first or the restore is lost.
- **Symlinked dotfiles without Developer Mode.** Creating symlinks needs
  Developer Mode or elevation; default to copy plus a sync step.
- **Capturing secrets by accident.** `env` dumps, `.gitconfig` credential
  sections with inline tokens, SSH folders, terminal profiles with
  passwords in the command line. Redact and log the redaction.
- **Drift noise.** Volatile files (window positions, recent-file lists,
  telemetry IDs) make every report red. Keep an ignore list in the
  workspace.

## How to verify

- A capture is good when `manifest.md` lists every artefact, each named file
  exists and is non-empty, `packages.json` parses as JSON, and a redaction
  scan (`references/capture-inventory.md`) finds nothing.
- A configuration file is good when `winget configure validate` passes and
  `winget configure show` lists exactly the resources you expect.
- A rebuild is done when `winget configure test -f <file>` reports every
  testable resource in the desired state and a fresh drift report against the
  capture shows only expected differences. `RunCommandOnSet` resources will
  always show as not in desired state; check their effect directly.
- Never report "machine matches config" from reading the file. Run `test`
  and the drift comparison and quote the result.

## Reference index

Load on demand:

- `references/capture-inventory.md` — what to capture, where each item lives
  on Windows, the read-only commands, and the redaction rules and scan.
- `references/winget-configuration.md` — export/import flags, the v2 (0.2)
  and v3 (dscv3) file formats, resource types, elevation, the
  `configure show/test/validate/export` subcommands, and the trust review.
- `references/workspace-layout.md` — folder scheme, file naming, manifest
  template, git hygiene, and what never goes in the repo.
- `references/rebuild-procedure.md` — phased rebuild of a fresh or existing
  PC, the dry-run and confirm points, verification, and rollback.
- `references/drift-report.md` — comparing live state with a snapshot, the
  PowerShell recipes, the ignore list, and the report template.
- `references/worked-example.md` — a fictional capture, configuration file
  and drift report end to end.

## Boundaries

- **The change protocol itself** (restore points, journal, confirm, revert)
  → `safe-system-changes`. This skill decides *what* to apply; that one
  governs *how* any change is made.
- **Configuration files, modules or settings from someone else** →
  `untrusted-input-handling`.
- **General Windows administration** (services, scheduled tasks, startup,
  Windows Update) → `windows-administration`; **registry tweaks and debloat
  with risk ratings** → `windows-performance-tuning`; **reviewing what is
  installed for risk** → `windows-security-hygiene`.
- **Writing the PowerShell itself** (profiles, capture scripts, modules) →
  `powershell-development`.
- **WSL distributions' internal Linux config** → `linux-administration` /
  `linux-development`.
- **Version control of the workspace** → `git-workflow`.
- **Unattended scheduled captures** → `scheduled-run-discipline`.
- **Checking a WinGet or DSC field against current docs** →
  `read-the-damn-docs`.
