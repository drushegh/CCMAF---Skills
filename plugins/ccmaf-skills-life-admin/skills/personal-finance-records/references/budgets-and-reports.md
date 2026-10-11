# Budgets and reports

A budget here is the user's own plan written down, and a report is an honest
description of what happened against it. Neither is advice: the user sets the
numbers; you compute, compare and explain.

## Budget file (`work/budget/budget-YYYY_vNN.csv`)

```text
category,period,amount,note
groceries,month,650.00,
eating-out,month,120.00,
utilities,month,210.00,averaged; bills are bi-monthly
car-insurance,year,780.00,renews March
holidays,year,2000.00,
```

- `period` is `month` or `year`. Annual lines are spread evenly for monthly
  comparisons and also reported as year-to-date against the annual figure, so
  a large annual bill in one month does not look like overspending.
- Amounts are positive numbers for planned spending (or income in income
  categories); comparisons flip the ledger sign as needed.
- Starting point when the user has no budget: offer the last 3 or 12 months'
  actual average per category as a draft they edit. Say plainly that this is
  their history, not a target you recommend.
- Changes are new versions with a `CHANGES.md` entry (what changed and why,
  in the user's words).

## Monthly summary (`out/YYYY-MM_summary_vNN.md`)

Fixed shape, short:

```markdown
# September 2026 — household summary

Data: current-1234 (reconciled, row-level), card-4821 (reconciled, period).
Covers 2026-09-01 to 2026-09-30. Transfers between own accounts excluded (€1,150.00).

| | Budget | Actual | Difference |
|---|---:|---:|---:|
| Income | 4,300.00 | 4,312.55 | +12.55 |
| Spending | 3,400.00 | 3,587.20 | -187.20 |

## Over budget
- eating-out: €184.30 vs €120.00 (14 transactions; largest €48.00 on 19 Sep)

## Notable
- 3 new recurring payments detected (listed in recurring.md)
- 11 transactions uncategorised, €96.40 in total

## Caveats
- Card statement period runs 5 Sep to 4 Oct; September figures use transaction dates.
```

Reporting rules:

- **State coverage first**: which accounts, which dates, reconciliation status.
  A summary built on one account of three must say so in its first line.
- Show differences with the sign meaning stated once (here: negative = over).
- "Notable" lists facts. No "you should", "consider", "try to cut".
- Round only for display; compute in full precision. Totals in a table must add
  up as displayed or carry a "rounding" note.
- Keep the uncategorised total visible. If it is above roughly 5% of spending,
  lead with that, because every category figure is then soft.

## Annual summary

Same shape over twelve months plus: month-by-month spending per group, annual
lines against annual budget, recurring payments with yearly cost, and a
health-expenses list if the locale pack uses one (Ireland: see
`locale-ie.md`). An annual summary for a tax return is a **record extract**: it
lists transactions and receipts; it never states what is claimable.

## Charts

If the user wants charts, keep them few and plain: spending by category for a
period (sorted bar), monthly spending trend (line or column), budget vs actual
(paired bars). Chart choice and accessibility → `everyday-data-analysis`; files
via `office-formats`. Label currency and period on every chart.

## Questions you may answer, and how

| User asks | Answer with |
|---|---|
| "Where does our money go?" | Category totals for a stated period, largest first, with coverage line |
| "Are we overspending?" | Budget vs actual against *their* budget; if none, history only, no judgement |
| "What subscriptions do we have?" | Recurring-payment list with amounts and next expected date |
| "Can we afford X?" | Their figures (average surplus, current balances) laid out; the decision is theirs; no recommendation |
| "Should I pay off the loan / invest / switch provider?" | Decline the advice part plainly; offer the records that would inform it and point to an independent qualified adviser |

## Sharing

A report for someone else (partner, accountant, a grant or loan application)
is built for that purpose: only the accounts and periods asked for, masked
identifiers, no unrelated transactions, no notes. Confirm the recipient and
contents with the user; you never send it. Minimisation rules →
`personal-data-care`.
