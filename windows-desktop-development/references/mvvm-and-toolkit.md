# MVVM and CommunityToolkit.Mvvm

CommunityToolkit.Mvvm (the "MVVM Toolkit") is the default: source
generators remove the boilerplate, it is UI-framework-agnostic (WPF, WinUI
3, MAUI, WinForms hosts) and AOT-compatible. Version context (July 2026 —
re-verify): 8.4+ is current; **8.4 added `[ObservableProperty]` on partial
properties** (requires C# 13), which is the preferred form — field-targeted
attributes still work but partial properties get real language-level
members, custom accessors and full NativeAOT safety on WinUI 3.

## The view model shape

```csharp
public sealed partial class CustomerListViewModel : ObservableObject
{
    private readonly ICustomerService _customers;

    public CustomerListViewModel(ICustomerService customers)
        => _customers = customers;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(SaveCommand))]
    public partial Customer? Selected { get; set; }

    [ObservableProperty]
    public partial bool IsBusy { get; set; }

    public ObservableCollection<Customer> Items { get; } = new();

    [RelayCommand(CanExecute = nameof(CanSave))]
    private async Task SaveAsync(CancellationToken ct)
    {
        IsBusy = true;
        try { await _customers.SaveAsync(Selected!, ct); }
        finally { IsBusy = false; }
    }

    private bool CanSave() => Selected is not null && !IsBusy;
}
```

Rules the generators impose:

- The class **and** the annotated property/field owner must be `partial`.
- Field-targeted form (`[ObservableProperty] private string _name;`)
  generates a PascalCase `Name` property — bind to `Name`, never `_name`.
- `[RelayCommand]` on `DoThingAsync` generates `DoThingCommand`
  (an `AsyncRelayCommand` for `Task`-returning methods; give async commands
  a `CancellationToken` parameter to get cancellation support for free).
- `CanExecute` does not re-evaluate by magic: pair the state it reads with
  `[NotifyCanExecuteChangedFor(...)]` (or call `Command.NotifyCanExecuteChanged()`).
- Partial-property changed/changing hooks: implement the generated partial
  methods (`OnSelectedChanged(Customer? value)`) instead of overriding
  setters.

## Validation

`ObservableValidator` extends `ObservableObject` with `INotifyDataErrorInfo`:
data-annotation attributes on properties, `ValidateProperty`/`ValidateAllProperties`,
and `HasErrors`/`GetErrors` that WPF and WinUI error templates consume.
Use it for form view models; keep domain invariants in the domain layer
(dotnet-development), not in UI validation attributes.

## Messenger — decoupled VM-to-VM signals

`WeakReferenceMessenger.Default.Send(new CustomerSavedMessage(id));` with
`IRecipient<CustomerSavedMessage>` on the listener. Prefer the weak
messenger (no unsubscribe-leak bugs); `StrongReferenceMessenger` only on
hot paths with explicitly managed lifetimes. Messenger is for cross-cutting
peer notifications — parent→child composition uses constructor wiring.

## Hosting and DI (WPF shown; WinUI 3 is analogous)

```csharp
public partial class App : Application
{
    private readonly IHost _host = Host.CreateDefaultBuilder()
        .ConfigureServices(services =>
        {
            services.AddSingleton<ICustomerService, CustomerService>();
            services.AddTransient<CustomerListViewModel>();
            services.AddTransient<MainWindow>();
        })
        .Build();

    protected override async void OnStartup(StartupEventArgs e)
    {
        await _host.StartAsync();
        _host.Services.GetRequiredService<MainWindow>().Show();
    }

    protected override async void OnExit(ExitEventArgs e)
        => await _host.StopAsync();
}
```

The window/page takes its view model by constructor and assigns
`DataContext = vm;` (WPF) or exposes a `ViewModel` property for `x:Bind`
(WinUI). Generic Host also brings config, logging and `IHostedService`
background work — one composition root, same as a web app.

## Rules of engagement

- View models: no `Window`/`Page`/control types, no dispatcher calls
  (marshal in the service or `await` back — see async-ui-and-threading.md),
  no static service access. Constructor injection only.
- One view model per screen/document; child view models for repeated
  regions; expose child VMs as properties, template them with DataTemplates.
- Navigation: view models request navigation through an injected
  `INavigationService` abstraction — they never construct views.
- Design-time: keep constructors side-effect free (no I/O) so the designer
  and unit tests can instantiate VMs cheaply.
