---
name: technical-writing
description: >-
  Authoring the documents software work produces — READMEs, ADRs
  (architecture decision records), runbooks, changelogs and release notes,
  API reference prose, design docs, CONTRIBUTING and onboarding guides —
  structured on the Diátaxis framework (tutorial / how-to / reference /
  explanation). Owns document STRUCTURE and information design: choosing
  the right document type, its anatomy, what it must contain, verifying
  every sample and command, and the docs-as-code toolchain and review
  around it. Use whenever asked to write, restructure or review
  developer-facing documentation: "write a README", "document this", "add
  an ADR", "we need a runbook", "draft the release notes", "review these
  docs", a docs/ site or wiki page, or when a change alters behaviour that
  existing docs describe. PROACTIVELY activate before writing any document
  a developer or operator will rely on. Prose style and AI-tell removal
  route to uncanny; scholarly citation to academic-research; exportable
  diagrams to drawio-development.
---

# Technical Writing

How to author the documents software work produces, to the standard of a
senior technical writer. Most bad documentation fails structurally, not
stylistically: it is the wrong kind of document, aimed at the wrong
reader, mixing modes that serve different needs. This skill owns document
structure and information design — what a good README, ADR, runbook or
changelog *contains* and how it is organised. Sentence-level style and
AI-tell removal belong to `uncanny`; run it over anything this produces.

The organising frame is **Diátaxis** (diataxis.fr, Daniele Procida):
documentation serves four distinct reader needs — learning (tutorial),
achieving a task (how-to), looking up detail (reference), and
understanding (explanation) — and a document serves one at a time.

## Non-negotiables

1. **One document, one mode.** Decide the Diátaxis quadrant before the
   first heading, and hold it. A tutorial that stops to explain design
   history, or a how-to that dumps every option "for completeness", fails
   both readers. Link across modes instead of blending them
   (`references/diataxis-and-doc-types.md`).
2. **Write for the reader's task, not the system's shape.** Organise by
   what the reader is trying to do, never by module layout, team
   structure or the order the code was written in. The test for any
   document: *"After reading this, a [role] can [task]."* If you can't
   complete that sentence, you don't know what you're writing yet.
3. **Docs change with the code, in the same change.** A behaviour,
   interface or operational change that leaves its documentation stale is
   an incomplete change. Docs live in the repo, versioned and reviewed
   like code (`references/docs-as-code-and-review.md`).
4. **Verify everything executable.** Run every command; execute every
   code sample against the stated version; show real output. A sample
   that was never run is a defect, not a draft. Where a sample can't be
   executed in the writing environment, say so in the review notes rather
   than presenting it as tested.
5. **Front-load.** The first screen of any document answers what this is,
   who it's for, and what they'll get. Inverted pyramid: conclusion
   first, detail after. Nobody reads documentation linearly; write for
   the reader who scans headings and jumps.
6. **Date-stamp the perishable.** Version numbers, tool landscapes, URLs,
   pricing, deadlines — anything that drifts gets an as-of date and a
   re-verify instruction, not a timeless assertion.
7. **Decisions are recorded when made, and the record is immutable.**
   Significant decisions get an ADR at decision time, not a retrofitted
   justification. Once accepted, an ADR is never edited into a different
   decision — it is superseded by a new one that links back
   (`references/adrs-and-decision-records.md`).
8. **Runbooks are written to be executed under stress.** Numbered
   imperative steps, one action each, copy-paste commands, a verification
   after every mutating step, and an explicit rollback path. Narrative
   prose in a runbook is a defect (`references/runbooks-and-operational-docs.md`).
9. **Never "simply".** Ban difficulty adjectives — simply, just, easy,
   obviously, straightforward. They add no information and cost the
   reader's trust the moment the step isn't simple for them.

## Choosing the document

| Reader's situation | Document | Diátaxis mode |
|---|---|---|
| New to the tool, wants to learn by doing | Tutorial / getting-started guide | Tutorial |
| Knows the tool, has a task to complete | How-to guide | How-to |
| Mid-task, needs an exact fact (signature, flag, error code) | Reference page / API reference | Reference |
| Wants to understand why it works this way | Explanation / concept page | Explanation |
| Evaluating or arriving at the project | README | Mixed container — each section single-mode (`references/readmes-and-onboarding.md`) |
| Asking "why did we choose X?" months later | ADR | Explanation + record |
| Paged at 03:00 by an alert | Runbook | How-to under stress |
| "What changed between versions?" | Changelog / release notes | Reference |
| Proposing a system change before it's built | Design doc / RFC — implementation plans route to `visual-plan` | Explanation |
| Joining the team, day one | Onboarding guide + CONTRIBUTING | Tutorial + how-to |

