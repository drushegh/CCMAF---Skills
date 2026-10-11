# Packaging and Deployment

Deployment mode is an architectural decision — packaged and unpackaged apps
see different filesystems, update differently and fail differently. Decide
early; retrofitting MSIX onto an app that writes to its install directory
is a bug hunt.

## Choosing a mode

| Need | Choose |
|---|---|
| Clean install/uninstall, auto-update, Store or enterprise (Intune) distribution | **MSIX** (packaged) |
| Full filesystem/registry freedom, custom installer logic, services/drivers | **Unpackaged** + an installer (WiX/Inno Setup) |
| Internal LOB app, per-user install, simple auto-update, no admin rights | **ClickOnce** (WPF/WinForms — legacy but supported) |
| Portable tool, no install at all | **Unpackaged self-contained** xcopy folder |

## MSIX (packaged)

- Identity + manifest (`Package.appxmanifest`) buy clean uninstall,
  App Installer / Store / winget auto-update, and enterprise deployment.
- **Signing is mandatory** — an unsigned MSIX will not install. Sign with a
  certificate the target machines trust (enterprise CA, public code-signing
  certificate, or Azure Trusted Signing for CI; the Store signs for you).
- **The virtualisation gotcha** (top cause of "works in dev, fails
  installed"): the install directory is read-only under
  `C:\Program Files\WindowsApps`, and writes to `AppData`/registry are
  virtualised per-package. Write state to
  `ApplicationData.Current.LocalFolder` (packaged) or
  `Environment.GetFolderPath(SpecialFolder.LocalApplicationData)` +
  app-named subfolder (works in both modes); never write next to the exe.
- Test *installed*, not just F5: package, install the MSIX, run from the
  Start menu. Packaged F5 debugging exists but the installed app is the
  truth for paths, startup tasks and protocol handlers.

## Windows App SDK runtime (WinUI 3 apps)

Two axes, both explicit in the csproj (July 2026 — re-verify option names
against current Windows App SDK docs):

- **Packaged vs unpackaged**: unpackaged WinUI 3
  (`WindowsPackageType=None`) auto-initialises the runtime bootstrapper.
- **Framework-dependent vs self-contained**
  (`WindowsAppSDKSelfContained=true`): framework-dependent needs the
  Windows App Runtime installed on the machine (installer must chain it);
  self-contained carries it, at size cost.

## .NET publish options (WPF/WinForms and WinUI alike)

- **Framework-dependent** (small, needs the right .NET Desktop Runtime on
  the machine) vs **self-contained** (`--self-contained`, carries the
  runtime — the default choice for uncontrolled target machines).
- Single-file publish works for desktop apps; expect first-run extraction
  behaviour for some native dependencies.
- **Trimming (`PublishTrimmed`) and NativeAOT are NOT supported for WPF or
  WinForms** — reflection-heavy XAML defeats them. WinUI 3 *does* support
  NativeAOT (Windows App SDK 1.6+; pair with toolkit partial-property MVVM
  which is AOT-safe). Don't promise small self-contained WPF binaries.
- `dotnet publish -r win-x64 -c Release` is the baseline; add `win-arm64`
  if you ship to Windows-on-Arm (WinUI 3 and modern .NET handle it well).

## ClickOnce — the legacy lane

Still supported for WPF/WinForms on modern .NET (publish via Visual Studio
or `dotnet-mage`). Per-user install, no admin, launch-time update checks —
which is why LOB estates keep it. Constraints: per-user only, weak
machine-level integration (no services, limited shell integration),
certificate prompts on unsigned manifests. Fine to maintain; for new apps
prefer MSIX unless the target environment already standardises on ClickOnce.

## Code signing and SmartScreen

- Sign **everything** you distribute (exe/installer/MSIX). Unsigned or
  fresh-certificate binaries trip SmartScreen warnings for unrecognised
  apps; reputation accrues to the certificate.
- CI: certificates and signing keys come from secret stores/HSM-backed
  services (Azure Trusted Signing, `signtool` + Key Vault) — never from the
  repo (secrets discipline per dotnet-development/CI conventions).

## Updates

| Mode | Update story |
|---|---|
| MSIX | App Installer (`.appinstaller` feed, hours-based checks), Store, or winget — built in |
| ClickOnce | Built-in launch-time check against the publish location |
| Unpackaged | Your job: an updater library or installer re-run; keep it signed and HTTPS-only |

Test the update loop end to end before first release (old → new, with the
app running), not after users are on v1.

## Production checklist

- [ ] Deployment mode chosen deliberately; state paths correct for that mode
- [ ] Installed-mode run verified (Start menu launch, not just F5)
- [ ] Signed; SmartScreen behaviour checked on a clean VM
- [ ] Update loop exercised end to end
- [ ] Self-contained vs framework-dependent decision recorded (and runtime
      chained into the installer if framework-dependent)
- [ ] Version/branding set: assembly version, MSIX version, file properties
