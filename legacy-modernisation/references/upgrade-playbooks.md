# Upgrade Playbooks

Framework, runtime and major-dependency upgrades are routine
maintenance, not projects — and the teams that treat them that way pay
least for them. Small, frequent upgrades ride the paved path (current
docs, fresh migration guides, official codemods, forums full of your
exact error); rare, big-bang upgrades combine several majors' breakage
into one undifferentiated pile and debug it all at once. The strategic
rule: **stay close to current, on a cadence**; the tactical playbook
below is for each hop.

## The playbook

1. **Inventory.** Current versions of runtime, framework and direct
   dependencies; their support/EOL status. An EOL runtime is a security
   finding, not just tech debt (→ `secure-development`).
2. **Read before touching** — release notes, breaking-changes list and
   the official migration guide for the *target* version, and the
   upgrade guides for the majors in between. Verify claims against the
   real docs for the pinned target, not memory (→ `read-the-damn-docs`).
3. **Green baseline.** Full suite passing on the current version before
   anything moves — fix or quarantine flaky tests first, or every
   upgrade failure gets tangled with pre-existing noise. If coverage
   over critical paths is thin, add characterisation tests now
   (→ `characterisation-tests.md`).
4. **Clear deprecations on N first.** Turn deprecation warnings into
   errors in CI and fix them all *while still on the current version* —
   they are the vendor's itemised list of what the next major breaks,
   fixable one at a time with the old behaviour still available to
   compare against (→ `deprecation-management.md`).
5. **One major at a time.** N → N+1 → N+2, shipping (or at least
   fully verifying) at each stop. Order within a hop per the vendor's
   guide; default: direct dependencies compatible with both versions
   first, then the framework/runtime itself.
6. **Use the official upgrade tooling** where the ecosystem ships it —
   framework codemods, upgrade assistants, `ng update`-style schematics
   (run under the codemod protocol:
   `codemods-and-mechanical-refactors.md`). Check what exists for the
   target before hand-fixing; the landscape moves, re-verify per
   ecosystem (as of July 2026: React/Next.js publish codemods, Angular
   ships `ng update`, .NET the Upgrade Assistant, Rails
   `app:update` + framework-defaults toggles).
7. **Upgrade in a clean slice.** The upgrade commit(s) contain the
   version bump and the minimal code changes it forces — nothing
   opportunistic. "While I'm here" refactors hide upgrade regressions
   and make the diff unreviewable.
8. **Verify like a release:** full suite, build, smoke on a real
   environment; then watch production telemetry after shipping. Only
   then start the next hop.

## Lockfiles and rollback

The lockfile is the upgrade's audit trail and its rollback: commit it
with the bump; never mix an upgrade's lockfile churn with feature work;
rollback = revert the bump commit(s), which must remain cleanly
revertible until the upgrade has soaked in production. Runtime upgrades
roll back via the previous image/toolchain pin — keep the old build
reproducible until then. Data written in a new format is the rollback
killer: check the migration guide for serialisation/schema changes and
sequence them expand–contract style (schema side → `sql-development`)
so version N-1 code can still read what N wrote during the soak.

## Runtime and platform upgrades

Language runtimes and base images get one extra tool: the **CI matrix**.
Run the suite on current and target versions side by side while the code
is made compatible with both, then flip the default and drop the old
lane. Containers make this cheap — the target runtime is one image tag
away (container mechanics → `containers-development`). The same
both-versions window is what allows a canary deployment of the new
runtime rather than a fleet-wide flip.

## Blocked upgrades

- **Abandoned dependency in the path.** Options in order: replace with a
  maintained alternative behind an adapter; fork and patch minimally
  (now you own it — record the decision as an ADR); vendor it and
  freeze. Ignoring it pins your whole estate to its EOL.
- **Transitive version conflicts.** Package-manager overrides/
  resolutions are legitimate as *temporary, documented* patches with a
  removal condition — an override nobody remembers is a landmine.
- **The far-behind estate** (several majors, EOL runtime): don't
  hero-jump. Get to the nearest still-supported version first (security
  floor), then resume one-at-a-time. If the framework gap is so large
  that per-major guides no longer exist, treat it as a migration, not an
  upgrade — strangler-fig the framework boundary itself
  (→ `strangler-fig-and-incremental.md`).

## Cadence

Schedule upgrades like any other recurring obligation: dependency bumps
continuously (automated PRs — Renovate/Dependabot-style — merged while
diffs are small; supply-chain vetting → `secure-development`), minor
framework/runtime versions on a regular rhythm, majors within their
support windows rather than at EOL gunpoint. Follow the ecosystem's LTS
lines and plan hops LTS-to-LTS unless a feature pulls you forward. The
cheapest upgrade is the one that's barely behind.
