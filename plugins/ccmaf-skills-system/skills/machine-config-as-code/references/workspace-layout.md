# Workspace layout

One machine, one folder. A user with several PCs keeps one workspace per
machine, or one repo with a folder per machine plus a `shared/` folder for
what they have in common. Keep it boring and predictable: the next session
(or the next person) must find things without being told.

## Folder scheme

```text
<workspace>/
  README.md                    # what this is, how to capture, how to rebuild
  .config/
    configuration.winget       # the desired state (hand-curated)
  dotfiles/
    powershell/Microsoft.PowerShell_profile.ps1
    windowspowershell/Microsoft.PowerShell_profile.ps1
    windows-terminal/settings.json
    vscode/settings.json
    vscode/keybindings.json
    git/.gitconfig
    ssh/config
  lists/
    packages.json               # curated winget export (pruned), for import
    vscode-extensions.txt
    powershell-modules.csv
    fonts.md
    manual-installs.md          # apps winget cannot install, with their source
  captures/
    2026-10-11T0930/            # raw, dated, never edited after the fact
      manifest.md
      packages.json
      installed-programs.csv
      env-user.md
      wsl.txt
      optional-features.txt
      registry/
  drift/
    2026-11-02.md               # one report per audit
  journal/
    2026-10-12-rebuild.md       # change journal entries (safe-system-changes)
  drift-ignore.txt              # paths and keys excluded from drift
```

The split matters:

- `captures/` is **evidence**: what the machine looked like on a date. Never
  edit a capture after the fact; take a new one.
- `.config/`, `dotfiles/` and `lists/` are **intent**: what the user wants.
  They are edited deliberately, usually by promoting items from a capture.
- `drift/` and `journal/` are **history**: what differed and what was done.

## File naming

- Timestamps are ISO 8601 with no colons (`2026-10-11T0930`) so they sort and
  are valid Windows file names.
- Keep app-native file names inside `dotfiles/` (`settings.json`,
  `.gitconfig`) so a restore is a straight copy.
- One configuration file per purpose if it grows large
  (`.config/base.winget`, `.config/dev-tools.winget`); keep `configuration.winget`
  as the default the README points at.

## Capture manifest template

```markdown
# Capture 2026-10-11T0930

- Machine: STUDIO-PC (fictional)   Windows: 11 24H2, build 26100.xxxx
- WinGet: v1.x.y   PowerShell: 7.x / 5.1   Captured by: <session or person>
- Scope: packages, dotfiles, modules, env (user), WSL, optional features

| Artefact | File | Notes |
|---|---|---|
| Packages | packages.json | 84 packages; 6 unmatched → manual-installs.md |
| Terminal | ../../dotfiles/windows-terminal/settings.json | stable install |

## Redactions
- env-user.md: GITHUB_TOKEN value removed (name kept)
- .gitconfig: [credential] helper line kept, no token present

## Skipped
- Optional features: shell not elevated; re-run elevated to include
```

## Git hygiene

- Commit each capture as its own commit (`capture: 2026-10-11T0930`) and each
  intent change separately (`config: add Microsoft.PowerToys`). Drift
  reports and journals can go with the change they explain.
- `.gitignore` the obvious secret carriers even though capture should never
  write them: `*.pfx`, `*.p12`, `*.kdbx`, `id_*`, `.git-credentials`, `.env`.
- Run the redaction scan from `capture-inventory.md` before every commit.
- Ask before pushing, and before making a remote public. A private remote
  is still a copy of the user's machine profile.

## What never goes in the workspace

Secrets (see `capture-inventory.md`), licence keys, other people's data,
installer binaries (record the source instead), and font files whose licence
does not allow redistribution (record name and source instead).

## README essentials

Three short sections: what the folder represents (one machine, which one),
how to capture (the command or the request to make), and how to rebuild
(the phased procedure, with the warning that apply changes the machine and
follows the safe-system-changes protocol).
