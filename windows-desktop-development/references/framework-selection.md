# Framework Selection

The decision in depth. Facts here move fast — every dated claim below says
**July 2026 — re-verify** for a reason: check the Windows App SDK release
notes and the .NET desktop roadmap before relying on version specifics.

## The current landscape (July 2026 — re-verify)

- **.NET 10 (LTS)** is current. WPF and WinForms ship in the Windows Desktop
  runtime, remain fully supported, Windows-only, and receive active fixes —
  neither is deprecated.
- **WinUI 3** ships via the **Windows App SDK** NuGet packages, decoupled
  from the OS. Windows App SDK **2.0** is the current stable channel (it
  adopted semantic versioning; the 1.8.x line continues as servicing).
  Minimum supported OS is Windows 10 1809.
- **.NET MAUI 10** shipped with .NET 10; its Windows target renders on
  WinUI 3. Support follows the .NET cadence: a MAUI major is supported for
  at least six months after its successor ships.
- WPF's Fluent theme (`ThemeMode`) is **still experimental in .NET 10**:
  setting it from code raises the WPF0001 diagnostic (suppressible); setting
  it in XAML is the supported path.

## WPF — the Windows-only default

- **Strengths**: two decades of maturity; the deepest control and
  third-party ecosystem (DevExpress, Telerik, Syncfusion — component
  engineering routes to dotnet-development's DevExpress reference); a full
  visual designer plus XAML Hot Reload; vector-based, per-monitor DPI aware;
  the richest binding/templating dialect (MultiBinding, style triggers).
- **Weaknesses**: the default look is dated until you opt into the Fluent
  theme (experimental, above); no trimming or NativeAOT; no path off
  Windows.
- **Fits**: line-of-business apps, internal tooling with non-trivial UI,
  anything an existing WPF estate touches.

## WinUI 3 (Windows App SDK)

- **Strengths**: native Fluent / Windows 11 visuals (Mica, rounded corners)
  without theming work; the actively developed platform for new Windows UI
  and OS-adjacent APIs (windowing, notifications, widgets); **NativeAOT
  supported** (since Windows App SDK 1.6); first-class Arm64.
- **Weaknesses**: no XAML visual designer — you work with Hot Reload and the
  Live Visual Tree; no first-party DataGrid (community controls fill the
  gap); a smaller third-party ecosystem than WPF; XAML dialect gaps versus
  WPF — no `MultiBinding`, no `DataTrigger` in styles (use
  `VisualStateManager`); API surface still moving between SDK releases.
- **Fits**: consumer-polish apps, Store distribution, greenfield teams who
  want the platform Microsoft is actively building on.

## .NET MAUI — only when cross-platform is real

MAUI's Windows head *is* WinUI 3 with an abstraction layer (handlers,
cross-platform layouts) on top. That layer buys Android/iOS/macCatalyst and
costs indirection when you debug Windows-specific behaviour. Choose MAUI
when the product genuinely ships to mobile or Mac; for a Windows-only
requirement, target WPF or WinUI 3 directly — you lose nothing and drop a
layer. MVVM, binding and threading discipline in this skill apply to MAUI's
Windows target; MAUI-specific layout and handler architecture is out of this
skill's depth — flag it rather than guessing.

## WinForms — the maintenance reality

Vast estates exist and still run businesses. WinForms is supported on
.NET 10 and fine to *maintain*: event-driven code-behind, pixel-based layout
(per-monitor DPI has improved but remains its weak spot), unmatched RAD
speed for small tools. On modern .NET the designer runs out-of-process,
which breaks some legacy ActiveX/custom design-time components — verify
designer support before promising a .NET Framework port. Don't greenfield
WinForms beyond small internal utilities, and don't bolt MVVM onto it —
its idiom is data-bound code-behind; forcing XAML patterns in fights the
framework.

## Migration and interop

- **.NET Framework → modern .NET**: WPF and WinForms port well; run the
  .NET Upgrade Assistant, expect API gaps in `AppDomain`/remoting/WCF
  client code, then stay current within LTS. This is usually the highest
  value-per-risk modernisation step — a full UI-framework rewrite is not.
- **WPF ↔ WinForms in one app**: `WindowsFormsHost` (WinForms inside WPF)
  and `ElementHost` (WPF inside WinForms) are stable, supported seams —
  standard for incremental WinForms→WPF migration.
- **WinUI 3 content inside existing Win32/WPF/WinForms**: Windows App SDK
  **islands** support this (matured across the 1.4→2.0 releases — July
  2026, re-verify current guidance and supported hosts before committing).
- **Full WPF → WinUI 3 rewrites** rarely pay off for working LOB apps: the
  XAML dialects differ enough that it is a port, not a lift. Prefer new
  modules on the new stack, or islands, over big-bang rewrites.

## Alternatives without a catalogue owner

Avalonia and Uno Platform offer cross-platform XAML with a single codebase.
No skill in this library owns them — if a project already uses one, note it
in the report and follow that project's conventions rather than mapping WPF
or WinUI idioms onto it blindly.
