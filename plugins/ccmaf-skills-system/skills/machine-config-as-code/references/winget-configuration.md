# WinGet: export, import and configuration files

Checked against Microsoft Learn (WinGet `export`, `import`, `configure`
command pages; "How to author a WinGet Configuration file"; "WinGet
Configuration file v3 schema reference") in October 2026. WinGet moves
quickly: run `winget <command> --help` on the target machine and trust that
over this file when they disagree.

## Package list: export and import

```powershell
winget export -o packages.json                    # all matchable installed apps
winget export -o packages.json -s winget          # only the winget source
winget export -o packages.json --include-versions # pin current versions (use sparingly)

winget import -i packages.json                    # installs, serially
winget import -i packages.json --ignore-unavailable --no-upgrade
```

| Flag | Command | Meaning |
|---|---|---|
| `-o, --output` | export | Path of the JSON file to write |
| `-s, --source` | export | Export only packages from one source |
| `--include-versions` | export | Record installed versions; import otherwise installs latest |
| `--accept-source-agreements` | both | Accept source terms without a prompt |
| `-i, --import-file` | import | JSON file to install from |
| `--ignore-unavailable` | import | Do not error on packages that cannot be found |
| `--ignore-versions` | import | Ignore pinned versions and install latest |
| `--no-upgrade` | import | Skip packages already installed rather than upgrading them |
| `--accept-package-agreements` | import | Accept package licences without a prompt |

The JSON has `Sources[]`, each with `SourceDetails` and `Packages[]` of
`{ "PackageIdentifier": "...", "Version": "..." }` (version optional). Schema:
`github.com/microsoft/winget-cli` under `schemas/JSON/packages`. Edit the
file freely to prune apps.

`import` is a one-way install list: no settings, no tests, no removals. When
the user wants anything beyond "these apps", use a configuration file.

## Configuration files: which schema

| | v2 ("0.2") | v3 (DSC v3) |
|---|---|---|
| WinGet needed | 1.6.2631+ | 1.11+ with the `dscv3` processor (WinGet installs `Microsoft.DesiredStateConfiguration` itself) |
| Root | `properties:` with `assertions`, `resources`, `configurationVersion` | `$schema`, `metadata`, `resources` at document root |
| Resource fields | `resource`, `id`, `directives`, `settings`, `dependsOn` | `type`, `name`, `properties`, `metadata`, `dependsOn` |
| Package resource | `Microsoft.WinGet.DSC/WinGetPackage` | `Microsoft.WinGet/Package` |
| Registry | `PSDscResources/Registry` (adapted, slow) | `Microsoft.Windows/Registry` (native, fast) |
| PowerShell modules for resources | Installed automatically from the Gallery | **Not** installed automatically: add a `RunCommandOnSet` install step |
| Elevation | `directives: securityContext: elevated` | `metadata: winget: securityContext: elevated` |

File naming: `.winget` extension (for example `configuration.winget`); in a
repository the default file sits at `./.config/configuration.winget`. Older
samples use `configuration.dsc.yaml`; both are accepted by `-f`.

## v3 skeleton

```yaml
$schema: https://raw.githubusercontent.com/PowerShell/DSC/main/schemas/2023/08/config/document.json
metadata:
  winget:
    processor:
      identifier: dscv3
resources:
- type: Microsoft.WinGet/Package
  name: PowerShell
  properties:
    id: Microsoft.PowerShell
    source: winget
    useLatest: true
  metadata:
    description: Install PowerShell 7

- type: Microsoft.Windows/Registry
  name: ShowFileExtensions
  properties:
    keyPath: HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced
    valueName: HideFileExt
    valueData:
      DWord: 0
    _exist: true
  metadata:
    description: Show file extensions in Explorer
```

The `2023/08` schema URL was current when Microsoft wrote the reference; a
newer one may exist under `github.com/PowerShell/DSC/tree/main/schemas`.

`Microsoft.WinGet/Package` properties: `id` and `source` required;
`useLatest` (bool) and `version` (string) optional.

`Microsoft.Windows/Registry` properties: `keyPath` (backslash form, **no
colon**: `HKCU\...`, not `HKCU:\...`), `valueName`, `valueData` as a typed
object (`String`, `DWord`, `QWord`, `ExpandString`, `MultiString`,
`Binary`), and `_exist` (true to ensure present, false to ensure removed).

`Microsoft.DSC.Transitional/RunCommandOnSet`: `executable` (required),
`arguments` as a map with keys `"0"`, `"1"`, ... plus `treatAsArray: true`,
and optional `exitCode`. It has no test, so it always reports "not in
desired state". `Microsoft.DSC.Transitional/PowerShellScript` (pwsh) and
`WindowsPowerShellScript` (5.1) take `getScript`, `testScript`, `setScript`
and *can* report state — prefer them when you need custom logic.

Adapted resources (`Microsoft.Windows.Developer/*`,
`Microsoft.Windows.Settings/*`, `PSDscResources/*`) need their module
installed first in v3. Microsoft's documented pattern is a
`RunCommandOnSet` that runs `Install-PSResource -Name <Module>
-TrustRepository -AcceptLicense` only if `Get-Module -ListAvailable` does not
find it, with the adapted resource listing that step in `dependsOn`. Check
the Gallery with `Find-PSResource -Name <Module>` and add `-Prerelease` only
when no stable version exists. Adapted resources are much slower to test
than native ones; prefer native where one exists.

## v2 skeleton (for files that already exist)

```yaml
# yaml-language-server: $schema=https://aka.ms/configuration-dsc-schema/0.2
properties:
  assertions:
    - resource: Microsoft.Windows.Developer/OsVersion
      directives:
        description: Require Windows 11
        allowPrerelease: true
      settings:
        MinVersion: '10.0.22000'
  resources:
    - resource: Microsoft.WinGet.DSC/WinGetPackage
      id: git
      directives:
        description: Install Git
      settings:
        id: Git.Git
        source: winget
  configurationVersion: 0.2.0
```

In v2, an assertion that returns false makes every resource that
`dependsOn` it skip; the run continues with the rest. `${WinGetConfigRoot}`
expands to the directory of the configuration file, useful for pointing a
resource at a file kept beside it. Microsoft's samples repository
(`aka.ms/winget-samples`) has a v2 to v3 conversion guide.

## Elevation

Elevate per resource, only when required: machine-scope or
`ElevationRequirement: elevationRequired` packages, packages that install a
service, HKLM keys, Developer Mode, long paths, remote desktop, UAC
settings. HKCU keys, Explorer and taskbar preferences do not need it.
WinGet asks for one UAC approval and runs elevated resources in a separate
process. Do not mark everything elevated; Microsoft calls that an
anti-pattern, and it widens what a bad resource can do.

## The `configure` subcommands

```powershell
winget configure validate -f configuration.winget  # syntax and schema
winget configure show     -f configuration.winget  # what it will pull and run
winget configure test     -f configuration.winget  # is the machine in this state? (read-only)
winget configure          -f configuration.winget  # apply (changes the machine)
winget configure list                              # configurations applied before
winget configure export   -o captured.winget --all               # newer builds
winget configure export   -o captured.winget --package-id Git.Git
```

Aliases: `winget configuration`, `winget dsc`. `export` appends to an
existing output file, so write to a new file each time. Useful flags:
`--module-path` (where modules are stored; default
`%LOCALAPPDATA%\Microsoft\WinGet\Configuration\Modules`),
`--accept-configuration-agreements` (skips the review prompt; only for a
file already reviewed and committed), `--disable-interactivity`,
`--verbose-logs`, `--logs` to open the log folder.

Group Policy can disable configuration entirely
(`EnableWindowsPackageManagerConfiguration`); if `configure` reports it is
disabled, say so and stop. Do not try to change the policy.

## Trust review checklist (before any apply)

1. Who wrote this file? If not the user, treat it as untrusted input.
2. List every `type`/`resource`. For each non-Microsoft module, check the
   Gallery page: publisher, download count, source repository, last update.
3. Read every script body (`RunCommandOnSet` arguments, `PowerShellScript`
   blocks, `PSDscResources/Script`). Anything that downloads and executes,
   disables Defender, changes UAC, or adds users is a stop-and-ask.
4. Check every elevated resource actually needs elevation.
5. Run `validate`, then `show`, then `test`, and show the user the output
   before the apply.
