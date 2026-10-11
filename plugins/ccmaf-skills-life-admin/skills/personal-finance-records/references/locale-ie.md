# Locale pack: Ireland (IE)

Formats, generic export quirks and pointers to official sources for a
household in Ireland. Everything in the "Tax-year records" section is a
**pointer**, checked against Revenue's pages in October 2026; rules change
every Budget, so re-check the linked page before relying on any detail and say
"(verify)" when you have not. This pack never says what is claimable or what
anyone should do; it says where the authoritative answer lives.

## Formats

| Item | Irish convention | Notes |
|---|---|---|
| Currency | EUR, symbol `€` before the number: `€1,234.56` | Some exports write `EUR` or no symbol |
| Decimal mark | `.` (point) | Unlike much of the eurozone; see below |
| Thousands separator | `,` (comma), often omitted in exports | |
| Dates | `DD/MM/YYYY`; exports also use `DD-MM-YYYY`, `DD MMM YYYY` | Never assume `MM/DD` |
| Negative amounts | `-12.50`, sometimes separate debit/credit columns | |
| IBAN | `IE` + 2 check digits + 4-letter bank code + 6-digit sort code + 8-digit account = 22 characters | Mask to last four in outputs |
| Sort code | 6 digits, often written `NN-NN-NN` | Treat as an identifier; do not print with account number |

**The cross-border trap.** Irish residents commonly hold accounts or cards
with providers based in other eurozone countries, or use app-based accounts
whose export locale follows the provider or the app's language setting. Those
exports may use decimal commas (`1.234,56`), semicolon delimiters and
`DD.MM.YYYY` dates. Decide the number format per file from the data
(`csv-normalising.md`), never from the user's country.

## Generic export quirks seen in Irish bank and card exports

Banks are not named here; check each new source and record its mapping.
Patterns worth expecting:

- **Separate debit and credit columns** with blanks rather than zeros, and a
  running balance column. The balance may be absent on card exports.
- **Preamble lines** above the header (account name, masked number, date range)
  and occasionally a totals line at the end.
- **Encoding**: some exports are Windows-1252, so `€` arrives as byte `0x80`.
  Others are UTF-8 with or without a BOM.
- **Description prefixes** for channel: point-of-sale or contactless markers,
  `DD` / direct debit, `SO` / standing order, transfer markers, ATM markers,
  and card-number suffixes. Strip these for grouping and rule matching only,
  never in the ledger's description.
- **Truncated descriptions** at a fixed width (often around 18 to 25
  characters) so merchant names are cut. Rules should match the stable prefix.
- **Two dates**: transaction date and posting date differ by one to three
  working days for card spend. Use transaction date for budgeting, keep both.
- **Foreign-currency spend** shown as one line with the euro amount, sometimes
  plus a separate fee line; keep the fee as its own row (category `bank-fees`).
- **Quarterly fee and government-duty lines** on current accounts and cards
  appear as standalone rows with bank-specific wording; categorise as
  `bank-fees` unless the user prefers otherwise.
- **Statement period ≠ calendar month** for credit cards. Monthly summaries
  use transaction dates and say so.
- **Export date range limits**: many online-banking exports cap the range per
  download, so a year arrives as several overlapping files. Deduplication
  (`csv-normalising.md`) handles the overlap.

## Tax-year records (pointers only)

- **The Irish tax year is the calendar year**, 1 January to 31 December.
  Annual summaries for tax purposes run on that year.
- **Authoritative source**: Revenue, `revenue.ie`. Online services are
  **myAccount** (most PAYE employees) and **ROS** (self-assessed taxpayers).
  The assistant never logs into either; the user does.
- **Health expenses**: Revenue's health-expenses pages (checked October 2026)
  say original receipts must be kept for **six years**, that claims can cover
  the **last four years**, each year claimed separately, that PAYE taxpayers
  claim through myAccount (in-year or after year end) and self-assessed
  taxpayers in the health-expenses section of their return in ROS, and that the
  old Med 1 form is no longer available. Revenue also offers a **Receipts
  Tracker** in myAccount for storing receipt images; whether an uploaded image
  replaces keeping the paper is stated on Revenue's receipts-tracker page:
  read it rather than asserting (verify). What counts as a qualifying expense
  is Revenue's call; the skill keeps `health` receipts and lists them, it does
  not classify them as qualifying.
  - https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/health-and-age/health-expenses/how-do-you-claim-health-expenses.aspx
  - https://www.revenue.ie/en/online-services/services/myaccount/manage-your-receipts-with-receipts-tracker.aspx
- **Self-assessment deadlines**: the return for a tax year is generally due by
  31 October of the following year, with an extended date for those who both
  pay and file through ROS, set each year by Revenue (for returns due
  31 October 2026 it was 18 November 2026). Always point to Revenue's current
  pay-and-file page rather than quoting a date from memory (verify each year).
  - https://revenue.ie/en/self-assessment-and-self-employment/guide-to-self-assessment/pay-file-system.aspx
- **Other reliefs and credits** (rent credit, tuition fees, remote working,
  and so on) change with each Budget. The skill's only role is to keep the
  relevant receipts and transactions findable under a clear category and to
  point to Revenue's page for the current rules. Do not state rates,
  thresholds or eligibility.
- **Questions beyond records** → Revenue's own guidance, or a qualified tax
  adviser. Citizens Information (`citizensinformation.ie`) publishes plain
  explanations of public services and entitlements and is a neutral pointer.

Suggested receipt retention defaults for Irish users, **for the user to
confirm**: `health` 6 years after the end of the tax year of the expense (from
the Revenue page above; counting from year end is a cautious reading, since
the page says "six years" without a start point (verify)); warranty receipts
per `household-admin`; `general` as the user chooses.

## Household money items specific to Ireland (for categories)

- **Local Property Tax** (`property-tax`), often paid by direct debit or
  deduction at source; see `household-admin` for the return cycle.
- **Motor tax**, **NCT** (National Car Test) and **car insurance**
  (`car-costs`, `car-insurance`); renewals tracked in `household-admin`.
- **TV licence** (`subscriptions` or `utilities`, user's choice).
- **Health insurance** (`health-insurance`); premiums and any related relief
  are Revenue matters, so record only.
- **Bin collection** charges (`utilities`), often prepaid or per lift.

Category names are suggestions; the user's taxonomy wins.
