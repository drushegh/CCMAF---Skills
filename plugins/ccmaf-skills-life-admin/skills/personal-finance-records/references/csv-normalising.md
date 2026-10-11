# Normalising bank and card exports

Goal: every source, whatever its shape, becomes rows in one canonical ledger
that reconciles to the bank's own figures.

## Canonical ledger schema (`work/ledger/transactions.csv`)

| Column | Type | Notes |
|---|---|---|
| `id` | text | Stable id, see "Transaction ids" below |
| `account` | text | Short alias, e.g. `current-1234`, `card-4821` (last four only) |
| `date` | ISO date `YYYY-MM-DD` | Transaction date if given, else posting date |
| `posted` | ISO date or empty | Posting/value date when the export has both |
| `description` | text | Original text, whitespace collapsed, otherwise untouched |
| `amount` | decimal, 2 places, `.` separator | Signed: money out negative, money in positive |
| `currency` | ISO 4217 | Account currency, e.g. `EUR` |
| `orig_amount`, `orig_currency` | optional | Foreign-currency spend as shown by the bank |
| `balance` | decimal or empty | Running balance after the row, if the export has one |
| `category` | text | From rules or overrides; empty = uncategorised |
| `source_file` | text | File name in `incoming/statements/` |
| `source_row` | integer | 1-based data row in that file, for tracing |

Write the ledger UTF-8, comma-separated, `.` decimal point, ISO dates, one
header row. Readers in any locale can then parse it unambiguously.

## Intake

1. Record the file in `work/ledger/import-log.md`: name, SHA-256, size, date
   received, account alias. The hash is how you later prove the original is
   unchanged and how a re-import is recognised.
2. Detect the **encoding**: a UTF-8 BOM (`EF BB BF`) means UTF-8; a byte
   `0x80` where `€` belongs means Windows-1252; UTF-16 starts `FF FE` or
   `FE FF`. In Python, open with `encoding="utf-8-sig"` (strips a BOM) and fall
   back to `cp1252` on a decode error; record which worked.
3. Detect the **delimiter**: comma, semicolon (common where the decimal mark is
   a comma) or tab. `csv.Sniffer` can suggest one; confirm by checking every
   data row has the same field count.
4. Find the **header row**. Many exports put account details, a title or a
   date range in the first lines, and totals or a disclaimer at the end. Skip
   them explicitly and count them in the import log.
5. Show the user a masked preview and the column mapping before the first
   import of a new source format. Save the mapping per source
   (`work/ledger/sources.md`) so later imports need no questions.

## Parsing rules

**Dates.** Fix the format per source, never per row. For `NN/NN/YYYY`,
scan the whole column: any first field above 12 proves `DD/MM`; any second
field above 12 proves `MM/DD`; neither proven means ask (or use the source's
recorded format). Two-digit years: expand only with the user's confirmation of
the century window. Some exports write `14 Sep 2026` or `2026-09-14T00:00:00`;
take the date part only.

**Amounts.**
- Strip currency symbols, spaces, non-breaking spaces (`U+00A0`, `U+202F`) and
  the thousands separator *after* deciding which character is the decimal mark.
- Decide the decimal mark from the data: a final group of exactly two digits
  after the last `.` or `,` is the decimal part. `1.234,56` → 1234.56;
  `1,234.56` → 1234.56. `12,500` alone is ambiguous: use the source's recorded
  convention or ask.
- Separate debit and credit columns: `amount = credit - debit`, treating blanks
  as zero. Some exports show debits as positive in a debit column; others show
  a single column with `-`, trailing `-`, parentheses `(12.50)`, or a `DR`/`CR`
  marker. Map each to the signed convention.
- Card exports often show purchases as **positive** (from the card's view:
  amount owed). Flip so spending is negative, and record the flip in the
  source mapping.
- Parse with `decimal.Decimal(text)` or into integer cents. Never `float`.

