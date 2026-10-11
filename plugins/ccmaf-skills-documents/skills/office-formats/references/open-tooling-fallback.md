# Open-tooling fallback

Use this only when the Anthropic format skills are not available and the
user does not want them installed. It is a minimal kit, enough to read,
convert, make small edits and render for checking. For anything intricate
(complex tracked changes, template-driven decks, financial models), say the
fallback is limited and offer the routed skill again.

All tools below are free and open source and run locally. Installing them
changes the machine: ask first, and on a managed machine follow
`safe-system-changes`.

## The kit

| Tool | Purpose | Windows install (winget IDs checked October 2026) |
|---|---|---|
| LibreOffice | Convert between formats; render to PDF; legacy formats | `winget install --id TheDocumentFoundation.LibreOffice -e` |
| pandoc | Read Word to Markdown or text; simple Markdown to Word | `winget install --id JohnMacFarlane.Pandoc -e` |
| Poppler (`pdftoppm`, `pdftotext`, `pdfimages`) | Render PDF pages to images; extract text | `winget install --id oschwartz10612.Poppler -e` (a community build) |
| qpdf | Merge, split, rotate, decrypt (with the password) | `winget install --id QPDF.QPDF -e` |
| python-docx | Read and edit `.docx` paragraphs, runs, tables, styles | `pip install python-docx` |
| openpyxl | Read and edit `.xlsx` cells, formulas, formats | `pip install openpyxl` |
| python-pptx | Read and edit `.pptx` slides, shapes, text | `pip install python-pptx` |
| pypdf | Read, merge, split PDFs; fill simple form fields | `pip install pypdf` |

Package names matter: install exactly these (the import names are `docx`,
`openpyxl`, `pptx`, `pypdf`). Confirm IDs and versions with `winget show`
or the package index before installing; do not install look-alike names.
On Linux or WSL use the distribution packages (`libreoffice`, `pandoc`,
`poppler-utils`, `qpdf`).

## Reading

```bash
pandoc -t markdown report_v02.docx -o report_v02.md     # Word to Markdown
pandoc --track-changes=all -t markdown in.docx          # show insertions/deletions
pdftotext -layout terms.pdf terms.txt                   # PDF text, layout kept
```

```python
from openpyxl import load_workbook
values = load_workbook("model_v04.xlsx", data_only=True)   # cached values
formulas = load_workbook("model_v04.xlsx")                 # formula strings
```

Two loads are needed to see both values and formulas. Never save the
`data_only=True` workbook: it would replace every formula with its value.

## Converting

```bash
soffice --headless --convert-to docx --outdir work/ legacy.doc
soffice --headless --convert-to pdf  --outdir out/  proposal_v03.docx
soffice --headless --convert-to xlsx --outdir work/ figures.csv
```

Conversion always writes a new file; the source stays. Run one LibreOffice
instance at a time or give each its own profile
(`-env:UserInstallation=file:///...`), otherwise it may exit without output.

## Small edits

Word (python-docx):

```python
from docx import Document
doc = Document("proposal_v02.docx")
for p in doc.paragraphs:
    if "Delivery date:" in p.text:
        # edit inside existing runs to keep formatting; text split across
        # runs needs care (see note below)
        for run in p.runs:
            run.text = run.text.replace("30 November", "14 December")
doc.save("proposal_v03.docx")
```

Word splits visible text across several runs, so a phrase may not exist
inside a single run. Find it across `p.runs`, change the minimum number of
runs, and keep their formatting. python-docx has no API for tracked changes
or comments; when the edit must be tracked, say the fallback cannot do it
properly and offer the routed `docx` skill instead of faking revisions.

Excel (openpyxl):

```python
from openpyxl import load_workbook
wb = load_workbook("budget_v05.xlsx")            # keep_vba=True for .xlsm
ws = wb["Inputs"]
ws["C7"] = 1250                                  # input cell, per the file's colour code
ws["C20"] = "=SUM(C5:C19)"                       # formula, not a computed number
wb.save("budget_v06.xlsx")
```

openpyxl writes formulas without cached results, so anything reading
values (pandas, `data_only=True`, many previewers) sees blanks until a
spreadsheet engine recalculates. Whether a headless LibreOffice conversion
recalculates depends on its "recalculation on file load" setting; not
verified here, so check results by opening the file in a spreadsheet
application (or tell the user to) before reporting totals. Write formulas
that LibreOffice and older Excel both support; avoid newer dynamic-array
functions in files that must work everywhere.

PowerPoint (python-pptx):

```python
from pptx import Presentation
prs = Presentation("deck_v02.pptx")
slide = prs.slides[3]
for shape in slide.shapes:
    if shape.has_text_frame and "Q3" in shape.text_frame.text:
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                run.text = run.text.replace("Q3", "Q4")
prs.save("deck_v03.pptx")
```

Edit text in existing shapes and placeholders; adding new slides from
layouts works, but template-faithful decks are where the routed `pptx`
skill earns its keep.

PDF (qpdf, pypdf):

```bash
qpdf --empty --pages a.pdf b.pdf -- merged.pdf          # merge
qpdf in.pdf --pages . 1-3 -- first-three.pdf            # extract pages
qpdf in.pdf out.pdf --rotate=+90:2                      # rotate page 2
```

Prefer editing the source document and re-exporting over editing a PDF.
For a simple fillable form, pypdf can set field values; check the result in
a viewer, because some viewers hide unflattened values. Complex or
non-fillable forms are routed-skill work.

## Rendering for checks

```bash
soffice --headless --convert-to pdf --outdir checks/deck_v03 deck_v03.pptx
pdftoppm -png -r 100 checks/deck_v03/deck_v03.pdf checks/deck_v03/slide
```

Then view the images, as in `fidelity-checks.md`.

## Limits to state plainly

Say so when the fallback cannot do something well: tracked changes and
comments in Word, theme-aware deck building, spreadsheet recalculation
with verified values, complex PDF forms, and OCR (possible with Tesseract,
but outside this minimal kit). Offering the routed skill, or handing the
step to the user, beats a fragile workaround.
