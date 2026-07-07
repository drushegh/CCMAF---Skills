# Docs-as-Code and Doc Review

Docs-as-code means documentation lives where the code lives and moves
how the code moves: same repository, same branch/PR workflow, same
review bar, same CI. The point is coupling — when docs and code share a
change, drift needs an act of negligence rather than an act of memory.

## Principles

- **Same change, same PR.** A behaviour, interface or operational change
  updates its documentation in the same PR, and reviewers treat a stale
  doc like a failing test. "Docs to follow" is drift with a due date no
  one enforces.
- **Plain text, versioned.** Markdown (or AsciiDoc/reStructuredText) in
  git — diffable, reviewable, greppable. Binary formats and wikis
  outside version control forfeit review and history.
- **One home per topic.** Duplicated content (README vs docs site vs
  wiki) always drifts; pick a home and link from everywhere else.
- **Docs have owners.** Every page has a responsible team/person;
  unowned docs rot with nobody obliged to notice.

## Toolchain landscape

As of July 2026 — a fast-moving space, re-verify before recommending:

- **Static site generators:** MkDocs (+ Material theme) — Python
  ecosystem, fastest to a good result; Docusaurus — React/JS ecosystem,
  versioned docs built in; Sphinx — Python's standard for API-heavy
  reference docs (autodoc); Astro Starlight — the newer lightweight
  option. Choose by ecosystem affinity; a `docs/` tree of plain Markdown
  in the repo is a valid v1 and migrates cleanly to any of them later.
- **Prose linting:** Vale — style-guide-as-code; ships packages for the
  Google and Microsoft style guides and takes per-project vocabularies
  and custom rules (this is where "never simply" becomes enforceable).
  markdownlint for Markdown mechanics.
- **Link checking:** lychee (or equivalent) in CI, on a schedule as well
  as on PRs — external links rot without any commit.
- **Spelling:** codespell/cspell with a committed project dictionary.

Adopt an open style guide rather than writing one: the **Google
developer documentation style guide** or the **Microsoft Writing Style
Guide** (both free, both maintained). Record project-specific deviations
in a short supplement and encode what's encodable in Vale.

## Verifying samples in CI

The docs claims that break trust fastest are executable ones. In rising
order of strength:

1. **Syntax-check fenced code blocks** — extract and parse with the real
   toolchain (compile Python blocks, `node --check` JS, parse YAML/JSON).
   Catches rot cheaply.
2. **Include, don't paste** — pull snippets into docs from real source
   files by marker/region (most site generators support include
   directives), so the sample is the code that CI already compiles and
   tests.
3. **Execute the docs** — doctest-style tools run examples and compare
   output; a CI job that executes the README quickstart on a clean
   container is the strongest guarantee a docs pipeline can offer, and
   worth it for the front door.

Where none of this is available for a snippet, date-stamp it and say
what it was tested against.

## The doc review checklist

Docs are reviewed by PR like code (`code-review-development` routes
document review here). Review in this order — accuracy outranks polish:

1. **Accurate?** Commands run, samples execute, claims match the current
   system, versions right. An inaccurate doc is worse than no doc.
2. **Right type and mode?** Correct genre for the reader's situation;
   Diátaxis mode held throughout; no tutorial/reference blending.
3. **Complete for the task?** Reader reaches the stated goal — including
   failure paths, errors, and the "you're done when…" checkpoint.
4. **Front-loaded and scannable?** First screen answers what/who/why;
   headings alone tell the story; no wall-of-text sections.
5. **Fresh-reader test.** Assume no chat/team context: undefined jargon,
   assumed setup, missing prerequisites are findings.
6. **Perishables date-stamped?** Versions, tool claims, URLs.
7. **Style.** Lint-clean (Vale/markdownlint); de-slopped (→ `uncanny`);
   difficulty adjectives absent.

Severity framing for findings: inaccurate > incomplete > unclear >
style-nit. Block on the first two; batch the rest.

## Freshness

- **Last-reviewed stamps** on operational and reference pages; a CI or
  scheduled job flags pages past their review interval.
- **Delete dead docs.** A page describing a removed system misdirects
  with authority. Git remembers; readers don't need the tombstone.
- **Measure by contact points:** docs raised in support questions,
  incident reviews and onboarding feedback are the priority queue for
  the next docs pass.
