# Outputs and Dashboards

Deliver the smallest thing that answers the question: usually a short
findings note with two to four charts. Build a dashboard only when the user
will come back to the same questions with new data.

## The findings note (default deliverable)

Markdown in `work/<analysis>/findings_vNN.md`, versioned per the
`office-formats` convention, exported to PDF or Word on request (that
skill owns the conversion and fidelity checks).

```markdown
# Spending, January 2025 to September 2026

**In short:** You spent €24,180 over the 21 months, about €1,150 a month.
Spending has been higher than the same month last year in 8 of the last 9
months, mostly groceries and eating out. One large purchase (March 2026)
makes that month look unusual.

## Answers
1. **Monthly spending** — chart: charts/monthly.png. Median month €1,120;
   highest March 2026 (€3,410, includes a €2,400 sofa); lowest Feb 2025 (€860).
2. **Biggest categories** — chart: charts/categories.png. Groceries 27%,
   Eating out 14%, Transport 11% …
3. **This year vs last year** — chart: charts/yoy.png. Jan–Sep 2026 is €1,310
   (13%) above Jan–Sep 2025; groceries +€620, eating out +€480.

## What to keep in mind
(caveats, as in honest-caveats.md)

## How this was produced
Input: incoming/2026-10-11_card-export.csv (sha256 9C1E…). Steps: analysis.py.
Cleaning: cleaning-log.md. Re-run with next month's export: see below.
```

Rules: lead with the answer in two or three sentences; one numbered answer
per question; every number traceable to the script's output; caveats
before method; no jargon the user did not use first. For prose quality
(and to keep it from sounding machine-written) apply `uncanny`.

## Charts

- PNG at 150 dpi or more for notes and chat; SVG for anything that will be
  resized or edited.
- File names that say what they show (`monthly-spend.png`, not
  `figure1.png`), saved under `charts/`.
- Every chart rendered and looked at before it is referenced
  (`chart-choice.md` checklist). For a dashboard, render the whole page at
  phone and desktop widths and look at both (`ui-verification`).

## Spreadsheet output

When the user wants to keep working in a spreadsheet:

- Write a new `.xlsx` (pandas + openpyxl) or `.ods` in `work/`, one sheet per
  table, with clear column names and units in the header.
- Type ID columns as text; write dates as real dates, not strings.
- Guard text cells from the input against formula injection (see
  `intake-and-cleaning.md`).
- Include a "Read me" sheet: source file, date range, exclusions.
- For heavier formatting, charts inside the workbook, or editing the user's
  own workbook, route through `office-formats`.

## Self-contained HTML dashboard

For a question the user will ask again (monthly spending, club membership,
energy use). One `.html` file that opens offline, with no external scripts,
fonts or CDNs.

Option A: Plotly (free, open source), with the library embedded:

```python
import plotly.express as px

fig = px.line(monthly.reset_index(), x="Date", y="Spend",
              title="Monthly spending (€)")
fig.update_yaxes(rangemode="tozero", title="Spending (€)")
fig.write_html("work/spending-2026/dashboard.html",
               include_plotlyjs=True, full_html=True)
```

`include_plotlyjs=True` embeds the full plotly.js library in the file (a few
MB), which is what makes it work offline. Do not use `"cdn"`. For several
charts on one page, write each figure with `full_html=False` and
`include_plotlyjs` only on the first, then assemble them into one page with
the findings text between them (verify parameter behaviour against the
installed Plotly version).

Option B: static PNG or inline SVG charts in a plain HTML page with the
findings text. Smaller, prints well, no interactivity. Often enough.

Dashboard rules:

- The top of the page answers the main question in one sentence and one or
  three headline numbers with comparisons.
- Four to six charts at most, in the order of the questions.
- A visible "data up to" date and the caveats, on the page, not in a
  separate file.
- Same colours mean the same thing on every chart.
- Text alternatives for every chart; tables available for exact values
  (`accessibility-development`).
- Visual polish beyond the basics → `frontend-development`, `design-taste`.

## Making it re-runnable

The user's real need is often "do this again next month".

- One script (`analysis.py` or `analysis.sql`) that goes from the original
  export to every output, with the input path as a parameter.
- The cleaning decisions live in the script (mappings, exclusions), not in
  manual spreadsheet edits.
- Print row counts at each step and fail loudly if the input's columns
  change.
- Write a short "How to update" at the end of the findings note:
  "Save the new export into incoming/, then ask me to re-run the spending
  analysis" (or the command to run).
- New outputs get a new version number; the previous month's findings stay.
- If the user wants it to run automatically each month, that is an
  unattended run: follow `scheduled-run-discipline`, and keep the run to
  producing outputs and a summary.

## Power BI and other BI tools

If the user already uses Power BI (or similar) and wants the analysis there,
hand over a clean, typed CSV or Parquet file, the questions, the measure
definitions in plain words, and the caveats. Model design, DAX and report
building belong to `power-bi-development`.

## Python environment

Prefer a project virtual environment in the workspace
(`python -m venv .venv`, then `pip install pandas matplotlib duckdb
openpyxl plotly`, or `uv` if the user has it). Record the package list in
`requirements.txt` beside the script. Environment and packaging questions →
`python-development`.
