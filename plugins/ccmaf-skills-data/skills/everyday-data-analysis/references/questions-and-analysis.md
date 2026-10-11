# Questions and Analysis

The analysis is only as good as the question. Most requests arrive as
"what does this tell me?"; the job is to turn that into a few questions the
data can actually answer, then answer them with the simplest method that is
correct.

## From a vague ask to questions

Propose three to five questions, each with a measure, a unit, a breakdown
and a time range, and let the user choose or edit:

| Vague ask | Concrete question |
|---|---|
| "What does my spending look like?" | Total spending per month, Jan 2025–Sep 2026, in euro. Top 10 categories by total over the period. |
| "Is the club growing?" | Active members at the end of each month; new joiners and leavers per month. |
| "How's my running going?" | Weekly distance and median pace per week, last 12 months. |
| "Which product is best?" | Revenue and units per product, last quarter; share of total revenue. |
| "Are we using more electricity?" | Daily average kWh per month this year vs the same month last year. |

Also ask, once, only what you need: what counts as the thing being
measured (are refunds spending? are trial members members?), and whether
anything should be excluded.

Some questions the data cannot answer. Say so plainly: an export of sales
cannot tell you *why* sales fell; a survey of current customers cannot tell
you why people left.

## The handful of methods that cover most questions

| Question shape | Method |
|---|---|
| How much / how many in total? | Sum or count, with the filter stated |
| How does it change over time? | Group by period (week, month); compare like with like |
| Which is biggest? | Group by category, sort, top N plus "everything else" |
| What share? | Part / total, with the total stated |
| Typical value? | Median (and spread: interquartile range); mean if totals matter |
| Is this unusual? | Compare with the same period before, or with the typical range |
| Do two things move together? | Scatter plot and a cautious description; no causal claim |
| Before and after a change? | Same-length windows either side; note anything else that changed |

Prefer these over anything clever. If the question needs regression,
forecasting or significance testing, say what it would add and what it
would need (more data, clear assumptions), and check `academic-research` or
`machine-learning-development` before doing it.

## Comparing fairly

- **Same length periods.** February has fewer days; use daily averages or
  per-day rates when months are compared.
- **Incomplete periods.** The current month is partial; show it separately
  or leave it out, and say which.
- **Year on year** beats month on month for anything seasonal (energy,
  retail, sport).
- **Rates over totals** when group sizes differ: complaints per 1,000
  orders, not complaints.
- **Same definition both sides.** If the export changed format or a
  category was renamed mid-year, align them first and note it.

## pandas recipes

```python
# monthly totals, spending as a positive number
spend = df[df["Amount"] < 0].assign(Spend=lambda d: -d["Amount"])
monthly = (spend.set_index("Date")
                .resample("MS")["Spend"].sum()     # month-start labels
                .rename("Spend").to_frame())

# top categories with an "Other" bucket
by_cat = spend.groupby("Category")["Spend"].sum().sort_values(ascending=False)
top = by_cat.head(8)
top["Other"] = by_cat.iloc[8:].sum()

# year-on-year by month
spend["Year"] = spend["Date"].dt.year
spend["Month"] = spend["Date"].dt.month
yoy = spend.pivot_table(index="Month", columns="Year", values="Spend", aggfunc="sum")

# median and spread
spend["Spend"].describe(percentiles=[0.25, 0.5, 0.75])

# join with a check on row counts
before = len(orders)
merged = orders.merge(products, on="product_id", how="left", validate="many_to_one")
assert len(merged) == before
```

`validate="many_to_one"` makes pandas raise if the lookup table has
duplicate keys, which is exactly the silent row multiplication you want to
catch.

## DuckDB recipes

```sql
-- monthly totals straight from the file
SELECT date_trunc('month', "Date") AS month,
       sum(-"Amount")              AS spend,
       count(*)                    AS n
FROM read_csv('work/spending-2026/clean.csv')
WHERE "Amount" < 0
GROUP BY ALL
ORDER BY month;

-- write a result for charting
COPY (SELECT ...) TO 'work/spending-2026/monthly.csv' (HEADER, DELIMITER ',');
```

The DuckDB CLI (`duckdb`) is a single free executable; DuckDB is also a
`pip install duckdb` away inside Python, and can query a pandas DataFrame by
name. For SQL style and anything beyond analysis queries, see
`sql-development`.

## Spreadsheet route (LibreOffice Calc or Excel)

When the user wants to click around themselves:

- Import with the Text Import dialog (Calc) or Data > From Text/CSV
  (Excel), setting delimiter, encoding and column types explicitly; set ID
  and reference columns to Text.
- Use a pivot table for group-by questions; avoid hand-written SUMIF grids
  that break when rows are added.
- Save as a new `.ods` or `.xlsx` in `work/`; never save over the CSV.
- Re-check one or two pivot totals against the script, or by hand, before
  trusting them.

## Checking your own numbers

- Recompute each headline figure a second way (pivot vs code, or a manual
  sum of a small slice).
- Reconcile the grand total with the source app or statement.
- Look at the top and bottom five rows behind any surprising figure; one
  mis-coded transaction often explains a "spike".
- Keep the row count at every step in the script's output, so a filter that
  removed half the data is visible.
