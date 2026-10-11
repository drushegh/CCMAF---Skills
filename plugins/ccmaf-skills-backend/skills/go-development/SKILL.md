---
name: go-development
description: >-
  Modern Go (1.22+) engineering standards: idioms, the error-handling model
  (wrapping, errors.Is/As), goroutine/channel/context discipline and the
  race detector, interfaces/composition/generics, project layout and
  modules, table-driven testing with fuzzing and benchmarks, and building
  HTTP services and CLIs, with detailed topic references loaded on demand.
  Use this skill whenever any .go file, go.mod or go.sum is created,
  edited, reviewed, or debugged — even if the user doesn't mention
  standards. Triggers include: writing Go packages, structs, interfaces,
  goroutines or channels; "nil pointer dereference", "interface conversion"
  or nil-map panics; "all goroutines are asleep - deadlock"; DATA RACE
  reports; context cancellation or timeouts; go.mod, module or vendoring
  questions; go test, table-driven tests, fuzzing or benchmarks;
  gofmt/go vet/staticcheck/golangci-lint findings; net/http services,
  middleware or graceful shutdown; CLI tools in Go; cross-compilation and
  static binaries; reviewing any Go code.
---

# Go Development

Consolidated Go engineering standards for agents writing production code.
The rules in this file always apply. Load `references/` files only when the
task touches that topic.

## Baseline

The `go` directive in go.mod — not the installed toolchain — governs
language semantics (per-iteration loop variables need a module declaring
`go 1.22`+). Read go.mod first, match its floor, never silently bump it.

Version context (July 2026 — re-verify before asserting): Go releases each
February and August and supports the two newest majors — 1.25 (August 2025)
and 1.26 (February 2026) as of this writing. Feature floors that matter:
generics (1.18), `slog` (1.21), loop-variable fix + ServeMux patterns
(1.22), range-over-func iterators (1.23), `testing.B.Loop` + go.mod `tool`
directive + JSON `omitzero` (1.24), `testing/synctest` + `WaitGroup.Go` (1.25).

## Core Principles

1. **Clear is better than clever.** Idiomatic Go is boring and obvious —
   early returns, small functions, no inheritance gymnastics.
2. **Errors are values — handle every one.** There are no exceptions; the
   `if err != nil` at every call site *is* the design. Wrap with context
   and return; details below.
3. **Accept interfaces, return structs.** Define interfaces where they are
   *consumed*, keep them small (1–3 methods), and return concrete types so
   callers get the full API.
4. **Make the zero value useful.** `var mu sync.Mutex` works without a
   constructor; design types the same way — `NewX` only for invariants.
5. **A goroutine is a resource with a lifecycle.** Never start one without
   knowing how it stops. Concurrency is a design decision, not a
   performance sprinkle.
6. **A little copying is better than a little dependency.** The stdlib
   covers HTTP, JSON, testing and crypto; a module must earn its cost.

## Error Handling — non-negotiable

- **Wrap with operational context:** `fmt.Errorf("loading config %q: %w",
  path, err)`. Use `%w` when callers may need to match the cause; `%v` to
  deliberately make it opaque at a package boundary.
- **Match with `errors.Is` (sentinels) and `errors.As` (typed errors)** —
  never string-match `err.Error()`.
- **Handle once.** Log the error *or* return it, never both — double
  handling produces duplicate, contextless log noise.
- **Never discard with `_`** unless a comment states why it is safe.
- **`panic` is for programmer bugs**, not expected failures; `recover` only
  at a goroutine/handler boundary; init-time `Must*` helpers are fine.
- **Check `Close` errors on writes** (`defer` swallowing a flush error
  corrupts data silently); read-side `defer f.Close()` is fine.
  Details: [references/idioms-and-errors.md](references/idioms-and-errors.md).

## Tooling

```bash
gofmt -l .                # must print nothing; goimports also fixes imports
go vet ./...              # the compiler-adjacent floor
staticcheck ./...         # or: golangci-lint run (follow the repo)
go test -race ./...       # race detector on, always in CI
go mod tidy               # must leave no diff at task end
govulncheck ./...         # known-vuln scan on new/changed dependencies
```

## Critical Pitfalls — always check

```go
// 1. Nil map — reads work, writes panic
var counts map[string]int
counts = make(map[string]int)      // make (or a literal) before any write

// 2. Slice append aliasing — shared backing array
a := []int{1, 2, 3, 4}
b := append(a[:2], 99)             // overwrites a[2]; a and b share memory
c := slices.Clone(a[:2])           // clone when a sub-slice escapes your control

// 3. Goroutine with no exit path — leaks forever
go func() {
    for {
        select {
        case v := <-in:
            handle(v)
        case <-ctx.Done():         // without this arm it never stops
            return
        }
    }
}()

// 4. defer in a loop — nothing releases until the function returns
for _, p := range paths {
    processFile(p)                 // extract the body; defer f.Close() inside it
}
```

