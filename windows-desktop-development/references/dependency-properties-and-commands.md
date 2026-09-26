# Dependency Properties, Routed Events and Commands

Dependency properties (DPs) are what make a property *bindable, stylable and
animatable* on a control. View models never need them (INPC is their
mechanism); you write DPs when authoring controls.

## Registering a dependency property (WPF)

```csharp
public sealed class RatingControl : Control
{
    public static readonly DependencyProperty ValueProperty =
        DependencyProperty.Register(
            nameof(Value), typeof(int), typeof(RatingControl),
            new FrameworkPropertyMetadata(
                0,
                FrameworkPropertyMetadataOptions.BindsTwoWayByDefault,
                OnValueChanged),
            static v => (int)v is >= 0 and <= 5);

    public int Value
    {
        get => (int)GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    private static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        => ((RatingControl)d).UpdateStars();

    private void UpdateStars() { /* respond to the new value */ }
}
```

Non-negotiables:

- **The CLR wrapper must contain nothing but `GetValue`/`SetValue`.** XAML,
  bindings, styles and animations set DPs directly through the property
  system and **bypass the wrapper** — logic there simply doesn't run. All
  reactions go in the `PropertyChangedCallback`.
- Naming: the static field is `<Name>Property`; the wrapper is `<Name>`.
  Tooling and the XAML compiler rely on this convention.
- Callbacks are static; cast `d` and delegate to an instance method.
- WPF extras WinUI lacks: coercion, property value inheritance and
  `BindsTwoWayByDefault`. In WinUI 3 use plain `PropertyMetadata` and do
  any clamping inside the changed callback.

## Attached properties

For behaviour a *parent or helper* attaches to arbitrary elements
(`Grid.Row` is the canonical example):

```csharp
public static class ScrollHelper
{
    public static readonly DependencyProperty AutoScrollProperty =
        DependencyProperty.RegisterAttached(
            "AutoScroll", typeof(bool), typeof(ScrollHelper),
            new PropertyMetadata(false, OnAutoScrollChanged));

    public static bool GetAutoScroll(DependencyObject obj) => (bool)obj.GetValue(AutoScrollProperty);
    public static void SetAutoScroll(DependencyObject obj, bool value) => obj.SetValue(AutoScrollProperty, value);

    private static void OnAutoScrollChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    { /* attach/detach handlers on d */ }
}
```

Static `Get<Name>`/`Set<Name>` accessors are mandatory — XAML calls them.
Attached properties + changed callbacks are the lightweight alternative to
subclassing for "add this behaviour to any control" requirements.

## Value precedence (why "my style stopped working")

WPF resolves highest-first: coercion → active animations → **local value**
(`Width="100"` or a binding) → values the control template sets on its
parts (TemplatedParent) → style triggers → template triggers → **style
setters** → theme (default) style → inherited value → metadata default.
So a local value **always beats** a style setter, and so do values set
inside a template and style triggers. If a style setter has no effect, look
for a local value or binding on the element first — that's the answer far
more often than a resource-lookup problem — then for a template or trigger
setting the same property.

## Routed events (WPF)

Events route through the element tree: **tunnelling** `Preview*` events run
root→source, then the **bubbling** pair runs source→root. Mark
`e.Handled = true` deliberately — it stops handlers further up (unless they
registered with `handledEventsToo`). WinUI 3 keeps a reduced model — fewer
routed events, no general `Preview*` tier — so check the control's actual
events rather than assuming WPF parity.

## Commands

- **MVVM commands** (the default): `[RelayCommand]` / `IRelayCommand` from
  the toolkit — see mvvm-and-toolkit.md. Bind `Command` and `CommandParameter`.
- **WPF routed commands** (`ApplicationCommands.Copy` etc.) route like
  events to find a `CommandBinding` — suited to editor-style apps where the
  *focused element* determines the handler. LOB forms use VM commands;
  don't mix the idioms arbitrarily.
- Keyboard shortcuts: WPF `InputBindings`
  (`<KeyBinding Modifiers="Ctrl" Key="S" Command="{Binding SaveCommand}"/>`);
  WinUI `KeyboardAccelerator` on the element. Every shortcut needs a visible
  affordance (menu item, tooltip) — discoverability is an accessibility
  concern too.

## UserControl vs custom (templated) control

| Building | Use |
|---|---|
| App-specific composition of existing controls, one look | **UserControl** — XAML + code-behind, fast, not re-templatable |
| Reusable control with swappable visuals (theming, a control library) | **Custom control** — inherits `Control`, look lives in a default `ControlTemplate` (WPF: `Themes/Generic.xaml`), exposes DPs |

Start with a UserControl; promote to a templated control only when a second
look or external reuse actually appears. Templated controls pick up named
template parts with `GetTemplateChild` in `OnApplyTemplate` — null-check
every part (templates may omit them). Styling and template authoring:
styling-theming-templates.md.
