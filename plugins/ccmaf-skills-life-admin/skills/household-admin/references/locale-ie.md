# Locale notes: Ireland (IE)

Household renewals and rights pointers for Ireland. Last checked October
2026. Everything here is a **pointer**: public services change their rules,
cycles and websites, so confirm on the official page before relying on any
detail, and write "(verify)" next to anything you have not checked in this
session. The assistant never logs in to, applies to or pays any of these
services; the user does.

Neutral starting points for any public service:

- **gov.ie** — central government services and departments.
- **Citizens Information** (`citizensinformation.ie`) — plain explanations of
  public services, entitlements and consumer matters.
- **CCPC** (Competition and Consumer Protection Commission, `ccpc.ie`) —
  consumer rights for goods and services.

## Typical register items for an Irish household

| Item | Register type | Notes and pointers |
|---|---|---|
| Car insurance | `ins` | Legally required to drive. Track renewal and any notice period in the policy; insurers send renewal notices ahead of the date (lead time set by regulation; verify current rule) |
| Home and contents insurance | `ins` | Mortgage lenders typically require buildings cover; check the mortgage terms |
| Health insurance | `ins` | Annual renewal; any tax relief on premiums is a Revenue matter (see `personal-finance-records` locale pack) |
| Motor tax | `veh` | Paid for 3, 6 or 12 months (verify current options); the official online service is reached via gov.ie / motortax.ie (verify) |
| NCT (National Car Test) | `veh` | Periodic roadworthiness test; how often depends on the vehicle's age (verify on the NCTS site). The certificate shows its expiry date: use that, not a calculation |
| Driving licence | `id` | Expiry date is on the licence; renewals go through the National Driver Licence Service (NDLS) (verify process) |
| Passport | `id` | Expiry on the passport; renewal online or by post through the Department of Foreign Affairs' passport service (verify current processing times before travel). Some destinations require validity beyond the travel dates |
| Local Property Tax (LPT) | `tax` | Revenue administers LPT. The current valuation period runs 2026 to 2030, valued as at 1 November 2025, with the next revaluation due 1 November 2030 (Revenue, checked October 2026). Annual payment method and dates: Revenue's LPT pages |
| TV licence | `util` | Annual; issued through the statutory issuing agent. The licence model has been under policy review; check current arrangements on gov.ie (verify) |
| Energy, broadband, mobile | `util` | Fixed-term contracts with notice and switching rules; record contract end and notice wording from the contract |
| Bin collection | `util` | Private operators, prepaid or per-lift plans; track renewal of annual plans |
| Boiler service, chimney | `home` | Annual by habit; record the date on the service report |

Do not compute legal deadlines from rules of thumb. Register the date printed
on the certificate, licence, schedule or letter, with its source.

## Consumer rights pointers (goods)

- The CCPC's faulty-goods guidance (checked October 2026) says that under the
  **Consumer Rights Act 2022** consumers can seek a remedy for faulty goods for
  up to **six years** from receiving them, that a fault appearing within the
  first year is presumed to have existed at delivery unless the seller shows
  otherwise, and that there is a short-term right to reject faulty goods for a
  full refund within **30 days**. Different rules apply to goods bought
  before the Act commenced (late November 2022; verify the exact date on the
  CCPC page).
  - https://www.ccpc.ie/consumers/ (faulty goods section)
- Use these as **pointers in the fault fact sheet** ("Official guidance:
  CCPC faulty goods page"). Do not state whether this user is entitled to a
  remedy, which remedy, or what the seller must do. The CCPC page and, where
  needed, a solicitor or the CCPC's own helpline answer that.
- Practical record-keeping consequence, fine to state: keep proof of purchase
  and the delivery date for items you may want to rely on these rights for, for
  at least the period the official guidance describes.

## Insurance pointers

- Policy wording, not general rules, decides cover. In a claim fact sheet,
  quote the policy section the user points to; do not interpret cover.
- Complaints about financial services, including insurance, have a statutory
  ombudsman route (the Financial Services and Pensions Ombudsman, `fspo.ie`);
  mention it only as a pointer if the user asks how to complain (verify the
  current process on its site).

## Formats

- Dates in digests: `Fri 16 October 2026` (day-month order; never `10/16`).
- Currency: `€612.00`, decimal point. See `personal-finance-records`
  `locale-ie.md` for full money formats.
- Identifier masking: PPS numbers, licence numbers, passport numbers, vehicle
  registration and policy numbers appear as last four characters in any output.
  Vehicle registrations in file and folder names are replaced by an alias.
