# Deprecation Management

Deprecation is the mechanism that lets living systems shed code without
breaking their consumers: mark, warn, migrate, remove. It runs in two
directions — **consuming** deprecations aimed at you by your
dependencies, and **issuing** them for code paths you own — and both
fail the same way: a warning treated as wallpaper, or a marker with no
removal plan behind it.

## Consuming deprecations

Deprecation warnings from frameworks and libraries are the vendor's
itemised bill for your next major upgrade, delivered early enough to pay
in instalments.

- **Treat warnings as a work queue, not noise.** Triage new ones as they
  appear; each is a migration you can do now, cheaply, with the old
  behaviour still present to compare against.
- **Surface them in CI.** Most toolchains can promote deprecation
  warnings to errors (test-runner filters, compiler flags, runtime
  switches). On a legacy estate that would fail everything at once, use
  a **ratchet** instead: count warnings, fail the build only when the
  count *rises*, and burn the baseline down deliberately.
- **Fix them before the major bump, on the old version** — this is step
  4 of the upgrade playbook (→ `upgrade-playbooks.md`), and the reason
  consuming deprecations well makes upgrades boring.

## Issuing deprecations (code you own)

Every language has a marker (`@Deprecated`, `[Obsolete]`,
`@deprecated` JSDoc, `DeprecationWarning`, …) and the marker is the
least of it. A deprecation is complete when it has:

1. **The mark**, so tooling warns at every use site.
2. **A message that names the replacement** and the removal version or
   date — "use X instead; removed in v5" — not just "deprecated". The
   message is documentation delivered at the call site.
3. **A migration path that exists** — the replacement is shipped,
   documented, and at least as capable for the supported cases, before
   the old path is marked. Deprecating towards a promise breeds
   justified ignoring.
4. **Instrumentation** — a log line or counter on the old path, so
   "is anyone still using this?" is a query, not a guess.
5. **A removal plan with a date/version and an owner.** Deprecation
   without scheduled removal is decoration; the codebase accretes
   half-dead paths that all still need maintaining.

Communicate per audience: internal callers get the ratchet (below);
library consumers get changelog Deprecated entries and the
announce/warn/remove cycle (→ `technical-writing`'s
changelogs reference); external HTTP API consumers get versioning,
Deprecation/Sunset headers and comms → `api-development`.

## The ratchet

The tool for retiring a *pattern* while the estate still contains it:
forbid new uses, burn down old ones. Implement as a lint rule or grep
check with an explicit allowlist of existing offenders (or a count
baseline); CI fails on any *new* use; the allowlist only ever shrinks.
This decouples "stop the bleeding" (immediate) from "drain the backlog"
(scheduled), which is what makes large-scale convention migrations
finishable at all. The count over time is the migration's progress
meter — and its stall alarm.

## Dead-code identification

"Looks unused" is a hypothesis. Evidence, in increasing strength:

- **Static reachability** — no references found. Necessary but not
  sufficient: reflection, dynamic dispatch, config-driven wiring,
  external callers and templates all defeat static analysis.
- **Runtime evidence** — production coverage, log counters or traces on
  the suspect path over a *representative* window. Beware seasonality:
  month-end, quarter-end, year-end and disaster-recovery paths show no
  traffic in a fortnight of telemetry and matter most of all. Check the
  calendar-driven business processes before trusting any window.
- **The scream test** — make the path visibly inert (feature-flag it
  off, return a distinctive warning, remove one entry point) in a way
  that is instantly reversible, and wait a full business cycle. Whoever
  screams is your undocumented consumer; silence is evidence. Crude,
  effective, and honest about what documentation didn't capture.

## Removal discipline

- **Delete, don't comment out and don't flag-park forever.** Version
  control is the archive (recovering deleted code → `git-workflow`);
  commented-out corpses and permanently-off flags are noise that still
  costs comprehension.
- Remove in a **dedicated commit** ("remove deprecated X, unused since
  telemetry window Y") — trivially revertible, trivially auditable.
- Data-touching removals follow expand–contract sequencing: code stops
  writing, then stops reading, then the storage goes (schema side →
  `sql-development`).
- **Sunsetting a user-facing feature** adds the human layer: user
  comms with dates, a migration guide, a grace period, and data export
  where users' data is involved — then the code removal above.

## Anti-patterns

- **The warning wallpaper** — hundreds of ignored deprecation warnings
  concealing the three that matter. The ratchet exists for this.
- **Deprecated-forever** — marks with no dates, no telemetry, no owner;
  both paths maintained indefinitely.
- **Removal by surprise** — deleting on schedule without ever having
  instrumented; the removal *is* the scream test, in production, without
  the reversibility.
- **The allowlist that grows** — a ratchet nobody enforces is a comment.