## High-frequency pitfalls

- **Mixed-mode documents** — the tutorial that detours into reference
  tables; the reference page that teaches. The most common structural
  failure; split and cross-link instead.
- **The README architecture essay** — three screens of design philosophy
  before the reader learns what the project does or how to run it.
- **Docs organised by code layout** — one page per module instead of one
  page per reader task.
- **Unverified samples** — code that doesn't compile, commands with
  drifted flags, output that no longer matches. Worse than no sample.
- **Post-hoc ADRs** — records written to justify a decision already
  entrenched, with the considered alternatives invented afterwards.
- **Runbook narrative** — "at this point you'll probably want to check
  the queue depth" instead of a numbered step with the exact command.
- **Changelog as commit dump** — reformatted `git log` that describes
  internal churn instead of user-visible impact.
- **Version and screenshot rot** — undated claims about tools and UIs
  that have since changed; nothing tells the reader to re-verify.
- **Happy-path-only docs** — no failure modes, no error documentation,
  no "if this step fails" branches.

## Workflow

1. **Identify reader and mode.** Complete the sentence: "After reading
   this, a [role] can [task]." Pick the quadrant; pick the genre from the
   table above.
2. **Skeleton first.** Take the genre's anatomy from the references and
   outline the headings before writing prose. Read the headings alone —
   if they don't tell the story, restructure now, cheaply.
3. **Draft, holding the mode.** When adjacent material demands inclusion,
   link to it in its own document instead.
4. **Verify.** Run every command and sample; check versions against
   reality; date-stamp perishables; check links (link rot with no CI
   check is a standing failure mode).
5. **Style pass.** Apply `uncanny` in its technical-documentation
   register — de-slop without costume-swapping.
6. **Review as code.** PR the document; review against the doc-review
   checklist (`references/docs-as-code-and-review.md`) — accuracy first,
   then completeness, then structure, then style.
7. **Wire freshness.** Lint, link-check and sample-test in CI; assign
   ownership; make the doc update part of the next behaviour change, not
   an afterthought.

## Reference index

Load on demand:

- `references/diataxis-and-doc-types.md` — the four quadrants in depth,
  per-mode quality bars, API reference prose, mixing failure modes, and
  mapping genres onto the grid.
- `references/readmes-and-onboarding.md` — README anatomy and the
  first-screen rule, quickstart discipline, CONTRIBUTING, onboarding
  guides, and when to split into a docs site.
- `references/adrs-and-decision-records.md` — what deserves an ADR, the
  Nygard/MADR anatomy, status lifecycle and superseding, writing
  standards, and anti-patterns.
- `references/runbooks-and-operational-docs.md` — runbook anatomy and the
  executable-under-stress rules, the alert→runbook contract, testing
  runbooks, and the wider operational doc set.
- `references/changelogs-and-release-notes.md` — Keep a Changelog
  conventions, entry-writing standards, release notes vs changelog,
  generation from commits, and breaking-change communication.
- `references/docs-as-code-and-review.md` — toolchains, prose linting and
  link checking, verifying samples in CI, the doc-review checklist, and
  freshness ownership.

## Boundaries

- **Prose style, register and AI-tell removal** → `uncanny`. This skill
  decides what the document is and what it contains; uncanny tunes how
  the sentences read. Run both on anything shipped.
- **Scholarly writing, citations and evidence synthesis** →
  `academic-research`.
- **Reviewing code** → `code-review-development` (which routes review of
  written documents here).
- **Implementation plans before code** → `visual-plan`; **post-change
  recaps of a diff** → `visual-recap`. This skill owns the durable
  documents around them (ADRs, design-doc structure).
- **Exportable, committable diagrams** → `drawio-development`; lightweight
  inline Mermaid lives in whichever document needs it.
- **The API contract itself** (OpenAPI, versioning, deprecation headers)
  → `api-development`; this skill owns the reference prose and doc
  structure around an API.
- **Commit messages and git conventions** → `git-workflow`; this skill
  owns the changelog document those commits may feed.
- **Alert design and SLOs** → `observability-development`; this skill
  owns the runbook the alert links to.
- **Executing the upgrade a migration guide describes** →
  `legacy-modernisation`.
