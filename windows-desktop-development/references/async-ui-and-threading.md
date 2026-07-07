# Async UI and Threading

The model: **one UI thread owns every UI object** (WPF adds a hidden render
thread you never touch). Affinity is enforced — touching a control from any
other thread throws `InvalidOperationException: "The calling thread cannot
access this object..."` (WPF) or fails/corrupts state in WinUI. Everything
below is about staying on, or getting back to, that thread.

## `await` is the primary marshalling tool

Awaiting inside code that started on the UI thread captures the UI
`SynchronizationContext`/`DispatcherQueue` context and **resumes on the UI
thread** — so the pattern is not "invoke onto the dispatcher", it is:

```csharp
[RelayCommand]
private async Task LoadAsync(CancellationToken ct)
{
    IsBusy = true;                                   // UI thread
    try
    {
        var data = await _service.FetchAsync(ct);    // I/O off-thread
        Items.Clear();                               // back on UI thread
        foreach (var item in data) Items.Add(item);
    }
    finally { IsBusy = false; }
}
```

- `ConfigureAwait(false)` belongs in **service/library code** that never
  touches UI state. Never use it in view-model or code-behind methods that
  set bound properties after the await.
- CPU-bound work: `await Task.Run(() => Crunch(input), ct)` — and only the
  computation goes inside; UI updates happen after the await.

## Explicit marshalling (when you're handed a foreign thread)

Callbacks from timers, sockets, file watchers or library events may arrive
on worker threads:

```csharp
public sealed partial class ConnectionViewModel : ObservableObject
{
    // Captured on the UI thread at construction — null if fetched off-thread
    private readonly DispatcherQueue _queue = DispatcherQueue.GetForCurrentThread();

    private void OnSocketMessage(string text)      // arrives on a worker thread
    {
        _queue.TryEnqueue(() => Status = text);              // WinUI 3
        // WPF equivalent: _dispatcher.InvokeAsync(() => Status = text);
    }
}
```

- `DispatcherQueue.GetForCurrentThread()` returns **null on a non-UI
  thread** — capture it during construction on the UI thread, don't fetch
  it at the point of use.
- Prefer designing services to expose `Task`s or `IProgress<T>` instead of
  raw cross-thread events, so view models never see a foreign thread.
- `IProgress<T>` via `new Progress<T>(handler)` created on the UI thread
  posts `handler` back to it automatically — the clean channel for
  progress percentages and streaming status.

## The deadlock and the freeze

- **Deadlock**: `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` on the
  UI thread blocks it while the awaited task needs that same thread to
  resume → permanent hang. Async all the way up; if a constructor "needs"
  async work, move it to an `InitializeAsync` called from `Loaded`/activation.
- **Freeze ("Not Responding")**: synchronous I/O, `Thread.Sleep`, or heavy
  computation on the UI thread. Anything beyond ~50 ms of blocking is
  visible jank; use async I/O and `Task.Run` for CPU work.

## `async void` — event handlers only

Event handlers — and the few framework-forced `void` overrides such as
WPF's `OnStartup` — are the only legitimate `async void` sites; everywhere
else it is a bug (exceptions escape the caller and crash the process;
completion is unobservable). In handlers, wrap the body in try/catch — an
unhandled exception in an `async void` handler takes the app down. Commands never
need it: `AsyncRelayCommand` wraps `Task`-returning methods and surfaces
exceptions and `IsRunning` state properly.

## Collections across threads

`ObservableCollection<T>` raises change notifications on the mutating
thread; the UI must observe them on the UI thread.

- Default rule: **mutate bound collections only on the UI thread** (after an
  await, or marshalled).
- WPF escape hatch for genuinely concurrent producers:
  `BindingOperations.EnableCollectionSynchronization(collection, lockObject)`
  on the UI thread, then take `lock (lockObject)` around every mutation.
- WinUI 3 has no equivalent — marshal via the captured `DispatcherQueue`.
- Bulk loads: build the list off-thread, then assign/refresh on the UI
  thread — thousands of individual `Add` notifications are their own
  performance bug.

## Timers

UI-affine periodic work uses `DispatcherTimer` (WPF) /
`DispatcherQueueTimer` (WinUI) — ticks arrive on the UI thread.
`System.Timers.Timer` / `System.Threading.Timer` tick on pool threads —
non-UI work only, or marshal explicitly. Polling loops in async code:
`PeriodicTimer` + `CancellationToken`.

## Testability note

View models that call dispatchers directly are untestable off the UI
thread. Keep VMs dispatcher-free (rule in mvvm-and-toolkit.md): let `await`
do the marshalling, and inject an abstraction in the rare case a service
must post to the UI — unit tests then run VMs without a dispatcher pump.
Anything needing a real dispatcher belongs in UI automation tests.
