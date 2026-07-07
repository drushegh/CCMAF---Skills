# Concurrency and Context

## The ownership rule

Never start a goroutine without answering: *how does it stop, and who
waits for it?* Every goroutine has an owner responsible for its exit
(usually via `ctx.Done()` or channel close) and for collecting its result
or error. Fire-and-forget goroutines are leaks with a delay fuse.

## Channels vs mutexes

| Need | Use |
|---|---|
| Protect shared state (counters, maps, caches) | `sync.Mutex` / `sync.RWMutex` — simpler and faster |
| Transfer ownership of data between goroutines | Channel — sender stops touching what it sent |
| Signal completion or cancellation | `close(ch)` broadcast, or `context` |
| Coordinate a one-time init | `sync.Once` / `sync.OnceValue` |
| Fan-out work with error collection | `errgroup` (below) |

Channel rules: only the **sender** closes, never the receiver, never
twice. Receiving from a closed channel yields the zero value immediately
(`v, ok := <-ch` to detect); sending on a closed channel panics. A `nil`
channel blocks forever — deliberately setting a select case's channel to
nil disables that arm. Unbuffered is the default; a buffer needs a stated
reason (known burst size, decoupling a slow consumer *with* backpressure
thinking — an unbounded queue is not a design).

## errgroup — the default fan-out shape

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(8)                          // bound concurrency; unbounded spawn is a bug
for _, u := range urls {
    g.Go(func() error {
        return fetch(ctx, u)           // first error cancels ctx for the others
    })
}
if err := g.Wait(); err != nil {
    return fmt.Errorf("fetching: %w", err)
}
```

(`golang.org/x/sync/errgroup`; with go.mod ≥ 1.22 the loop variable is
per-iteration — no rebinding dance.) For groups with no errors,
`sync.WaitGroup` — and since Go 1.25, `wg.Go(fn)` replaces the manual
`Add(1)`/`defer wg.Done()` pair. `WaitGroup.Add` must happen *before* the
goroutine starts, never inside it.

## Context discipline

- First parameter, named `ctx`; never stored in a struct field (it would
  outlive its cancellation scope). `http.Request` carries one for you —
  `r.Context()`.
- Never `nil`: pass `context.TODO()` if plumbing is genuinely incomplete.
- Every blocking operation takes ctx: DB calls, HTTP requests, channel
  waits (`select` on `ctx.Done()` alongside the channel op).
- `context.WithTimeout`/`WithDeadline` at the *call site that owns the
  budget*; always `defer cancel()`.
- `context.WithCancelCause` + `context.Cause(ctx)` to report *why* a
  cancellation happened; `context.WithoutCancel` for work that must
  complete after the request ends (audit writes).
- Context **values** are for request-scoped cross-cutting data only (trace
  ID, auth principal) — never for passing dependencies or optional
  parameters.

```go
select {
case out <- result:
case <-ctx.Done():
    return ctx.Err()                   // deliver or abandon; never block forever
}
```

## The race detector

`go test -race ./...` in CI is the floor; run the binary itself under
`-race` in a staging soak when concurrency changed. It only catches races
that *execute*, so drive concurrent paths in tests. Cost is roughly 2–20×
CPU and 5–10× memory — too heavy for production defaults, cheap anywhere
else. A DATA RACE report is always a real bug: fix the sharing, don't
sprinkle `sync/atomic` until the design question ("who owns this?") is
answered.

## Leak patterns to check

- **Blocked send**: worker sends to a channel whose receiver returned
  early. Fix: select with `ctx.Done()`, or receiver drains until close.
- **Forgotten ticker**: `time.NewTicker` without `defer t.Stop()`.
  (Since Go 1.23 unreferenced timers/tickers are collectable, but explicit
  `Stop` remains the readable contract.)
- **Worker pools that never wind down**: closing the input channel is the
  shutdown signal; owners `Wait()` before returning.
- Diagnose with `runtime.NumGoroutine()` deltas in tests, or the
  `goleak` package (uber-go) in `TestMain`.

## Testing concurrent code

Prefer deterministic designs (inject clocks, use channels for
synchronisation — never `time.Sleep` as a synchroniser). Since Go 1.25,
`testing/synctest` runs goroutines under a fake clock inside
`synctest.Test`, making timeout/backoff logic instant and deterministic —
reach for it before building a clock abstraction (July 2026: still the
newest testing primitive; re-verify API details against the release notes).
