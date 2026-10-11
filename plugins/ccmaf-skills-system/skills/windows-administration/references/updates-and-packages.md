# Windows Update and packages

## Support status first

Before any update work, establish whether the OS still receives fixes:

```powershell
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber, WindowsVersion
```

- Windows 11: check the feature update (23H2/24H2/25H2) against Microsoft's
  lifecycle pages; Home/Pro feature updates get 24 months of servicing.
- Windows 10 22H2: out of support since 14 October 2025 unless enrolled in
  ESU (Settings > Windows Update shows the enrolment). Say plainly that an
  un-enrolled machine is not receiving security fixes, and that the consumer
  ESU year ends 13 October 2026.

## Update history and state

```powershell
# History through the Windows Update Agent COM API (works in 5.1 and 7.x)
$session  = New-Object -ComObject Microsoft.Update.Session
$searcher = $session.CreateUpdateSearcher()
$count    = $searcher.GetTotalHistoryCount()
$searcher.QueryHistory(0, [Math]::Min($count, 50)) |
    Select-Object Date, Title,
        @{n='Result'; e={ switch ($_.ResultCode) { 1 {'InProgress'} 2 {'Succeeded'} 3 {'SucceededWithErrors'} 4 {'Failed'} 5 {'Aborted'} default {$_} } }},
        @{n='HResult'; e={ '0x{0:X8}' -f $_.HResult }}

# Installed hotfixes (a partial view: QFE entries only)
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10

# Update client events in the System log
Get-WinEvent -FilterHashtable @{ LogName = 'System';
    ProviderName = 'Microsoft-Windows-WindowsUpdateClient'; Id = 19, 20 } -MaxEvents 20
```

Event 19 = installation succeeded, 20 = installation failed (the message
carries the error code). For a readable Windows Update log,
`Get-WindowsUpdateLog` merges the ETL traces into `WindowsUpdate.log` on the
desktop (read-only; it writes one file).

### Is a reboot pending?

```powershell
$pending = [ordered]@{
  WindowsUpdate = Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
  CBS           = Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'
  FileRename    = $null -ne (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction SilentlyContinue)
}
[pscustomobject]$pending
```

Any `True` means a restart is needed before further servicing or driver
work. `PendingFileRenameOperations` is also set by ordinary installers, so it
alone is weaker evidence. Rebooting is a change: tell the user, let them save
work, and let them choose the time.

### When updates fail

Diagnosis (event 20, error code, `CBS.log` at `%windir%\Logs\CBS\CBS.log`)
belongs to `windows-diagnostics`. Standard repairs, each a change under
`safe-system-changes`:

1. Restart, then retry from Settings.
2. Settings > System > Troubleshoot > Other troubleshooters > Windows Update
   (where present on the build).
3. `DISM /Online /Cleanup-Image /RestoreHealth`, then `sfc /scannow`
   (elevated; DISM first so SFC repairs from a healthy store).
4. Windows 11: Settings > System > Recovery > "Fix problems using Windows
   Update" reinstalls the current version, keeping apps and files.

Do **not** delete `C:\Windows\SoftwareDistribution` or `catroot2` as a first
move; those resets are last-resort steps with their own risks.

Pausing updates is fine as a short, explicit, user-chosen action through
Settings. Disabling the `wuauserv` service, blocking update hosts or using
"update blocker" tools is out of bounds.

## Drivers through Windows Update

Optional driver updates appear under Settings > Windows Update > Advanced
options > Optional updates. Prefer these or the PC/device maker's own tool
over third-party "driver updater" utilities. Inventory and rollback are in
`windows-diagnostics` (`drivers-and-devices.md`).

## winget

`winget` ships with the App Installer package on Windows 11 and current
Windows 10. If a fresh profile reports it missing, App Installer may not yet
be registered for that user; updating App Installer from the Store fixes it.

```powershell
winget --version
winget list                                  # everything installed (winget + ARP + Store)
winget upgrade                               # PREVIEW: what would upgrade
winget list --upgrade-available              # same idea as a list (newer winget)
winget show --id Example.App -e              # what a package is, publisher, installer
winget upgrade --id Example.App -e           # one app, exact ID match
winget pin list
winget pin add --id Example.App              # exclude from upgrade --all
winget pin add --id Example.App --blocking   # block all upgrades until unpinned
winget export -o "$env:USERPROFILE\journal\winget-before.json"
```

Rules:

- **Always preview** with `winget upgrade` before `winget upgrade --all`,
  and show the user the list. `--all` skips pinned packages unless
  `--include-pinned` is passed; packages with unknown versions need
  `--include-unknown`.
- **Match exactly**: use `--id <Id> -e` (`--exact`) so a fuzzy name never
  installs the wrong package.
- **Check the publisher** with `winget show` before installing anything new;
  the community repository is moderated, not guaranteed.
- `--accept-package-agreements` / `--accept-source-agreements` /
  `--disable-interactivity` are for runs the user has already approved
  (for example inside a confirmed `safe-system-changes` plan), not a way to
  skip their consent.
- Export the installed list before bulk changes; `winget import` is the
  rebuild path (and `machine-config-as-code` owns full machine capture with
  `winget configure`).
- Uninstalls (`winget uninstall --id X -e`) are removals: confirm, and note
  that app data under `%APPDATA%` / `%LOCALAPPDATA%` usually survives.
- Some upgrades restart the app or need a reboot; `--allow-reboot` should be
  used only when the user has agreed to a reboot.
