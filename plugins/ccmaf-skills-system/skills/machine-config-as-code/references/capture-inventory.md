# Capture inventory

Everything in this file is **read-only**. Copy *out of* live locations into
the capture folder; never write back. Paths use environment variables so the
same recipe works for any user. Verify each path exists before copying and
record anything missing in the manifest rather than failing silently.

## What to capture, and where it lives

| Item | Live location (Windows 10/11) | Capture as |
|---|---|---|
| Packages known to winget | `winget export` output | `packages.json` |
| Apps winget cannot match | export warnings; Uninstall keys (below) | `manual-installs.md` |
| PowerShell 7 profile | `$PROFILE` in `pwsh` (usually `Documents\PowerShell\Microsoft.PowerShell_profile.ps1`) | `dotfiles/powershell/` |
| Windows PowerShell 5.1 profile | `$PROFILE` in `powershell.exe` (`Documents\WindowsPowerShell\...`) | `dotfiles/windowspowershell/` |
| All four profile scopes | `$PROFILE | Select-Object *` lists AllUsersAllHosts, AllUsersCurrentHost, CurrentUserAllHosts, CurrentUserCurrentHost | note which exist |
| PowerShell modules | `Get-InstalledPSResource` (PSResourceGet) or `Get-InstalledModule` (PowerShellGet) | `powershell-modules.csv` |
| Windows Terminal (stable) | `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` | `dotfiles/windows-terminal/settings.json` |
| Windows Terminal (preview / canary) | same pattern with `WindowsTerminalPreview_` / `WindowsTerminalCanary_` | capture only the one in use |
| Windows Terminal (unpackaged) | `%LOCALAPPDATA%\Microsoft\Windows Terminal\settings.json` | as above |
| Terminal fragments | `%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\` | list only (apps own them) |
| VS Code settings | `%APPDATA%\Code\User\settings.json`, `keybindings.json`, `snippets\` | `dotfiles/vscode/` |
| VS Code extensions | `code --list-extensions` (add `--show-versions` for audit) | `vscode-extensions.txt` |
| Git | `%USERPROFILE%\.gitconfig`, global ignore file it names | `dotfiles/git/` (redact) |
| SSH client config | `%USERPROFILE%\.ssh\config` only | `dotfiles/ssh/config` (redact hostnames if asked) |
| Fonts (per user) | `%LOCALAPPDATA%\Microsoft\Windows\Fonts` and `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts` | `fonts.md` (names, source, licence) |
| Fonts (machine) | `%WINDIR%\Fonts` and `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts` | list non-default ones only |
| User environment variables | `[Environment]::GetEnvironmentVariables('User')` | `env-user.md` (redacted) |
| User PATH entries | `[Environment]::GetEnvironmentVariable('Path','User') -split ';'` | in `env-user.md` |
| WSL distributions | `wsl --list --verbose` | `wsl.txt` |
| Optional features | `Get-WindowsOptionalFeature -Online \| Where-Object State -eq Enabled` (needs elevated shell to read) | `optional-features.txt` |
| Chosen registry preferences | `reg query` / `Get-ItemProperty` on named values | `registry-prefs.md` |
| An app's whole registry branch (evidence) | `reg export "HKCU\Software\<Vendor>\<App>" <file>.reg` | `captures/<date>/registry/` |

The per-user font folder and its HKCU key are observed behaviour on Windows
10 1809 and later, not a documented contract; confirm on the machine.

Per-user font install is the default when a user right-clicks a font and
chooses "Install"; "Install for all users" goes to `%WINDIR%\Fonts`.

## Things never captured

- `%USERPROFILE%\.ssh\id_*` and any private key, `.pfx`, `.p12`, `.kdbx`.
- Browser profiles, cookies, saved passwords, Windows Credential Manager.
- Token-bearing files: `.npmrc` `_authToken` lines, `.pypirc` passwords,
  `.git-credentials`, cloud CLI caches (`.azure`, `.aws\credentials`,
  `.kube\config` contexts with embedded tokens).
- Terminal profiles whose `commandline` embeds a password or token.
- Licence keys and product keys.

If a file mixes useful settings with a secret, copy it and replace the secret
value with `<REDACTED: reason>`. Log each redaction in the manifest.

## Read-only command recipes

```powershell
# Package list (source agreements accepted only for the read; nothing installs)
winget export -o "$cap\packages.json" --accept-source-agreements

# Apps Windows knows about, for cross-checking the export (read-only)
$keys = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
Get-ItemProperty $keys -ErrorAction SilentlyContinue |
  Where-Object DisplayName |
  Select-Object DisplayName, DisplayVersion, Publisher |
  Sort-Object DisplayName |
  Export-Csv "$cap\installed-programs.csv" -NoTypeInformation

# PowerShell modules
Get-InstalledPSResource | Select-Object Name, Version, Repository |
  Export-Csv "$cap\powershell-modules.csv" -NoTypeInformation

# Documents folder, honouring OneDrive redirection
[Environment]::GetFolderPath('MyDocuments')
```

`Get-InstalledPSResource` is in PSResourceGet (bundled with PowerShell 7.4
and later). On older shells use `Get-InstalledModule`. Mark which one you
used in the manifest.

To build `manual-installs.md`: names in `installed-programs.csv` that have no
matching package in `packages.json`, minus Windows components, drivers and
runtimes the user does not care about. Ask the user to fill in where each
came from (vendor site, store, internal share) — never guess a download URL.

## Redaction scan

Run before declaring the capture done. It is a heuristic, not a guarantee;
read the hits.

```powershell
$pattern = '(?i)(password|passwd|secret|token|apikey|api_key|bearer|' +
           'authorization|client_secret|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
Get-ChildItem $cap -Recurse -File |
  Select-String -Pattern $pattern |
  Select-Object Path, LineNumber, Line
```

Environment variables: keep names, drop values whose name matches the
pattern above, and drop any value longer than about 40 characters of
unbroken base64-like text. Note each drop in the manifest.

## Volatile content to strip or ignore

Window positions and sizes, "recently opened" lists, last-update timestamps,
telemetry or machine IDs, cached tokens in editor state files. Prefer not to
capture state files at all (VS Code `globalStorage`, Terminal `state.json`);
capture the settings file only.
