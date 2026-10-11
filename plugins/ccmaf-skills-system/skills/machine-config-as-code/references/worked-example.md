# Worked example (fictional)

A user with a home studio PC, STUDIO-PC, asks: "Back up my setup so I can
rebuild this machine, and tell me next month what has changed." Every name
below is invented.

## 1. Capture (read-only)

The session says up front: capture only reads; nothing on the machine
changes. Then:

```powershell
$ws  = 'D:\workspaces\studio-pc'
$cap = Join-Path $ws ('captures\' + (Get-Date -Format 'yyyy-MM-ddTHHmm'))
New-Item -ItemType Directory -Path $cap -Force | Out-Null   # inside the workspace only

winget export -o "$cap\packages.json" --accept-source-agreements
```

WinGet warns that three installed apps have no matching source: a vendor
audio driver panel, a fictional "Lumen Photo Tagger" and a game launcher.
They go into `lists\manual-installs.md` with the user's answer about where
each came from.

Dotfiles are copied from their live locations: the PowerShell 7 profile
(resolved via `$PROFILE`, which turns out to sit under OneDrive\Documents),
the Windows Terminal stable `settings.json`, VS Code `settings.json` and the
extension list, and `.gitconfig`. The Windows PowerShell 5.1 profile does
not exist; the manifest says so.

The redaction scan finds one hit: a user environment variable
`PHOTO_SYNC_TOKEN`. Its value is dropped, the name kept, and the manifest
logs the redaction. The session suggests the user move that token into the
Credential Manager or a secrets store; it does not do it for them.

## 2. Curate intent

From 84 exported packages the user keeps 41 (runtimes, drivers and vendor
helpers are dropped). The session writes `.config\configuration.winget` in
the v3 format because `winget --version` reports 1.11 or later:

```yaml
$schema: https://raw.githubusercontent.com/PowerShell/DSC/main/schemas/2023/08/config/document.json
metadata:
  winget:
    processor:
      identifier: dscv3
resources:
- type: Microsoft.WinGet/Package
  name: PowerShell
  properties: { id: Microsoft.PowerShell, source: winget, useLatest: true }
  metadata: { description: Install PowerShell 7 }

- type: Microsoft.WinGet/Package
  name: Terminal
  properties: { id: Microsoft.WindowsTerminal, source: winget, useLatest: true }
  metadata: { description: Install Windows Terminal }

- type: Microsoft.WinGet/Package
  name: VSCode
  properties: { id: Microsoft.VisualStudioCode, source: winget, useLatest: true }
  metadata: { description: Install Visual Studio Code }

- type: Microsoft.Windows/Registry
  name: ShowFileExtensions
  properties:
    keyPath: HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced
    valueName: HideFileExt
    valueData: { DWord: 0 }
    _exist: true
  metadata: { description: Show file extensions }

- type: Microsoft.Windows/Registry
  name: LongPaths
  properties:
    keyPath: HKLM\SYSTEM\CurrentControlSet\Control\FileSystem
    valueName: LongPathsEnabled
    valueData: { DWord: 1 }
    _exist: true
  metadata:
    winget: { securityContext: elevated }
    description: Enable Win32 long paths
```

(The remaining 38 packages follow the same pattern.) Only the HKLM value is
elevated. Package IDs were confirmed with `winget show --id <id>` rather
than written from memory.

`winget configure validate` passes; `winget configure test` on this same
machine reports every resource already in the desired state, which is the
expected result for a configuration captured from the machine it describes.
The capture and the configuration are committed as two commits.

## 3. A month later: drift

The user asks "what has changed?". The session captures live state into
`drift\.scratch\2026-11-12T0800`, compares with the October capture, and
writes `drift\2026-11-12.md`:

```markdown
# Drift report 2026-11-12 — STUDIO-PC
Baseline: captures/2026-10-11T0930 (snapshot)
Summary: 2 added, 1 removed, 1 changed, 1 unmanaged, 1 security-relevant.

## Security-relevant
- New scheduled task "LumenUpdaterHelper" running from %TEMP% → review with
  windows-security-hygiene before deciding anything.

## Added
| Item | Kind | Suggested action |
|---|---|---|
| Example.AudioEditor | package | Adopt? Add to configuration.winget |
| Example.FontPack | package | Adopt? Fonts belong in lists/fonts.md too |

## Removed
| Item | Kind | Suggested action |
|---|---|---|
| Example.OldViewer | package | Removed on purpose? Then drop from config |

## Changed
| Item | What changed | Suggested action |
|---|---|---|
| Terminal settings.json | colour scheme and default profile | Adopt (diff below) |

## Unmanaged
| Item | Source | Suggested action |
|---|---|---|
| Lumen Photo Tagger 3.1 | vendor installer (was 3.0) | Update manual-installs.md |
```

The user adopts the audio editor and the Terminal change (the session edits
the workspace files and commits), confirms the removal, and asks for the
scheduled task to be reviewed. Nothing on the machine changed during the
audit.

## 4. Rebuild on a new PC

On the replacement machine the session follows `rebuild-procedure.md`:
preconditions, `validate`/`show`/`test` (nearly everything pending), a plan
table, a restore point and journal entry, then phases: packages (one UAC
prompt, for the long-paths value and machine-scope installs), settings,
dotfiles (Terminal closed first; previous files kept as `.before`), lists,
and finally `manual-installs.md` handed over as a checklist. A final
`test` shows every package and registry resource in the desired state, and
a fresh drift report against the October snapshot shows only expected
differences: machine name and newer package versions.
