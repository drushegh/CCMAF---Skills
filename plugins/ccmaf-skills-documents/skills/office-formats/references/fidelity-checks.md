# Fidelity checks: render and look

An Office file is a layout, not just text. The only proof that an edit kept
the layout is to render the file to images and look at them, before and
after. Structural validators and text extraction catch different problems
and do not replace this.

## The loop

1. **Baseline.** Render the original once, into the version's check folder
   (`checks/<file>_v02/`). Keep it; it is the reference for every later
   version.
2. **Edit** (through the routed skill or the fallback).
3. **Render** the new version the same way, at the same resolution.
4. **Look.** Open every image. For files over about 30 pages or slides,
   look at every page that was touched, its neighbours, and a stated sample
   of the rest, and say which pages you checked.
5. **Compare** page counts and the touched pages side by side with the
   baseline. Intended differences go in the change note; unintended ones
   are fixed or reported.
6. **Repeat** until the render shows only intended differences.

## Rendering commands

With the Anthropic skills installed, use their render helpers (they wrap
LibreOffice for the sandboxed case). Without them, the open route is
LibreOffice to PDF, then Poppler to images:

```bash
soffice --headless --convert-to pdf --outdir checks/report_v03 report_v03.docx
pdftoppm -png -r 100 checks/report_v03/report_v03.pdf checks/report_v03/page
```

On Windows, `soffice.com` in the LibreOffice `program` folder is the
console-friendly launcher. LibreOffice refuses to run a second headless
instance against a profile already in use (it can exit quietly with no
output); close other instances, or give each run its own profile with
`-env:UserInstallation=file:///<absolute path to a scratch folder>`.

`pdftoppm` zero-pads page numbers to the width of the page count
(`page-01.png` ... `page-12.png`). A resolution of 80–110 dpi is enough to
judge layout; use higher only to read small print.

PDF inputs skip the first step. Spreadsheets render per print area and page
setup, which may not match what the user sees on screen; say so, and look
at the sheets that matter.

## What to look for

All formats:

- Page or slide count changed unexpectedly.
- Text overflowing its box, cut off at the page edge, or overlapping.
- Fonts substituted (heavier or wider text, different line breaks). Note it;
  the user's machine may have the real font.
- Images missing, stretched, or moved.
- Headers, footers, page numbers, and running titles intact.
- Colours and contrast still legible.

Word:

- Heading numbering and list numbering continuous; no stray empty bullets.
- Tables: borders, column widths, header rows repeating across pages.
- Table of contents updated if headings changed (it may need a field
  update in Word; say so rather than faking the entries).
- Tracked changes and comments visible where expected, and only yours added.

Excel:

- No error values (`#REF!`, `#NAME?`, `#VALUE!`, `#DIV/0!`) after
  recalculation.
- Key totals checked by hand against two or three source rows.
- Column widths wide enough that numbers do not show as `####`.
- Input cells, colour coding and number formats match the file's
  conventions.

PowerPoint:

- Nothing off the slide edge; text fits its placeholder without shrinking
  to unreadable sizes.
- Consistent title positions across slides; no leftover template prompt
  text ("Click to add title").
- Speaker notes present where they were.
- Charts show labels and the right data.

PDF:

- Form fields filled where intended, and visibly (some viewers hide
  unflattened values).
- Page order, rotation and bookmarks after a merge or split.
- Text still selectable when it was before (no accidental rasterising).

## Comparing versions

Side-by-side viewing of matching page images is usually enough. For long
documents, compare the text first to find where to look: render both
versions to text (`pdftotext -layout`) and diff them, then view only the
pages the diff touches plus a sample. Tracked-change documents can also be
compared as "accepted" views, but remember that accept-all tools sometimes
leave empty paragraphs that Word would remove; check the XML or the
routed skill's notes before calling that a defect.

## What to report

In the change note and the reply: which pages or slides were rendered and
viewed, what differed from the baseline and whether each difference was
intended, any font substitutions, and anything you could not check (no
renderer available, very large file sampled). "Rendered all 14 pages,
compared with v02: only pages 3 and 9 differ, both intended" is a good
report. "Looks fine" is not.

## When rendering is impossible

If no renderer is available and the user declines installs, say so plainly:
the edit is structurally valid but unseen. Offer the user a short checklist
of what to look at when they open it. Never claim a visual check you did
not do.
