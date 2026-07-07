# HTTP Services and CLIs

## Routing — stdlib first (Go 1.22+)

`net/http.ServeMux` handles methods and path parameters natively; reach
for chi/echo/gin only when the repo already uses one or you need their
middleware ecosystems.

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /orders/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    order, err := store.Get(r.Context(), id)
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(order); err != nil {
        slog.Error("encoding order", "err", err)
    }
})
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})
```

Pattern notes: `{id}` binds one segment (`r.PathValue`), `{rest...}` binds
the tail, a trailing `/` matches the subtree; the most specific pattern
wins, and method-less patterns match every method. What the responses
*should look like* (status codes, problem+json, pagination) is
`api-development`'s contract — implement to it.

## Server discipline — timeouts and shutdown

`http.Server` defaults have **no timeouts**; a bare
`http.ListenAndServe(":8080", mux)` in production is a slowloris invite.

```go
func run(ctx context.Context) error {
    ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 5 * time.Second,
        ReadTimeout:       10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       120 * time.Second,
    }
    errCh := make(chan error, 1)
    go func() { errCh <- srv.ListenAndServe() }()

    select {
    case err := <-errCh:
        return fmt.Errorf("server: %w", err)
    case <-ctx.Done():
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        return srv.Shutdown(shutdownCtx)   // drains in-flight requests
    }
}
```

Middleware is function composition — `func(http.Handler) http.Handler` —
applied outermost-first for logging/recovery/auth. Per-request work
respects `r.Context()`: it is cancelled when the client disconnects.

## Outbound HTTP

The zero-value `http.DefaultClient` has **no timeout**. Create one client
per service, reuse it (it pools connections), set `Timeout`, and always
close bodies:

```go
resp, err := client.Do(req)
if err != nil {
    return fmt.Errorf("calling billing: %w", err)
}
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
    io.Copy(io.Discard, resp.Body)     // drain so the connection is reusable
    return fmt.Errorf("billing returned %s", resp.Status)
}
```

## JSON

- Struct tags are the contract: `json:"order_id"`, `json:"note,omitempty"`.
  **`omitempty` does not omit zero-valued structs or empty non-nil
  slices** — Go 1.24's `omitzero` handles zero structs (e.g. `time.Time`);
  use pointers when "absent" and "zero" must differ on the wire.
- Strict decode when you own the contract:
  `dec.DisallowUnknownFields()`; stream large payloads with
  `json.NewDecoder`/`Encoder` rather than buffering whole bodies.
- `encoding/json/v2` exists behind `GOEXPERIMENT=jsonv2` (July 2026 —
  re-verify status before relying on it); don't adopt experiments in
  production code.

## Logging — slog

`log/slog` (Go 1.21+) is the structured default; no third-party logger
needed for new services.

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
slog.SetDefault(logger)
slog.Info("order created", "order_id", id, "total_pence", total)
```

Key-value pairs, not format strings; a request-scoped
`logger.With("request_id", rid)` beats repeating attrs. Implement
`slog.LogValuer` on types carrying secrets so they redact themselves.
What to log, metric naming and trace propagation →
`observability-development`.

## CLIs

- `flag` (stdlib) for single-purpose tools; `spf13/cobra` is the de-facto
  standard for subcommand suites (kubectl-style) — follow the repo.
- Structure: `main()` parses and calls `run(ctx, args, stdout) error`;
  exit codes via one `os.Exit` in main (deferred functions don't run past
  `os.Exit`). Data to stdout, diagnostics to stderr, non-zero exit on
  failure — the contract that makes tools scriptable.
- Wire `signal.NotifyContext` so Ctrl-C cancels cleanly through the same
  ctx plumbing as a service.