Also: typed-nil interfaces (a nil `*ParseError` returned as `error` is
non-nil — see [references/interfaces-and-generics.md](references/interfaces-and-generics.md));
shadowed `err` from `:=` inside a block; copying a struct containing a
`sync.Mutex` (vet catches it); `WaitGroup.Add` inside the goroutine; HTTP
response bodies not closed; loop-var capture in modules declaring `go` < 1.22.

## Anti-Rationalisation — STOP before you...

| You're about to... | Instead |
|---|---|
| Discard an error with `_` because "it can't fail" | Handle it, or comment exactly why dropping is safe |
| `panic` because plumbing an error up is tedious | Return the error; the plumbing is the language working |
| Define an interface next to its only implementation "for mocking" | Define at the consumer, when a real seam exists |
| Start a goroutine because it's cheap | Decide how it stops first — leak now, debug at 3am later |
| Skip `-race` because it's slow | CI runs it, minimum; a race found in prod costs a week |
| Store a `context.Context` in a struct field | Pass ctx per call; stored contexts outlive their cancellation |
| Reach for generics "for future flexibility" | Write it concrete; generalise when the second caller exists |
| Add a framework for routing/JSON/config | net/http, encoding/json and flag cover most services |

## Agent Workflow Rules

1. **Read go.mod first** — the `go` directive (semantics floor), existing
   dependencies and layout. Match repo conventions (stdlib mux vs chi,
   stdlib testing vs testify) rather than importing your own preferences.
2. **gofmt after every edit.** Unformatted Go is a defect, not a style
   choice — there is no debate to have.
3. **Compile and vet early**: `go build ./...` + `go vet ./...` after each
   meaningful unit; the compiler is the fastest feedback loop you have.
4. **Before completion**: `gofmt -l .` prints nothing; `go vet`;
   staticcheck/golangci-lint per repo; `go test -race ./...`; `go mod tidy`
   leaves no diff; `govulncheck` if deps changed; no stray `fmt.Println`.
5. **Verify modules and APIs exist before importing** (the
   `read-the-damn-docs` discipline) — never guess an import path or
   function signature from memory.

## Reference Index

| Load when the task involves... | File |
|---|---|
| Naming, zero values, error wrapping, sentinels vs typed errors, panic/recover | [references/idioms-and-errors.md](references/idioms-and-errors.md) |
| Goroutines, channels, select, mutex-vs-channel, errgroup, context, races, leaks | [references/concurrency-and-context.md](references/concurrency-and-context.md) |
| Interface design, embedding, method sets, typed-nil, generics and constraints | [references/interfaces-and-generics.md](references/interfaces-and-generics.md) |
| Layout (cmd/internal), modules, versioning, tool deps, lint config, cross-compiling | [references/project-and-modules.md](references/project-and-modules.md) |
| Table-driven tests, fuzzing, benchmarks, golden files, httptest, synctest | [references/testing.md](references/testing.md) |
| net/http services, ServeMux patterns, middleware, timeouts, shutdown, JSON, slog, CLIs | [references/services-and-clis.md](references/services-and-clis.md) |

## Boundaries

- **API design** (URIs, versioning, problem+json, OpenAPI, pagination) →
  `api-development`. This skill owns the Go implementation of the handler.
- **Containerising the binary** (scratch/distroless, multi-stage) →
  `containers-development`; **cluster platform work** (manifests, Helm,
  GitOps) → `kubernetes-development`. This skill owns the Go code inside.
- **Messaging architecture** (Kafka consumers, outbox, idempotency,
  delivery semantics) → `event-driven-development`; this skill owns the
  goroutine/channel mechanics of implementing a consumer.
- **Telemetry design** (OTel, SLOs, metric naming) →
  `observability-development`; **the debugging method** →
  `systematic-debugging`. `slog`, `-race` and pprof mechanics stay here.
- **Test strategy above unit level** (E2E, load, contract) →
  `testing-development`. **CI pipelines** → `devops-development`.
- **Security review depth** (OWASP, threat modelling, supply chain) →
  `secure-development`; `govulncheck` here is the floor, not the review.
- **Verifying third-party module APIs and versions** → `read-the-damn-docs`.
- **The systems-language boundary**: no-GC constraints, ownership/FFI-heavy
  work → `rust-development` occupies the adjacent slot.
