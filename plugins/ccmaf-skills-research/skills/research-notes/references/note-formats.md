# Note formats

Plain Markdown with YAML front matter. Keep the fields few and consistent so
notes can be searched and listed. If a `knowledge-vault` exists, use its
naming, link syntax and tag conventions instead of the defaults here.

## Identifiers

Give each source a short stable key: `<firstauthor-or-publisher><year><word>`,
for example `harlow2025grid`. Use it as the file name (`harlow2025grid.md`),
in claim rows and in synthesis links. Keys never change after creation; if
two sources collide, add a letter (`harlow2025grid-b`).

## Source note

```markdown
---
type: source
key: harlow2025grid
title: "Battery storage and grid stability: a regional assessment"
author: "M. Harlow; Northfield Energy Institute"   # fictional
published: 2025-03-14
kind: report            # article | paper | report | book | docs | video | podcast | interview | dataset | web
url: https://example.org/reports/grid-storage-2025.pdf
identifier: ""          # DOI, ISBN, report number, if any
version: "v2, revised 2025-05"
accessed: 2026-10-11
obtained: downloaded PDF, incoming/2026-10-11_grid-storage-2025.pdf
status: read            # read | skimmed | abstract-only | secondary | unavailable
tags: [energy, storage]
---

# Battery storage and grid stability (Harlow 2025)

## What it is
Think-tank report, 48 pages, funded by a storage industry association (p. 2).

## Neutral summary
Two to four sentences in the source's own terms, no evaluation.

## Key claims
- C1 Storage reduced frequency events by 30 % in the study region, 2022–2024 (p. 17, Table 3).
- C2 Further gains require market reform (§5, p. 31).

## Quality notes [me]
Funding interest declared; single region; method in appendix B is clear.

## Links
Reading note: [[harlow2025grid-reading]]
```

## Reading or literature note

For detail. One per source, or per chapter of a long book.

```markdown
---
type: reading
source: harlow2025grid
accessed: 2026-10-11
---

# Reading: Harlow 2025

## §3 Method (pp. 9–14)
- Compares frequency events before and after storage came online (p. 10).
- > "We cannot separate the effect of storage from concurrent demand-response
  > changes" (p. 13).   ← verbatim, keep the caveat
- [me] So C1 is an upper bound on the storage effect.

## §4 Results (pp. 15–24)
...
```

Conventions:

- `>` quotations are verbatim with a locator.
- Plain bullets are close paraphrase with a locator.
- `[me]` marks your interpretation, question or criticism. Nothing else is
  allowed to be your voice.
- `[?]` marks something you could not confirm in the source.

## Claim ledger

A single table per project (or one claim note per claim for large projects).

```markdown
| ID | Claim (one sentence) | Supports | Contradicts | Status | Confidence |
|---|---|---|---|---|---|
| CL-01 | Grid-scale storage reduced frequency events in the region | harlow2025grid p.17 T3 | okafor2026grid §4.2 | contested | moderate |
| CL-02 | Market reform is needed for further gains | harlow2025grid p.31 | — | single-source | low |
```

Status and confidence labels are defined in `claim-traceability.md`.

## Synthesis note

```markdown
---
type: synthesis
question: "Has grid storage improved stability in the region?"
updated: 2026-10-11
sources: [harlow2025grid, okafor2026grid, regulator2026annual]
---

# Synthesis: storage and stability

**Short answer (as of 2026-10-11):** Probably some improvement; size disputed.

Two analyses find fewer frequency events after storage came online
[CL-01: harlow2025grid p.17; regulator2026annual §2]. One attributes most of
the change to demand response instead [CL-01 contra: okafor2026grid §4.2].
[me] The disagreement turns on whether demand-response changes are
controlled for; only Okafor does so.

## Gaps
- No source covers 2025 onwards.
```

## Question log

```markdown
| Q | Question | What would answer it | Status |
|---|---|---|---|
| Q1 | Did demand-response capacity change in 2023? | Regulator capacity tables | open |
```

## Minimal layout when no vault exists

```text
<project>/
  README.md              # the question, scope, status, date
  sources/               # one source note per key
  reading/               # reading notes
  claims.md              # the ledger
  synthesis/             # one per question or theme
  incoming/              # downloaded copies, never edited
```

## Annotated bibliography

When a user asks for one, generate it from the source notes: citation line,
two-to-three sentence neutral summary, one sentence of evaluation marked as
yours. For formal reference styles (APA, Harvard and so on) use
`academic-research`'s citation guidance.
