---
name: windows-desktop-development
description: >-
  Native Windows desktop UI engineering: WPF, WinUI 3, WinForms and .NET MAUI
  on Windows — the framework decision, XAML and data binding, MVVM with
  CommunityToolkit.Mvvm source generators, dependency properties, async UI and
  dispatcher threading, styling/theming/templates, packaging (MSIX,
  ClickOnce) and UI Automation accessibility, with detailed topic references
  loaded on demand. Use this skill whenever a Windows desktop UI project is
  created, edited, reviewed, or debugged — even if the user doesn't name the
  framework. Triggers include: .xaml files, DataContext/Binding/x:Bind
  failures, ObservableProperty or RelayCommand, DependencyProperty.Register,
  "The calling thread cannot access this object", a frozen or unresponsive
  window, Dispatcher/DispatcherQueue, control templates or dark mode,
  Package.appxmanifest, MSIX/ClickOnce packaging, Narrator or UI Automation
  review, WinForms maintenance, or choosing between WPF, WinUI 3, MAUI and
  web-tech desktop shells.
---

# Windows Desktop Development

Consolidated native-Windows UI engineering for agents. The rules here always
apply; load `references/` files only when the task touches that topic. C#
language, runtime, EF Core and test standards live in dotnet-development;
electron-development and tauri-development own the web-tech desktop route.
This skill owns the native XAML stack — framework choice, binding, MVVM,
threading, styling, packaging, UI Automation.

## Framework Decision (first, always)

| Situation | Choose |
|---|---|
| Existing codebase | Its framework — never migrate or mix dialects as a side effect |
| New Windows-only desktop / LOB app | **WPF** — mature, richest ecosystem, Fluent theming since .NET 9 |
| Windows 11-native look, newest platform APIs, NativeAOT | **WinUI 3** (Windows App SDK) |
| Genuinely cross-platform (mobile + desktop) | **.NET MAUI** — WinUI 3 under the hood on Windows; never pick it for Windows-only |
| Small internal tool, or an existing WinForms estate | **WinForms** — maintenance mindset, not a greenfield default |
| Web-tech team shipping cross-platform desktop | electron-development / tauri-development |

Version currency (July 2026 — re-verify): .NET 10 is the current LTS;
Windows App SDK 2.0 is the current stable (1.8.x in servicing); WPF's Fluent
`ThemeMode` is still experimental in .NET 10. Decision depth, migration and
interop: [references/framework-selection.md](references/framework-selection.md).

## MVVM Standards (always)

