# Changelogs and Release Notes

A changelog is a curated, human-readable record of what changed between
versions, written for the people affected by the change — not a
reformatted commit log. The open convention is **Keep a Changelog**
(keepachangelog.com), paired with semantic versioning; both are stable
standards (as of July 2026 — re-verify the sites for revisions).

## Keep a Changelog conventions

```markdown
# Changelog

## [Unreleased]
### Added
- CSV export on the reports page.

## [2.3.0] - 2026-07-01
### Changed
- Session tokens now rotate on privilege change; active sessions
  survive, but long-lived automation tokens must be re-issued
  (see Upgrading below).
### Fixed
- Report totals no longer double-count refunded orders (#412).
### Security
- Upgraded libxml to close CVE-2026-XXXX.
```

- One file, `CHANGELOG.md`, newest first, one section per released
  version with an ISO date.
- **Categories, in this order where present:** Added, Changed,
  Deprecated, Removed, Fixed, Security. The category does half the
  reader's triage.
- **An `[Unreleased]` section at the top** — entries land in the same PR
  as the change, then move under a version heading at release. Writing
  the changelog at release time from memory (or from `git log`) is how
  changelogs die.
- Version headings link to the diff/compare view where the platform
  supports it.

## Writing entries

- **Describe the impact on the user of the software, not the internal
  change.** "Refactored the billing module" is not a changelog entry;
  "Invoices for organisations with multiple VAT numbers now itemise per
  number" is. If a change has no user-visible impact, it usually doesn't
  need an entry.
- **Breaking changes are loud and actionable.** Mark them explicitly
  (**BREAKING** prefix or a dedicated subsection), state what breaks,
  who is affected, and the exact migration step. A breaking change whose
  entry doesn't tell the reader what to *do* is undocumented.
- **Deprecations state the replacement and the removal timeline** — see
  the deprecation communication pattern below.
- Link the issue/PR for depth; credit external contributors.
- Entries are reference mode: factual, austere, no marketing adjectives.

## Release notes vs changelog

| | Changelog | Release notes |
|---|---|---|
| Audience | Users/operators upgrading | Broader: customers, stakeholders |
| Coverage | Complete record of every notable change | Curated highlights + narrative |
| Voice | Austere reference | Explanatory, can carry enthusiasm |
| Home | `CHANGELOG.md` in the repo | Blog/announcement/release page |

Derive release notes *from* the changelog, never the reverse. Small
projects need only the changelog.

## Generating from commits

Conventional-commit tooling can draft a changelog from commit history
(commit conventions themselves → `git-workflow`). The working rule:
**generated output is a draft, not a deliverable.** Commit messages are
written by-change for reviewers; changelog entries are written by-impact
for users — the mapping needs an editor. Generate, then: merge related
commits into one entry, delete internal-only noise, rewrite subjects
into impact statements, and hoist breaking changes to the top. A raw
generated dump ships the commit log with extra steps.

## Communicating breaking change and deprecation

The pattern for anything consumers depend on:

1. **Announce** in version N: changelog Deprecated entry + a runtime
   warning where the platform allows, naming the replacement and the
   removal version.
2. **Warn** through N+x: keep the old path working; make the warning
   increasingly visible.
3. **Remove** in the stated major: changelog Removed entry pointing at
   the migration guide.

For a major release with several breaking changes, ship an
**UPGRADING.md** (or migration guide): per breaking change — who is
affected, before/after code, and the mechanical steps, in execution
order. The playbook for *performing* such upgrades from the consumer
side, and deprecation mechanics in code, belong to
`legacy-modernisation`; HTTP API deprecation (Sunset headers, API
versioning) to `api-development`.

## Anti-patterns

- **The commit dump** — internal churn verbatim; users can't find what
  affects them.
- **"Various fixes and improvements"** — an entry that documents nothing
  and signals the changelog can't be trusted.
- **Backfilled at release** — reconstructed from memory, always
  incomplete. The entry belongs in the change's own PR.
- **Missing dates or non-ISO dates** — "last month" is meaningless in an
  archive; use YYYY-MM-DD.
- **Breaking change buried under Fixed** — miscategorised surprises are
  how upgrades come to be feared.
- **Unbounded `[Unreleased]`** — a year of unshipped entries means the
  release discipline, not the changelog, is broken.
