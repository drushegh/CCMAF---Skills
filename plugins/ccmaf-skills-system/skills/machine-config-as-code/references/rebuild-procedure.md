# Rebuild procedure

Everything here changes the machine, so the `safe-system-changes` protocol
applies throughout: plan shown first, restore point before the first change
of the run, confirmation at each phase, a journal entry with how to undo,
verification after. This file says *what* to do in which order; that skill
says *how* a change is made safely.

## 0. Preconditions (read-only)

- `winget --version`: 1.6.2631 or later for any `configure`; 1.11 or later
  for a v3 file. If WinGet is older, App Installer needs updating through the
  Store; tell the user rather than side-loading anything.
- Windows build and edition match what the configuration assumes (an
  assertion in v2, a manual check in v3).
- Signed in as the intended user. Profiles, HKCU and per-user installs land
  in whoever runs the command.
- Network and enough free disk (`Get-Volume`).
- Apps whose settings will be restored are closed (Terminal, VS Code).
- The workspace is up to date (`git pull --ff-only` if it lives in a repo)
  and its configuration file is the reviewed, committed version.

## 1. Dry run

```powershell
winget configure validate -f .config\configuration.winget
winget configure show     -f .config\configuration.winget
winget configure test     -f .config\configuration.winget
```

Turn the `test` output into a plan table for the user: resource, current
state, desired state, elevated or not, how to undo. Resources already in
the desired state are listed as "no change". `RunCommandOnSet` lines always
show as pending; say so.

For a package-list-only rebuild, the dry run is reading `packages.json`
against `winget list` and showing what is missing.

## 2. Restore point and journal

Per `safe-system-changes`: create the restore point (or record why one
cannot be made), open a journal entry in `journal/` with the plan, and get
the user's go-ahead for phase 3.

## 3. Apply in phases

Phases keep failures small and the undo clear. Confirm before each.

1. **Packages.** Either `winget configure -f` on a packages-only file, or
   `winget import -i lists\packages.json --no-upgrade`. Expect one UAC prompt
   if any resource is elevated. Do not add
   `--accept-package-agreements` unless the user has said they accept the
   licences; otherwise let WinGet prompt.
2. **System settings.** The settings resources (registry, Developer Mode,
   Explorer, long paths). Keep these in their own file if possible so they
   can be applied and reverted on their own.
3. **Dotfiles.** Copy from `dotfiles/` to the live locations. Before each
   copy, back the live file up into the journal folder (`settings.json` →
   `journal/2026-10-12/settings.json.before`). Use a copy, or a symlink only
   when Developer Mode is on and the user wants live sync.
4. **Lists.** Extensions (`code --install-extension <id>` per line of
   `vscode-extensions.txt`), PowerShell modules (`Install-PSResource`),
   fonts (winget packages first; copy only licensed files), WSL distributions.
5. **Manual installs.** Hand the user `manual-installs.md` as a checklist.
   Never download installers from guessed URLs.

If a phase fails, stop, record the failure in the journal, and ask. Do not
retry in a loop or skip ahead.

## 4. Verify

- `winget configure test -f .config\configuration.winget` again: every
  testable resource should be in the desired state.
- Open the restored apps and confirm they read their settings (Terminal
  shows the expected default profile and font; the PowerShell profile loads
  without errors: `pwsh -NoLogo -Command '$PROFILE; exit'` and watch for
  errors at start-up).
- Take a fresh capture into a scratch folder and run the drift comparison
  against the snapshot that was rebuilt from. Expected differences (new
  machine name, newer package versions) go in the journal; anything else is
  a finding.

## 5. Close out

Finish the journal entry: what changed, what failed, what the user still
has to do by hand, and how to revert each phase (uninstall list for
packages, the registry values' previous data, the `.before` copies of
dotfiles, the restore point name). Offer to commit the journal.

## Rolling back

| Phase | Revert |
|---|---|
| Packages | `winget uninstall --id <id>` for each newly installed package, from the journal list; confirm each |
| Registry settings | Re-apply the previous values recorded in the journal (or a `_exist: false` resource for values that did not exist before) |
| Dotfiles | Copy the `.before` files back |
| Everything | System Restore to the point made in step 2, as the last resort, after telling the user what it will and will not undo |

## Existing machine versus fresh machine

On a fresh machine the dry run will show nearly everything pending, and that
is fine. On a lived-in machine, a full apply can overwrite deliberate local
changes: run the drift report first, and let the user decide per line
whether the machine or the config is right before applying anything.
