# Project Layout and Modules

## Layout — start small, grow deliberately

Follow the official guidance (go.dev/doc/modules/layout), not the
widely-cargo-culted "golang-standards/project-layout" repo — that one is
**not** official, and `pkg/` in particular is convention theatre for most
projects.

```text
myservice/
  go.mod
  main.go              # single binary: main at the root is fine
  cmd/                 # multiple binaries: one subdirectory per command
    api/main.go
    worker/main.go
  internal/            # compiler-enforced privacy: importable only within this module
    order/             # package per DOMAIN, not per kind
    billing/
  testdata/            # ignored by the toolchain; fixtures live here
```

- **Package by domain** (`order`, `billing`), not by layer (`models`,
  `handlers`, `utils`). A `utils` package is a name for "I didn't decide
  where this belongs".
- **`internal/` by default** for anything not deliberately public API;
  promotion out of internal is a considered, one-way act.
- `main.go` stays thin: flag parsing, wiring, `run(ctx) error` — logic
  lives in importable (testable) packages.

## Modules

- `go.mod` anatomy: `module` path (the import prefix — for published code,
  the repo URL), `go` directive (language semantics floor — see SKILL.md
  Baseline), optional `toolchain` (minimum toolchain that builds it).
- **Commit `go.sum` always** — it is the integrity record for the module
  graph, not a lockfile to regenerate.
- `go mod tidy` before completion; a dirty tidy diff means undeclared or
  stale dependencies.
- **Major versions are import paths**: v2+ modules carry a `/v2` suffix in
  both `module` directive and import paths (semantic import versioning).
  Releasing v2 without the suffix breaks every consumer.
- `replace` directives are for local development only — remove before
  publishing (they don't apply to downstream consumers anyway).
- Multi-module local work: `go.work` workspaces; keep `go.work` out of
  version control as a rule.
- Published modules: tag `vX.Y.Z`; a bad release gets a `retract`
  directive in go.mod, not a deleted tag.

## Tool dependencies

Go 1.24+ tracks dev tools in go.mod directly:

```bash
go get -tool honnef.co/go/tools/cmd/staticcheck
go tool staticcheck ./...
```

Pre-1.24 repos use the `tools.go` (blank-import) pattern — follow whatever
the repo already does.

## Lint and vet configuration

`go vet` is non-negotiable. Beyond it, prefer whichever the repo has:
`staticcheck` standalone, or `golangci-lint` with a committed
`.golangci.yml` (typical enables: `staticcheck`, `govet`, `errcheck`,
`ineffassign`, `unused`, `gosec`). Fix findings rather than suppressing;
a `//nolint:<linter> // reason` without the reason is a review reject.
`govulncheck ./...` (golang.org/x/vuln) gates releases — it reports only
vulnerabilities on *reachable* call paths, so its findings are actionable,
not noise.

## Building and cross-compiling

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath \
  -ldflags "-s -w -X main.version=$(git describe --tags --always)" \
  -o bin/api ./cmd/api
```

- `CGO_ENABLED=0` gives a static binary — the reason `FROM scratch` /
  distroless images work (image build itself →
  `containers-development`).
- `GOOS`/`GOARCH` cross-compile from any host; no toolchain zoo needed.
- `-trimpath` for reproducible builds; `-X` stamps version info onto a
  package variable; `-s -w` strips symbol/debug tables (skip if you want
  usable core dumps).
- `GOTOOLCHAIN=auto` (default) downloads the toolchain a module demands —
  pin `GOTOOLCHAIN` in CI if that behaviour surprises your build farm.

## Dependency hygiene

Stdlib first (`net/http`, `encoding/json`, `database/sql`, `testing`
cover most services). When a module is genuinely warranted: verify the
import path and API against its documentation before writing the import
(`read-the-damn-docs`); prefer maintained, low-dependency modules; check
`go mod graph` when the tree balloons. The Go module proxy + sumdb give
integrity by default — don't disable `GOFLAGS=-mod=mod` sum checking to
"fix" an error that is telling you something.
