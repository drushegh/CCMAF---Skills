# XAML and Data Binding

Two binding dialects exist. WPF `{Binding}` is reflection-based, resolved at
runtime against `DataContext`, and fails **silently**. WinUI/UWP `{x:Bind}`
is compiled, resolved against the page/control class, fails at **compile
time**, and defaults to `Mode=OneTime`. Know which one the project speaks
before editing a line of XAML.

## Binding fundamentals (both dialects)

- The source must notify: bind only to public properties that raise
  `INotifyPropertyChanged` (view models — see mvvm-and-toolkit.md) or to
  dependency properties. Fields and non-notifying properties bind once and
  go stale — and in WPF a `OneWay`/`TwoWay` binding to a non-INPC CLR
  property on a long-lived object also **leaks** (WPF holds it via a global
  `PropertyDescriptor` table).
- `DataContext` inherits down the element tree in WPF — set it once at the
  root (typically the view model) and bind with relative paths below.
- Collections: bind `ItemsSource` to `ObservableCollection<T>` (or a
  read-only view over one) so adds/removes reach the UI; replacing the whole
  collection requires the *property* to notify.

## WPF `{Binding}` cheat sheet

```xml
<StackPanel xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
  <!-- TwoWay is the default for TextBox.Text, but the source only updates
       on focus loss unless you say otherwise: -->
  <TextBox Text="{Binding Query, UpdateSourceTrigger=PropertyChanged}" />

  <!-- Explicit mode, formatting, and a fallback for load/failure states -->
  <TextBlock Text="{Binding Total, Mode=OneWay, StringFormat={}{0:C},
                    FallbackValue=—, TargetNullValue=n/a}" />

  <!-- Bind to another element, and to an ancestor's DataContext -->
  <Slider x:Name="Zoom" Minimum="1" Maximum="4" />
  <TextBlock Text="{Binding Value, ElementName=Zoom}" />
  <Button Command="{Binding DataContext.RemoveCommand,
                    RelativeSource={RelativeSource AncestorType=ItemsControl}}" />
</StackPanel>
```

- Defaults: most properties bind `OneWay`; a few editable ones
  (`TextBox.Text`, `CheckBox.IsChecked`) default `TwoWay`.
- `StringFormat` only applies on `TextBlock.Text`-style string targets; for
  anything else use a converter.
- `MultiBinding` + `IMultiValueConverter` combine several sources — WPF
  only; in WinUI compute a read-only view-model property instead.

## WinUI `{x:Bind}` cheat sheet

- Resolves against the **page or control class**, not `DataContext`: bind as
  `{x:Bind ViewModel.Name, Mode=OneWay}` where `ViewModel` is a property on
  the page.
- **Default mode is `OneTime`** — always state the mode; this single default
  explains most "binding doesn't update" reports in WinUI code.
- Inside a `DataTemplate`, declare `x:DataType` so the compiler can type the
  template; without it `x:Bind` won't compile.
- Function bindings replace many converters:
  `Visibility="{x:Bind FormatVisibility(ViewModel.HasItems), Mode=OneWay}"`.
- `{Binding}` still exists in WinUI for dynamic/late-bound scenarios, with
  the same silent-failure behaviour as WPF — prefer `x:Bind`.

## Converters

```csharp
public sealed class BoolToVisibilityConverter : IValueConverter
{
    public bool Invert { get; set; }

    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var visible = value is bool b && (b ^ Invert);
        return visible ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
        => throw new NotSupportedException();
}
```

Declare once in resources, reuse everywhere. Keep converters pure and
side-effect free; anything with logic worth testing belongs in the view
model as a computed property. (The sample uses WinUI's signature; WPF's
`IValueConverter` takes a `CultureInfo culture` final parameter instead of
`string language` — adjust when porting.)

## Debugging silent binding failures (WPF)

1. **XAML Binding Failures window** (Visual Studio, while debugging) — the
   first stop; it lists every failed path with source context.
2. Trace a single binding loudly: declare
   `xmlns:diag="clr-namespace:System.Diagnostics;assembly=WindowsBase"`,
   then `{Binding Total, diag:PresentationTraceSources.TraceLevel=High}` —
   the full resolution attempt lands in the Output window.
3. Watch the debug Output window — every failure logs a
   `System.Windows.Data Error` line naming the path and target.
4. Typos survive refactors: renaming a VM property does not update XAML
   strings. After any VM rename, search the XAML for the old name.

`x:Bind` failures are compile errors — one more reason it's the WinUI
default. There is no compiled-binding equivalent in WPF; discipline plus
the failures window is the mitigation.
