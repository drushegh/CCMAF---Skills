# READMEs and Onboarding

The README is the project's front door and its most-read document. It
serves two readers at once — the evaluator deciding whether to use the
project, and the new user trying to reach first success — and it must
serve both within the first screen.

## The first-screen rule

Before any scrolling, a reader must know: **what this is** (one line),
**why they'd use it** (a short paragraph or three bullets), and **how to
get started** (a visible quickstart heading or link). Everything else —
architecture, history, philosophy — comes after or lives elsewhere.

## README anatomy

In order. Include only the sections the project needs; never pad.

1. **Title + one-liner.** What it is and what it's for, in a sentence a
   stranger understands. No marketing adjectives.
2. **Badges** — only ones that carry a decision-relevant signal (build
   status, published version, licence). A row of ten badges is noise; a
   red or stale badge is worse than none.
3. **What / why** — 3–8 lines: the problem it solves, for whom, and the
   one or two things that distinguish it. If there are close
   alternatives, an honest "use X instead when…" earns trust.
4. **Quickstart** — the shortest verified path from clean machine to
   first visible success (see below).
5. **Usage** — 2–4 worked examples of the most common tasks, each with
   real output. How-to mode: goal-titled, minimal.
6. **Configuration** — a reference table: option, type, default, effect.
   Not prose.
7. **Documentation links** — where the full docs live, routed by reader
   need (tutorial / how-to / reference / explanation).
8. **Contributing, licence, support** — one line each, linking out.

## Quickstart discipline

The quickstart is a contract: follow it exactly on a clean machine and
reach a working result. Rules:

- **Prerequisites explicit and versioned** — "Node 22+, Docker" — with a
  check command (`node --version`), not an assumption.
- **Every command copy-paste runnable** — no `<your-value-here>` inside
  otherwise-runnable blocks without a preceding line that sets it; no
  prompts glued to commands (`$ ` prefixes break paste).
- **Expected output shown** after the significant steps, so the reader
  can tell success from silent failure.
- **First success is visible and fast** — something runs, renders or
  responds in minutes. If genuine setup takes longer, give a
  reduced-scope first win (a demo mode, a sample dataset) first.
- **Tested end-to-end** on a machine that isn't the author's, and
  re-tested when dependencies change. A broken quickstart converts
  evaluators to ex-evaluators silently.

## Sizing: README as document vs README as router

- **Small project:** the README *is* the documentation — anatomy above,
  everything inline, one file.
- **Growing project:** the README keeps the first screen, quickstart and
  usage, and links out for reference and explanation.
- **Large project / docs site:** the README shrinks to front door and
  router — what/why, install, one example, then routed links. Duplicated
  content between README and docs site *will* drift; pick one home per
  topic and link.

## CONTRIBUTING.md

For the reader who has decided to contribute and wants not to waste their
evening. Cover, in how-to mode: dev-environment setup (verified, like a
quickstart), how to run the tests, the change workflow (branch/PR
conventions, what CI will gate), code style (link the linter config
rather than restating it), and what to expect after submitting (review
SLA, who merges). Commit-message and branching conventions belong to
`git-workflow` — link, don't restate.

## Onboarding guides

A day-one document for a new team member is a *tutorial*: a guided,
verified path through environment setup to a first meaningful action (run
the app, make a trivial change, see it deployed to a dev environment).
Rules: one blessed path; every step tested on the last person who joined;
an explicit "you're done when…" checkpoint; and a feedback loop — the
newest joiner fixes the steps that failed them, while the pain is fresh.
That maintenance loop, not the initial writing, is what keeps onboarding
docs alive.

## Anti-patterns

- **The architecture essay** — three screens of design before "how do I
  run it".
- **Dead badges** — failing CI badge on the front door, or badges for
  services no longer used.
- **"See the code"** as the answer to configuration or usage questions.
- **Assumed context** — internal team jargon, unexplained acronyms, and
  prerequisites the author forgot they had installed.
- **The screenshot wall** — UI screenshots as the primary documentation;
  they rot fastest of all content. Prefer text + one current screenshot,
  date-stamped.
- **Duplicating the docs site** — the README copy always loses the drift
  race. Route instead.
