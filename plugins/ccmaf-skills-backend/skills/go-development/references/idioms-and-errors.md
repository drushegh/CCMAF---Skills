# Idioms and Errors

## Naming and shape

- **MixedCaps**, never underscores; the case of the first letter *is* the
  access control (exported vs unexported).
- **Short names close to use**: `i`, `r`, `buf` in a ten-line function;
  descriptive names for package-level and exported identifiers.
- **Package names**: short, lowercase, singular, no `util`/`common`/`base`
  grab-bags. No stutter — `bytes.Buffer`, not `bytes.BytesBuffer`; callers
  read the qualified name.
- **Receivers**: one or two letters (`func (s *Server)`), consistent across
  all methods of the type. Pointer receivers when the method mutates or
  the struct is large; don't mix pointer and value receivers on one type.
- **Doc comments** on every exported identifier, starting with its name:
  `// ParsePort parses s as a TCP port number.`
- **Early return over nesting.** Handle the error/edge case and return;
  the happy path stays at minimal indentation down the left margin.

## Zero values and construction

Design types so `var x T` is usable: `sync.Mutex`, `bytes.Buffer` and
`http.Client` all work uninitialised. Add a constructor only when there is
an invariant to enforce — then make it `NewX(...) (*X, error)` and validate
there, so an `X` that exists is always valid. For optional configuration
prefer a config struct parameter over functional options until the option
count genuinely hurts.

## The error model

Errors are ordinary values flowing up the call stack; every return site
decides to handle, wrap, or pass through. The chain is built with `%w` and
inspected with `errors.Is`/`errors.As`:

```go
var ErrNotFound = errors.New("not found") // sentinel: package-level, documented

type ValidationError struct {
    Field string
    Msg   string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Msg)
}
```

```go
item, err := store.Get(ctx, id)
if err != nil {
    return fmt.Errorf("fetching item %s: %w", id, err) // add what YOU were doing
}
```

```go
if errors.Is(err, ErrNotFound) {            // sentinel match through the chain
    return nil
}
var verr *ValidationError
if errors.As(err, &verr) {                  // typed match, extracts the value
    log.Printf("bad field: %s", verr.Field)
}
```

Choosing the error kind:

| Kind | Use when | Caller matches with |
|---|---|---|
| Sentinel (`var ErrX = errors.New`) | One well-known condition, no payload | `errors.Is` |
| Typed (`struct` implementing `error`) | Caller needs fields (which input, what limit) | `errors.As` |
| Opaque (wrapped with `%v` or plain message) | Callers should not branch on it | nothing — that's the point |
| Joined (`errors.Join(errs...)`) | Aggregating independent failures (validation, cleanup) | `Is`/`As` match any branch |

Rules:

- **`%w` is API.** Once you wrap a sentinel or typed error, callers depend
  on unwrapping it — removing the `%w` later is a breaking change. At
  package boundaries decide deliberately: expose the cause (`%w`) or seal
  it (`%v`).
- **Add context, not noise.** Wrap with what the current function was
  doing (`"parsing manifest: %w"`), not `"error: %w"`. Don't re-state what
  the callee already said.
- **Handle once.** The function that finally *acts* on the error (logs,
  converts to an HTTP status, retries) is the one place it gets handled.
- **Never `err.Error()` string matching** — it breaks on any message edit.

## Panics

`panic` means "a programmer broke an invariant", never "input was bad".
Acceptable: package init with `Must*` on literals (a
`regexp.MustCompile` of a constant pattern), impossible default branches
after exhaustive handling. `recover` belongs only at a boundary that must
survive — a request handler, a worker goroutine — and it re-logs with
stack (`debug.Stack()`) and fails that unit of work, nothing more. A
library that panics on bad input is defective.

## Close, flush, and defer

`defer` runs last-in-first-out and evaluates its *arguments* immediately at
the defer statement. For write-side resources, the `Close` error is real
data loss — capture it:

```go
func WriteReport(path string, data []byte) (err error) {
    f, err := os.Create(path)
    if err != nil {
        return fmt.Errorf("creating report: %w", err)
    }
    defer func() {
        if cerr := f.Close(); cerr != nil && err == nil {
            err = fmt.Errorf("closing report: %w", cerr)
        }
    }()
    _, err = f.Write(data)
    return err
}
```
