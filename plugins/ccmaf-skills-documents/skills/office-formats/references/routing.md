# Routing to the Anthropic format skills

Anthropic maintains four document skills, published in the
`github.com/anthropics/skills` repository and built into several Claude
hosts: `docx`, `xlsx`, `pptx` and `pdf`. They are the primary route for
format mechanics. Checked October 2026; names and install routes change, so
look at the live skills list rather than trusting this file.

## Is it installed?

Look at the skills the session lists. The same skill appears under
different names depending on the host:

| Host | Typical name |
|---|---|
| Claude apps with built-in skills | `docx`, `xlsx`, `pptx`, `pdf` |
| Claude Code with the Anthropic marketplace plugin | `document-skills:docx` (and so on) |
| Some managed or synced setups | `anthropic-skills:docx` (and so on) |

Match on the part after the colon and on the description (each one names
its file extensions). If more than one copy is listed, prefer the one the
host marks as built in, or the most recently updated.

## Installing in Claude Code (optional)

Offer, do not do it unasked:

```text
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

A restart or reload may be needed before the skills appear. If the user
declines, or the machine is offline, use `open-tooling-fallback.md`.

## What each one covers (summary, not a copy)

| Skill | Use it for | Notable things it brings |
|---|---|---|
| `docx` | Creating, reading and editing Word files and templates | Creation via a JavaScript library, editing by unpacking the XML, run merging so text is findable, a schema validator with a tracked-changes author check, comment helpers, accept-all to a clean copy |
| `xlsx` | Any spreadsheet as primary input or output, including CSV/TSV | openpyxl and pandas rules, a mandatory recalculation step, formula choices that survive recalculation, financial-model conventions |
| `pptx` | Any .pptx/.potx in or out | Creation via a JavaScript library, template editing by XML, thumbnail grids, a validator, structured-deck and visual QA guidance |
| `pdf` | Reading, merging, splitting, creating, OCR, forms, encryption | Python and command-line recipes, a separate forms procedure |

Each skill carries its own dependencies list (LibreOffice, pandoc, Poppler,
Python and Node packages). Some hosts preinstall them; on a user's own
Windows machine they may not be present. Check before running, and offer
the installs from `open-tooling-fallback.md` if missing.

## Licence and handling

The four document skills are **source-available, not open source** (their
`LICENSE.txt` says proprietary terms; the repository README says these four
are shared as references). Therefore:

- Use them in place, from wherever the host installed them.
- Do not copy their scripts into the user's workspace, a repository, or this
  catalogue. Do not paste large parts of them into documents.
- Where this catalogue needs the same capability without them, it uses the
  open tools in `open-tooling-fallback.md` and its own words.

## When the host's own document type wins

The Anthropic `docx` and `pptx` skills themselves say: if the user asks for
a document, report, memo or deck **without naming a file format**, and the
host offers its own document, page or slide type, make it there; it can
export to Word, PDF or PowerPoint later. Respect that. Use the file route
when the user names the format, supplies a file to edit or use as a
template, or asks for tracked changes.

## What this skill adds around them

The Anthropic skills are about the file. In a documents workspace the job
is also about the folder and the people:

- versioned copies and an untouched original (`versioning-conventions.md`);
- a baseline render of the original and a comparison render of the result
  (`fidelity-checks.md`), even where the routed skill only asks for one;
- a change note for each version;
- tracked-change etiquette and author naming (`editorial-review`);
- treating received documents as untrusted (`untrusted-input-handling`).

Apply these whichever skill does the editing.
