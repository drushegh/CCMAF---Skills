# Categories and the rules file

Categories exist to answer the user's questions ("how much on food?", "what
are we paying every month?"). Fewer, well-applied categories beat a detailed
taxonomy full of misfiled rows.

## Starter taxonomy

Two levels at most. Start here and let the user rename, merge or add.

| Group | Categories |
|---|---|
| Home | rent-mortgage, utilities, home-insurance, property-tax, maintenance |
| Food | groceries, eating-out |
| Transport | fuel, public-transport, car-costs, car-insurance, parking-tolls |
| Health | pharmacy, gp-dental-medical, health-insurance |
| Family | childcare, education, clothing, gifts |
| Lifestyle | subscriptions, entertainment, holidays, hobbies |
| Money | bank-fees, interest-paid, loan-repayment, savings-moved |
| Income | salary, benefits, refunds-reimbursed, interest-earned, other-income |
| Special | transfer, cash-withdrawal, uncategorised |

Rules of thumb:

- `transfer` is for moves between the user's own accounts. It is excluded
  from spending and income totals, always, and the exclusion is stated in
  reports.
- `savings-moved` is a transfer the user wants to see (into a savings account
  they hold). Treat as transfer for spending totals unless asked otherwise.
- `cash-withdrawal` is spending of unknown kind. Do not guess what the cash
  bought; let the user split it if they want.
- `uncategorised` is a real category with a visible count, not a bin called
  "Other" that quietly swallows a third of spending.
- Health categories matter at tax time in some locales (Ireland: health
  expenses relief); keep them distinct from general retail.

## The rules file (`work/rules/rules_vNN.csv`)

```text
priority,match_field,match_type,pattern,amount_sign,account,category,note
10,description,contains,SALARY ACME-FICTIONAL,in,,salary,
20,description,regex,^(DD|SO) .*ELECTRIC,out,,utilities,electricity direct debit
30,description,contains,PHARM,out,,pharmacy,
40,description,regex,^TFR TO .*5678$,out,current-1234,transfer,to own savings
50,description,contains,COFFEE CART,out,,eating-out,
```

- `match_type`: `contains` (case-insensitive substring), `equals`, `regex`
  (case-insensitive, anchored only if the pattern says so).
- `amount_sign`: `in`, `out` or blank for either. Stops a refund from a shop
  matching a spending rule as income, or the reverse.
- `account`: restrict a rule to one account alias, or blank for all.
- Lowest `priority` number that matches wins. Leave gaps (10, 20, 30) for
  inserting rules later.
- Every rules change is a new version with a `CHANGES.md` entry saying which
  rules changed and how many ledger rows moved category as a result.

Prefer `contains` on a distinctive token over clever regexes; descriptions
vary by channel (card, contactless, online) for the same merchant. Test a new
rule against the whole ledger and show the user what it would catch before
saving it: a rule matching `CORNER` for a corner shop also matches `CORNERSTONE DENTAL`.

## Overrides

For one-off corrections (this particular payment to a hardware shop was a
gift), write `work/ledger/overrides.csv`:

```text
id,category,split,note
3f9a1c2e7b6d4a10,gifts,,birthday present
8c21d0e4aa93f512,,groceries:62.40;clothing:25.00,mixed shop
```

Overrides key on the ledger `id`, survive rebuilds, and beat rules. Splits must
sum exactly to the transaction amount; reject them otherwise.

## Categorising workflow

1. Apply rules; count categorised and uncategorised rows.
2. Group uncategorised rows by a normalised description token (strip dates,
   card suffixes, reference numbers) and show the largest groups first with
   their totals. Ten groups usually cover most of the remainder.
3. Propose a rule per group; the user accepts, edits or rejects. Do not invent
   a category for a merchant you cannot identify; ask, or leave uncategorised.
4. Write the new rules version, re-apply, report the new uncategorised count.

Never infer sensitive facts from transactions beyond what the category needs
(health conditions from pharmacy names, religion from donations, and so on),
and never write such inferences into notes. `personal-data-care` covers
special-category data.

## Recurring payments

Recurring detection is a report, not a category: same normalised payee, a
similar amount (within a tolerance the user accepts, say 10%), at a regular
interval (weekly, monthly, quarterly, annual) on at least three occasions, or
two for annual. List each with interval, typical amount, last date and next
expected date. This list feeds `household-admin` renewals tracking; it does not
cancel or change anything.
