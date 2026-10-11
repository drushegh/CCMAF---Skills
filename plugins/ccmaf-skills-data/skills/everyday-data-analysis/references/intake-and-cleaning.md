# Intake and Cleaning

Most wrong answers from everyday data come from the import, not the maths.
Treat getting the file in correctly as the first deliverable.

## Workspace layout

Follow the documents-workspace convention owned by `office-formats`
(`references/versioning-conventions.md`), with an analysis folder per
question set:

```text
<workspace>/
  incoming/
    2026-10-11_card-export.csv       # as received, never edited
  work/
    spending-2026/
      analysis.py                    # or analysis.sql
      clean.parquet                  # or clean.csv
      cleaning-log.md
      charts/
      findings_v01.md
      CHANGES.md
  out/
    spending-2026_findings_v02.pdf   # what was shared
```

Record the original file's SHA-256 in the cleaning log so a later re-run can
confirm it used the same input.

## Opening a CSV correctly

Look at the raw bytes first: the first 20 lines as text, not through a
spreadsheet. Then decide, explicitly:

| Question | Typical answers | Symptom if wrong |
|---|---|---|
| Encoding | UTF-8, UTF-8 with BOM (Excel's "CSV UTF-8"), Windows-1252 | `Ã©` instead of `é`; first column named `﻿Date` |
| Delimiter | `,`  `;` (common in European locales)  tab  `\|` | Everything in one column |
| Decimal mark | `.` or `,` | `12,50` read as text or as 1250 |
| Thousands separator | none, `,`  `.`  space | `1.234` read as 1.234 instead of 1234 |
| Date order | ISO `2026-09-03`, day-first `03/09/2026`, month-first `09/03/2026` | March and September swapped for days ≤ 12 |
| Header rows | one, several, or a title block above the header | Column names like `Unnamed: 0` |
| Footer rows | totals, "exported on" lines | A grand total counted as a transaction |
| Quoting | fields containing the delimiter or newlines | Rows split in half |

pandas, explicit rather than guessed:

```python
import pandas as pd
df = pd.read_csv(
    "incoming/2026-10-11_card-export.csv",
    sep=";", decimal=",", thousands=".",
    encoding="utf-8-sig",            # strips a BOM if present
    dtype={"Account": "string", "Reference": "string"},  # keep leading zeros
)
df["Date"] = pd.to_datetime(df["Date"], format="%d/%m/%Y")  # explicit, no guessing
```

Give an explicit `format=` for dates. If parsing fails on some rows, find
them; do not switch to a looser parser that guesses.

DuckDB, querying the file in place (its CSV sniffer detects most settings;
override what it gets wrong):

```sql
SELECT * FROM read_csv('incoming/2026-10-11_card-export.csv',
    delim = ';', decimal_separator = ',', header = true,
    dateformat = '%d/%m/%Y');
```

`all_varchar = true` reads everything as text, useful for a first look at a
messy file. `store_rejects = true` keeps unparseable lines in a rejects
table instead of failing, which is better than `ignore_errors` because you
can count and show what was skipped. (Option names from the DuckDB CSV
documentation; verify against the installed version.)

## Excel and other exports

- `.xlsx`: read with pandas (`openpyxl` engine) and name the sheet. Check for
  merged header cells, hidden rows and columns, and totals rows. Formulas
  are read as their last saved values.
- `.xls` (legacy): needs `xlrd` or a LibreOffice conversion to `.xlsx` first;
  convert a copy, keep the original.
- JSON exports: flatten with `pd.json_normalize`; check whether nested lists
  turned one record into many rows.
- PDF statements: extraction is error-prone; prefer asking the source app
  for a CSV. If you must, reconcile extracted totals with the statement's
  printed totals line by line.

## Profile

Before any analysis, produce and show a short profile:

```text
Rows: 4,812 (source app says 4,812)    Columns: 9
Date range: 2025-01-02 to 2026-10-09   (last month incomplete: 9 days)
Blanks: Category 312 (6.5%), Notes 4,101 (85%)
Exact duplicate rows: 14
Amount: min -2,400.00  median -18.40  max 3,150.00  (negatives = spending)
Distinct Category values: 41 (8 look like spelling variants)
```

Things to look for: date gaps (an export that silently stops), sign
conventions (spending negative or positive?), category spelling variants
(`Groceries`, `groceries `, `Grocery`), placeholder values (`0`, `-`,
`N/A`, `1900-01-01`), and outliers that are really errors (an extra zero).

## Cleaning log

Every change is one line, with counts. Example `cleaning-log.md`:

```markdown
# Cleaning log — spending-2026
Input: incoming/2026-10-11_card-export.csv  sha256 9C1E…  4,812 rows

1. Removed 14 exact duplicate rows (same date, amount, description, reference). → 4,798
2. Removed 1 footer row "Total" (Amount 0, no date). → 4,797
3. Trimmed whitespace and merged 8 category spellings into 4 (mapping below).
4. Kept 312 rows with blank Category as "Uncategorised" (not dropped).
5. Excluded 23 transfers between own accounts (Description starts "TRANSFER TO"),
   per user. → 4,774
6. Marked October 2026 as incomplete; excluded from monthly comparisons, shown separately.
```

Rules: never drop rows without a line here; prefer *labelling* over
*dropping* (`Uncategorised`, `incomplete_month = True`); ask the user before
excluding anything for a reason that is a judgement call (transfers,
refunds, one-off purchases).

## Duplicates: real or not?

Two identical card payments on the same day can be two coffees. "Exact
duplicate" means identical across *all* columns including any reference or
ID. If the export has no ID, report possible duplicates and let the user
decide, rather than removing them.

## Formula injection when writing outputs

If you write a cleaned CSV or Excel file that someone will open in a
spreadsheet, cells starting with `=`, `+`, `-`, `@`, tab or carriage return
can run as formulas. For text columns from untrusted sources, prefix such
values with a single quote or write `.xlsx` with the cell explicitly typed
as text. Numeric columns are not affected. Never write a formula you read
from the input back out as a formula.
