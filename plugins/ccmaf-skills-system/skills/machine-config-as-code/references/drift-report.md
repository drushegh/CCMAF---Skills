# Drift report

Drift is the difference between the last committed snapshot (or the
desired-state files) and the live machine. The report is read-only: it
describes and suggests, and the user decides. Adopting drift means editing
the workspace; reverting drift means changing the machine, which goes
through `safe-system-changes`.

## Two baselines, two questions

| Compare live state with | Answers |
|---|---|
| The latest `captures/<date>/` | "What changed on this PC since I last looked?" |
| `.config/`, `dotfiles/`, `lists/` (intent) | "Does this PC still match what I want?" |

Say which one a report uses in its first line. Mixing them produces a
report nobody can act on.

## Procedure

1. Take a fresh capture into a scratch folder (`drift/.scratch/<date>/`),
   using the read-only recipes in `capture-inventory.md`. Never overwrite the
   baseline.
2. Compare each artefact class (recipes below).
3. Drop anything matched by `drift-ignore.txt`.
4. Write `drift/<date>.md` from the template, newest first, with a suggested
   action per line.
5. Delete the scratch folder, or keep it as a new capture if the user wants
   one (then move it into `captures/` unedited).

For a desired-state check of a configuration file, the quickest signal is
`winget configure test -f .config\configuration.winget`; it reports per
resource whether the machine is in the desired state. Use it alongside the
file comparisons, not instead of them: it knows nothing about dotfiles or
unmanaged apps.

## Comparison recipes (PowerShell, read-only)

Packages:

```powershell
function Get-PackageIds($path) {
  (Get-Content $path -Raw | ConvertFrom-Json).Sources.Packages.PackageIdentifier |
    Sort-Object -Unique
}
$base = Get-PackageIds "$baseline\packages.json"
$live = Get-PackageIds "$scratch\packages.json"
Compare-Object $base $live |
  ForEach-Object {
    [pscustomobject]@{
      Package = $_.InputObject
      Change  = if ($_.SideIndicator -eq '=>') { 'Added' } else { 'Removed' }
    }
  }
```

For version drift, export both sides with `--include-versions` and compare
`PackageIdentifier` plus `Version`; report upgrades separately from
installs and removals, because upgrades are usually expected.

Settings files:

```powershell
$pairs = @(
  @{ Name = 'Terminal'; Base = "$ws\dotfiles\windows-terminal\settings.json"
     Live = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json" }
)
foreach ($p in $pairs) {
  if (-not (Test-Path $p.Live)) { "$($p.Name): missing on machine"; continue }
  if ((Get-FileHash $p.Base).Hash -ne (Get-FileHash $p.Live).Hash) {
    "$($p.Name): changed"
    git diff --no-index --stat -- $p.Base $p.Live
  }
}
```

`git diff --no-index` works on any two paths, inside a repo or not, and
gives the user a readable diff to decide on. For JSON with volatile keys,
compare after removing ignored keys rather than raw hashes.

Lists (extensions, modules, fonts, PATH entries, WSL distributions,
optional features): treat each as a set of names and use the same
`Compare-Object` pattern as packages.

Unmanaged apps: compare `installed-programs.csv` names against the
baseline's; anything new that is not in `packages.json` belongs in the
"Unmanaged" section, with a note on whether winget can manage it (try
`winget list --name "<name>"` to see whether a source matches).

## Ignore list

`drift-ignore.txt`, one rule per line, comment lines start with `#`:

```text
# volatile settings keys (JSON path within a file)
windows-terminal/settings.json : $.initialPosition
vscode/settings.json : $.window.zoomLevel
# packages that auto-update or are pulled in by others
package : Microsoft.VCRedist.*
package : Microsoft.WindowsAppRuntime.*
```

Keep the list short and explained. An ignore rule hides drift for good;
review it when the report seems suspiciously quiet.

## Report template

```markdown
# Drift report 2026-11-02 — STUDIO-PC
Baseline: captures/2026-10-11T0930 (snapshot)   Live capture: 2026-11-02T0815
Summary: 3 added, 1 removed, 2 changed, 1 unmanaged. No security-relevant items.

## Added
| Item | Kind | Suggested action |
|---|---|---|
| Example.ToolA | package | Adopt: add to lists/packages.json and configuration.winget |

## Removed
| Item | Kind | Suggested action |
|---|---|---|
| Example.ToolB | package | Ask: removed on purpose? If yes, drop from config |

## Changed
| Item | What changed | Suggested action |
|---|---|---|
| Terminal settings.json | default profile, font size 11 → 12 | Adopt (diff below) |

## Unmanaged
| Item | Source | Suggested action |
|---|---|---|
| Example Vendor Utility 4.2 | vendor installer | Add to manual-installs.md |

## Not checked
- Optional features: shell not elevated
```

Write it in plain language. "Terminal font size went from 11 to 12" beats a
raw JSON diff in the summary; keep the diff below for evidence.

## Security-relevant drift

Some changes are not preferences: a new service, a new autorun entry, a new
scheduled task, an unknown app in the Uninstall keys, a Defender exclusion.
Flag these at the top of the report and hand them to
`windows-security-hygiene` for review rather than suggesting "adopt".