**Descriptions.** Collapse runs of whitespace, trim, keep case and wording.
Do not "clean" merchant names in the ledger; categorisation rules match the
original text. A display-name column can be added later if wanted.

## Transaction ids

Banks rarely export a stable id. Build one so re-imports and overlapping
exports deduplicate:

```text
id = sha256(account | date | amount | normalised description | occurrence)[:16]
```

`occurrence` is 1 for the first row with that exact key in the file, 2 for the
second, and so on. This keeps two genuine identical coffees on one day while
still recognising them when the same period is imported again. If the export
has a bank reference column, prefer it (prefixed with the account alias).

Caveat: a bank that later edits a description (pending to posted text)
breaks the id. Treat a near-match (same account, date ±3 days, same amount,
different text) as a **possible duplicate** to show the user, never as an
automatic merge.

## Reconciliation

Run after every import, before categorising:

- **Row-level balance check** when a balance column exists: for rows in date
  order, `balance[i] = balance[i-1] + amount[i]`. Note that some exports list
  newest first, and rows within one day may be in arbitrary order; sort by the
  source row order within a day and test both directions if needed. The first
  break locates a missing, doubled or mis-signed row.
- **Period check** otherwise: opening balance + sum(amount) = closing balance,
  using figures from the statement or supplied by the user.
- **Count check**: data rows parsed = data rows in file minus skipped
  header/footer lines.

Record the outcome in the import log: `reconciled (row-level)`,
`reconciled (period)`, or `NOT reconciled: difference €X.XX near rows N–M`.
An unreconciled import may be used only with that caveat stated in every
report built on it.

## Other formats

- **OFX/QFX** (XML/SGML) carry a `FITID` per transaction: a good stable id.
  Amounts are signed already. Parse with a real parser, not regex.
- **QIF** is line-based with `D` (date), `T` (amount), `P` (payee) fields and
  `^` row terminators; date formats vary by exporter.
- **XLSX** exports: read values with a library (via `office-formats` routing),
  watching for dates stored as serial numbers and amounts stored as text.
- **PDF statements**: last resort. Extract tables, then reconcile every page's
  carried-forward balance; flag any page that does not.

## Formula-injection guard

A description such as `=HYPERLINK("http://...")` or `+cmd|...` becomes a live
formula when a CSV is opened in a spreadsheet. In any CSV you write for a human
to open, prefix cells that begin with `=`, `+`, `-`, `@`, tab or carriage
return with a single quote `'`, except in the numeric `amount` and `balance`
columns, which you wrote yourself. Never open originals in a spreadsheet to
"have a look"; preview them as text.

## Python sketch (standard library only)

```python
import csv, hashlib
from decimal import Decimal
from datetime import datetime

def parse_amount(text, decimal_mark):
    t = text.replace("€", "").replace(" ", "").replace(" ", "").strip()
    neg = t.startswith("(") and t.endswith(")") or t.endswith("-")
    t = t.strip("()").rstrip("-")
    thousands = "," if decimal_mark == "." else "."
    t = t.replace(thousands, "").replace(decimal_mark, ".")
    value = Decimal(t) if t else Decimal("0")
    return -value if neg else value

def row_id(account, date, amount, desc, occurrence):
    key = f"{account}|{date}|{amount}|{' '.join(desc.split())}|{occurrence}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]

def read_rows(path, skip_top, encoding="utf-8-sig", delimiter=","):
    with open(path, newline="", encoding=encoding) as f:
        for _ in range(skip_top):
            next(f)
        yield from csv.DictReader(f, delimiter=delimiter)

def parse_date(text, fmt):          # fmt fixed per source, e.g. "%d/%m/%Y"
    return datetime.strptime(text.strip(), fmt).date().isoformat()
```

This is a sketch for the shape of the work; a real importer adds the source
mapping, the occurrence counter, reconciliation and the import log. Scripting
craft → `python-development`.
