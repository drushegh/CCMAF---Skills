# Testing

Stdlib `testing` is the idiom — assertion libraries are optional
(`testify` is common; follow the repo, don't introduce it into a stdlib
codebase). Tests live beside the code as `_test.go`; `package foo_test`
(external) when you want to test the public API only.

## Table-driven tests — the default shape

```go
func TestParsePort(t *testing.T) {
    tests := map[string]struct {
        in      string
        want    int
        wantErr bool
    }{
        "valid":       {in: "8080", want: 8080},
        "zero":        {in: "0", wantErr: true},
        "not numeric": {in: "x", wantErr: true},
        "too large":   {in: "70000", wantErr: true},
    }
    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            got, err := ParsePort(tc.in)
            if (err != nil) != tc.wantErr {
                t.Fatalf("ParsePort(%q) error = %v, wantErr %v", tc.in, err, tc.wantErr)
            }
            if got != tc.want {
                t.Errorf("ParsePort(%q) = %d, want %d", tc.in, got, tc.want)
            }
        })
    }
}
```

- Map keys double as subtest names (and randomise order — order-dependent
  tests surface fast). `t.Run` gives per-case reporting and
  `go test -run TestParsePort/zero` targeting.
- `t.Fatalf` when continuing is meaningless; `t.Errorf` to collect
  multiple failures. `got`/`want` phrasing, always in that order.
- Struct comparison: `cmp.Diff` (google/go-cmp) — readable diffs,
  `cmpopts.IgnoreFields` for timestamps. Mark test helpers with
  `t.Helper()` so failures blame the caller's line.
- Cleanup: `t.Cleanup(fn)` over defer (works in helpers); `t.TempDir()`
  auto-removes; fixtures under `testdata/` (toolchain-ignored).
- `t.Parallel()` at the top of independent subtests to shake out shared
  state — with `-race`, this is a free concurrency audit.

## Fuzzing (Go 1.18+)

```go
func FuzzParsePort(f *testing.F) {
    f.Add("8080")                       // seed corpus
    f.Add("")
    f.Fuzz(func(t *testing.T, s string) {
        _, _ = ParsePort(s)             // invariant: never panics
    })
}
```

Run: `go test -fuzz=FuzzParsePort -fuzztime=30s ./pkg/...` (one fuzz
target per invocation). Assert invariants, not exact outputs: no panic,
round-trips (`decode(encode(x)) == x`), validated values re-validate.
Found crashers land in `testdata/fuzz/` — commit them; they become
permanent regression cases run by plain `go test`. Fuzz anything parsing
untrusted input.

## Benchmarks

```go
func BenchmarkParsePort(b *testing.B) {
    for b.Loop() {                      // Go 1.24+; setup outside is excluded automatically
        ParsePort("8080")
    }
}
```

Pre-1.24 modules use `for i := 0; i < b.N; i++` with `b.ResetTimer()`
after setup. Run with `go test -bench=. -benchmem`; compare before/after
with `benchstat` (golang.org/x/perf) across ≥10 runs (`-count=10`) —
single-run deltas are noise. Never trust a benchmark whose result is
unused — `b.Loop` prevents dead-code elimination; the old idiom needs a
package-level sink.

## Integration seams

- **HTTP**: `httptest.NewServer` for real client/server round-trips;
  `httptest.NewRecorder` for handler-only tests.
- **Slow/external tests**: guard with `testing.Short()` and run
  `go test -short` in the inner loop; or build tags
  (`//go:build integration`). Real containers for DBs → the
  testcontainers pattern (`testing-development` owns test-data strategy).
- **`TestMain(m *testing.M)`** for expensive per-package setup; keep it
  rare.
- **Examples as tests**: `func ExampleParsePort()` with an `// Output:`
  comment compiles *and* asserts — documentation that cannot rot.
- **Time and concurrency**: inject clocks or use `testing/synctest`
  (Go 1.25+) — never `time.Sleep` synchronisation; it is the number one
  flake source.

## The completion gate

`go test -race ./...` green, including `-count=1` if you suspect cached
results are lying (`go clean -testcache` for a hard reset). Coverage:
`go test -cover` for signal, `-coverprofile` + `go tool cover -html` to
find untested branches — chase meaningful gaps (error paths), not a
percentage. Every bug fix starts with a failing regression test that the
fix turns green.
