# Visual effects and safe debloat

## Visual effects

On modern hardware with a working GPU driver, visual effects cost little. If
animations stutter, **check the GPU driver first** (Device Manager, or the
vendor's tool); "Microsoft Basic Display Adapter" means no proper driver and
explains the lag better than any setting.

Supported controls, preferred over registry edits:

| Control | Where | Effect | Undo |
|---|---|---|---|
| Animation effects | Settings > Accessibility > Visual effects > **Animation effects** | Turns off most window and UI animations | Toggle back on |
| Transparency effects | Settings > Personalisation > Colours > **Transparency effects** (also under Accessibility > Visual effects) | Removes acrylic/mica blur; small GPU saving | Toggle back on |
| Performance Options | `sysdm.cpl` > Advanced > Performance > **Settings** | Per-effect checkboxes; "Adjust for best performance" turns all off | Choose "Let Windows choose what's best for my computer", or re-tick the recorded boxes |

Before changing Performance Options, **record which boxes were ticked**
(screenshot into the workspace): that is the revert. "Adjust for best
performance" also turns off font smoothing, which makes text look worse; most
users want to keep "Smooth edges of screen fonts" and "Show thumbnails instead
of icons".

The registry-backed transparency setting is catalogue entry PT-01, for
scripted or remote application only.

## Safe debloat

"Debloat" here means removing preinstalled apps the user does not want, using
supported mechanisms, one decision at a time. It does **not** mean running a
script from the internet, removing Windows components, or stripping services.

### Decide with the user

List what is installed for the current user:

```powershell
Get-AppxPackage | Where-Object { -not $_.IsFramework -and -not $_.NonRemovable } |
  Sort-Object Name | Select-Object Name, PackageFullName, Publisher
```

`NonRemovable` = True means a system app that cannot be removed; leave it.
`IsFramework` packages (runtimes, VCLibs, .NET native, UI frameworks) are
dependencies; never remove them.

Agree a removal list in plain terms ("the news app, the solitaire game, the
Xbox app you never use"). Typical safe candidates are consumer extras such as
news, weather, games, and trial or promotional apps. Leave anything the user
might want later if unsure: removal is only cheap to undo while the Store
works.

### Remove (the order matters)

1. **Prefer the UI:** Start > right-click > Uninstall, or Settings > Apps >
   Installed apps > Uninstall. Equivalent: `winget uninstall --id <id>` when
   winget lists the app.
2. PowerShell for the current user:

```powershell
Get-AppxPackage -Name 'Microsoft.BingWeather' | Remove-AppxPackage
```

3. All users (elevated), only when the user wants it gone for every account:

```powershell
Get-AppxPackage -AllUsers -Name 'Microsoft.BingWeather' | Remove-AppxPackage -AllUsers
```

4. New accounts (deprovision; elevated). Documented behaviour: this stops the
   app being installed for **new** user accounts and does not remove it from
   existing ones, so pair it with step 2 or 3:

```powershell
Get-AppxProvisionedPackage -Online |
  Where-Object DisplayName -eq 'Microsoft.BingWeather' |
  ForEach-Object { Remove-AppxProvisionedPackage -Online -PackageName $_.PackageName }
```

Journal the exact package names removed and the scope (current user, all
users, provisioned).

### Reinstall (the revert)

Reinstall from the **Microsoft Store** (or `winget install` with the Store
source / package id) for the user who wants it back. Deprovisioned apps do
not come back by themselves. Microsoft notes that removing an Appx package
can be irreversible in some cases, so confirm the Store lists the app before
removing it if the user might want it back.

### Enterprise and Education: policy-based removal

On Windows 11 Enterprise or Education (25H2, and 24H2 with the relevant
updates), the supported way to keep inbox apps removed is the **"Remove Default
Microsoft Store packages from the system"** policy (Computer Configuration >
Administrative Templates > Windows Components > App Package Deployment). It
uses a curated list plus optional package family names, applies at sign-in,
and records events in `AppxDeployment-Server/Operational`. Not available on
Home or Pro. Removed apps are not reinstalled by un-ticking the policy; they
must be reprovisioned (Store, ISO, management tools). On a work device, this
is IT's decision.

### Never remove

- **Microsoft Store** (removal is unsupported and breaks app updates).
- Framework and runtime packages, `Microsoft.VCLibs*`, `Microsoft.NET.Native*`,
  `Microsoft.UI.Xaml*`, App Installer (provides winget).
- Windows Security, Settings, Start, shell experience hosts and anything
  marked `NonRemovable`.
- Photos, Notepad, Calculator, Terminal and other default handlers unless the
  user has a replacement set as default (Microsoft flags default handlers as
  degrading the experience if removed).
- OneDrive or Edge by script: uninstall through Settings if the user wants,
  understanding what they lose (Edge is also the WebView2 host for some apps;
  WebView2 Runtime itself must stay).

### Optional Windows features

`Get-WindowsOptionalFeature -Online` lists features; disabling unused ones
(for example a legacy component the user never uses) rarely changes
performance. Treat it as housekeeping, one feature at a time, with
`Enable-WindowsOptionalFeature` as the recorded undo. Never disable features
other software depends on (Hyper-V platform for WSL2 or Docker, .NET
Framework 3.5/4.x for older apps) without checking.