- **CommunityToolkit.Mvvm (8.4+)** is the default MVVM library: partial
  classes on `ObservableObject`, `[ObservableProperty]` (on `partial`
  properties with C# 13; field-targeted still works) and `[RelayCommand]`.
  Bind to the **generated PascalCase member**, never the annotated field.
- **Views stay thin**: code-behind holds view plumbing only; view models
  never reference view types (`Window`, `Page`, controls, dispatchers behind
  an abstraction if needed) — that's what keeps them unit-testable.
- **DI-first**: `Microsoft.Extensions.DependencyInjection` (Generic Host)
  wires view models, services and factories; no service-locator statics.
- Everything bound implements change notification — a binding to a plain CLR
  property without `INotifyPropertyChanged` is a stale-UI bug (and in WPF a
  memory leak). Details: [references/mvvm-and-toolkit.md](references/mvvm-and-toolkit.md).

## Binding Quick Rules

- **WPF `{Binding}` failures are silent at runtime** — the UI just shows
  nothing. After any binding change, check the debugger's XAML Binding
  Failures window or the trace output; never ship on "it compiled".
- **`x:Bind` (WinUI/MAUI-adjacent) defaults to `Mode=OneTime`** — the
  number-one "my UI never updates" cause. State the mode explicitly.
- **WPF `TextBox.Text` updates its source on focus loss** by default — set
  `UpdateSourceTrigger=PropertyChanged` for live-validated forms.
- Bindings resolve against `DataContext` (WPF `{Binding}`) but against the
  **page/control root** for `x:Bind` — they are different dialects, not
  synonyms. Details: [references/xaml-and-binding.md](references/xaml-and-binding.md).

## Threading Rules (always)

- **One UI thread owns every UI object.** Touching a control (or a bound
  `ObservableCollection`) from a worker thread throws or corrupts state.
  Marshal via `Dispatcher.InvokeAsync` (WPF) / `DispatcherQueue.TryEnqueue`
  (WinUI 3) — or better, `await` back onto the UI thread and set view-model
  properties there.
- **Never `.Result`/`.Wait()`/`.GetAwaiter().GetResult()` on the UI thread**
  — classic SynchronizationContext deadlock. Async all the way down.
- `async void` is for event handlers only; commands use `AsyncRelayCommand`.
  Details: [references/async-ui-and-threading.md](references/async-ui-and-threading.md).

## Critical Pitfalls — always check

| Symptom | Root cause | Fix |
|---|---|---|
| "The calling thread cannot access this object" | UI object touched off the UI thread | Marshal via Dispatcher/DispatcherQueue; update VM properties after `await` instead |
| Binding shows nothing, no error anywhere | WPF `{Binding}` fails silently (typo, wrong DataContext) | Binding Failures window / trace level High; prefer compiled checks |
| `x:Bind` value never refreshes | Default `Mode=OneTime` | Set `Mode=OneWay`/`TwoWay` explicitly |
| VM property stale while typing | WPF `TextBox.Text` defaults to `UpdateSourceTrigger=LostFocus` | `UpdateSourceTrigger=PropertyChanged` |
| Window freezes / "Not Responding" | Sync I/O or blocking wait on the UI thread | Async I/O; `Task.Run` for CPU-bound work only |
| `[ObservableProperty]` "does nothing" | Class/property not `partial`, or XAML binds the field name | `partial` everywhere; bind the generated PascalCase property |
| Works unpackaged, breaks as MSIX | Package identity + filesystem/registry virtualisation | Write to `ApplicationData`/known folders, never the install dir; test packaged |
| View model never garbage-collected | WPF binding to a non-INPC CLR property; undetached event handlers | INPC on everything bound; unsubscribe/weak events on unload |
| List UI crawls at a few thousand rows | UI virtualisation defeated (ItemsControl inside a ScrollViewer, custom panel) | Keep the virtualising panel; size the control, not the content |
| Dark mode / high contrast shows wrong colours | Hardcoded brushes instead of theme resources | `DynamicResource` (WPF) / `ThemeResource` (WinUI) + theme dictionaries |

## Accessibility — UI Automation (always)

- Every interactive element is reachable and operable with the keyboard
  alone, with a visible focus indicator and a logical tab order.
- `AutomationProperties.Name` on every icon-only or image-based control;
  `AutomationProperties.LiveSetting` on status text that changes.
- Custom-drawn or heavily templated controls need an `AutomationPeer` —
  without one they are invisible to Narrator and every other screen reader.
- Respect system settings: high contrast (theme resources, never literal
  brushes), text scaling, reduced motion. Never convey state by colour alone.
- Verify with **Accessibility Insights for Windows** plus a Narrator pass on
  each new screen. WCAG 2.2 depth and the EU legal frame:
  accessibility-development — this skill owns the UIA plumbing.

## Agent Workflow Rules

1. **Identify the framework before touching XAML**: check the csproj —
   `UseWPF`, `UseWindowsForms`, a `Microsoft.WindowsAppSDK` reference, or a
   MAUI `net*-windows` target. The XAML dialects are not interchangeable
   (WPF style triggers don't exist in WinUI; `x:Bind` doesn't exist in WPF).
2. **Binding changes**: run the app and watch binding diagnostics — a green
   build proves nothing about runtime bindings.
3. **Threading audit** on any code path that can complete off the UI thread
   (Task continuations, timers, service events) before calling work done.
4. **Packaging-sensitive work** (paths, registry, startup, updates) is
   verified in the real deployment mode — packaged MSIX and unpackaged
   behave differently by design.
5. **Accessibility pass** (keyboard-only walk + Accessibility Insights) on
   every new or restructured screen.
6. **Before completion**: clean build with zero warnings — XAML compile and
   binding-expression warnings included; C#, test and analyzer standards per
   dotnet-development.

## Boundaries

- C# language/runtime, EF Core, testing frameworks and the DevExpress
  component payload → dotnet-development. This skill owns the UI framework
  layer on top.
- WCAG 2.2 auditing, EN 301 549 / European Accessibility Act obligations →
  accessibility-development; UI Automation, `AutomationPeer` and
  desktop-specific assistive plumbing stay here.
- Chromium/web-tech desktop shells → electron-development (Node) and
  tauri-development (Rust) — different stacks, don't port their idioms here.
- Interaction and layout reasoning (forms UX, ergonomics, hierarchy) →
  ux-design; this skill owns the XAML mechanics that implement it.

## Reference Index

| Load when the task involves... | File |
|---|---|
| Choosing/comparing WPF, WinUI 3, MAUI, WinForms; versions; migration, interop, islands | [references/framework-selection.md](references/framework-selection.md) |
| Binding modes, x:Bind vs Binding, converters, DataContext, debugging silent failures | [references/xaml-and-binding.md](references/xaml-and-binding.md) |
| View models, ObservableProperty/RelayCommand, validation, messenger, DI/hosting | [references/mvvm-and-toolkit.md](references/mvvm-and-toolkit.md) |
| DependencyProperty.Register, attached properties, routed events, commands, custom controls | [references/dependency-properties-and-commands.md](references/dependency-properties-and-commands.md) |
| Dispatcher/DispatcherQueue, async commands, progress, cross-thread collections, deadlocks | [references/async-ui-and-threading.md](references/async-ui-and-threading.md) |
| Styles, control/data templates, resources, dark mode, Fluent, high contrast | [references/styling-theming-templates.md](references/styling-theming-templates.md) |
| MSIX, unpackaged, self-contained, ClickOnce, signing, updates, install-mode bugs | [references/packaging-and-deployment.md](references/packaging-and-deployment.md) |
