# Styling, Theming and Templates

The lookless-control model: a control's *behaviour* lives in its class, its
*look* lives in a replaceable `ControlTemplate`, and styles set properties
in bulk. Work at the lightest level that solves the task: property →
style → template → custom control (see
dependency-properties-and-commands.md for the last step).

## Styles and resources

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
  <!-- Implicit: applies to every Button in scope (no x:Key) -->
  <Style TargetType="Button">
    <Setter Property="Padding" Value="12,6" />
    <Setter Property="MinHeight" Value="32" />
  </Style>

  <!-- Explicit + BasedOn: opt-in variant that extends the implicit one -->
  <Style x:Key="DangerButton" TargetType="Button"
         BasedOn="{StaticResource {x:Type Button}}">
    <Setter Property="Background" Value="{DynamicResource DangerBrush}" />
  </Style>
</ResourceDictionary>
```

- Resource lookup walks up: element → parent → window/page → `App.xaml` →
  theme dictionaries. Put design tokens (brushes, spacing, text styles) in
  app-level merged dictionaries; keep element-level resources for genuinely
  local cases.
- **WPF**: `StaticResource` resolves once at load; `DynamicResource`
  re-resolves when the resource changes — theme-sensitive brushes must be
  `DynamicResource`. **WinUI**: `ThemeResource` is the theme-reactive
  lookup; `StaticResource` for everything theme-independent.
- WinUI `BasedOn` note: implicit-style keys work as above in WPF; in WinUI
  reference the base style by explicit key.

## Control templates and data templates

- `ControlTemplate` replaces a control's visual tree; inside it,
  `TemplateBinding` (or `{Binding RelativeSource={RelativeSource
  TemplatedParent}}` for two-way/converted cases) surfaces the control's
  properties. When restyling isn't enough (structure must change),
  retemplate — but start from the control's default template (IDE: "Edit a
  Copy") rather than hand-building; default templates carry the focus
  visuals, disabled states and automation hooks you'd otherwise lose.
- `DataTemplate` renders a *data object* (typically a child view model).
  Map VM type → view with typed templates (WPF `DataType="{x:Type
  vm:ChartViewModel}"`, WinUI `x:DataType` + `DataTemplateSelector`) — this
  is the MVVM composition mechanism for lists and content regions.
- Visual states: WPF templates use `Trigger`/`DataTrigger`; WinUI has **no
  style/data triggers** — templates declare `VisualStateManager` groups and
  code (or `StateTriggers`) drives `GoToState`. Porting WPF trigger-heavy
  templates to WinUI is a redesign, not a paste.

## Theming and dark mode

- **WinUI 3**: theme comes from `Application.RequestedTheme` /
  `FrameworkElement.RequestedTheme` (`Default` follows Windows).
  `ResourceDictionary.ThemeDictionaries` with `Light`, `Dark` and
  `HighContrast` entries + `ThemeResource` lookups make custom brushes
  theme-aware. Test all three dictionaries — `HighContrast` falls back
  ugly, not gracefully.
- **WPF on .NET 9/10**: the Fluent theme via `ThemeMode`
  (`None`/`Light`/`Dark`/`System`; default `None` keeps the classic Aero2
  look). Set it in XAML on `Application`/`Window`; setting from code
  triggers the experimental-API diagnostic WPF0001 (July 2026 — still
  experimental in .NET 10; re-verify before making it a hard dependency).
  Pre-Fluent WPF dark mode means themed resource dictionaries swapped at
  runtime — which only works if every theme-sensitive brush was
  `DynamicResource` from day one.
- Never hardcode colours on controls. Literal `Background="#FFFFFF"` is the
  root cause of broken dark mode, broken high contrast and failed
  accessibility audits alike — reference semantic brushes from the theme
  dictionaries instead.

## High contrast and system settings

- High contrast is not a colour scheme, it is a *contract*: the system
  palette replaces yours. WinUI system brushes handle it; custom brushes
  need `HighContrast` theme-dictionary entries. WPF exposes
  `SystemParameters.HighContrast` — respect it in custom-drawn visuals.
- Respect text scaling (Settings → Accessibility → Text size): avoid fixed
  pixel heights on text containers; let layout size to content.
- Focus visuals ship with default templates — if you retemplate, keep (or
  re-add) them. A control with no visible keyboard focus fails the
  accessibility floor in SKILL.md.

## Performance notes

- Prefer styles/setters over per-element repetition (smaller XAML, one
  place to change) and `StaticResource` where theme-reactivity isn't needed
  (cheaper than `DynamicResource`/`ThemeResource`).
- Deep template trees cost layout time on every item of a virtualised list
  — keep item templates shallow; measure with the Live Visual Tree before
  and after.
