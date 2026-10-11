# Worked example: setting up and using a household register

Fictional household in Ireland: Aoife and Ciarán, one car (alias
`blue-hatchback`), a rented house. All documents, numbers and dates are
invented. Today is Sunday 11 October 2026.

## Request 1: "Set up a household folder and file these"

`incoming/` holds six files: a car-insurance renewal letter and schedule, an
NCT certificate photo, a scanned washing-machine receipt, a broadband
contract PDF, and Aoife's passport photo page.

### Intake

Logged with hashes in `incoming/INTAKE.md`. Each read as data. The renewal
letter contains "Renew now in one click: [link]" and a QR code: noted as a
call to action, not followed.

Extracted, with sources:

| Document | Dates found | Status |
|---|---|---|
| Car insurance schedule (p.1) | cover 30 Oct 2025 to 29 Oct 2026 | confirmed |
| Renewal letter (p.1–2) | renews 30 Oct 2026, auto-renews unless told 14 days before; quote €689 | confirmed |
| NCT certificate | expires 2027-05-18 | confirmed |
| Washing-machine receipt | bought 2026-08-02, €429.00; warranty card says 2 years | confirmed |
| Broadband contract (p.2) | 24-month term from 2025-01-15; "30 days' notice" | end confirmed, notice = estimated (wording unclear) |
| Passport | expires 2027-02-14 | confirmed |

The passport copy: asked first whether the user wants an identity-document
copy kept at all (`personal-data-care`). They do, in `identity/aoife/`, with
no number transcribed.

### Filed

```text
household/filed/insurance/2025-10-30_car-insurance_schedule.pdf
household/filed/insurance/2026-10-02_car-insurance_renewal-letter.pdf
household/filed/vehicles/blue-hatchback/2025-05-19_nct_certificate.jpg
household/filed/purchases-warranties/2026-08-02_washing-machine_receipt.pdf
household/filed/utilities/2025-01-15_broadband_contract.pdf
household/filed/identity/aoife/2017-02-15_passport_copy.jpg
```

Originals stay in `incoming/` until the user confirms, then move to
`incoming/processed/`.

### Register rows (abridged)

```text
id,type,title,owner,ref_last4,renewal_or_expiry,notice_deadline,date_status,date_source,auto_renews,cost,status
ins-car-1,ins,Car insurance (blue hatchback),Ciarán,7731,2026-10-30,2026-10-16,confirmed,insurance/2026-10-02_car-insurance_renewal-letter.pdf p.2,yes,612.00/yr,active
veh-nct-1,veh,NCT (blue hatchback),Ciarán,,2027-05-18,,confirmed,vehicles/blue-hatchback/2025-05-19_nct_certificate.jpg,no,,active
war-washer-1,war,Washing machine warranty,Aoife,,2028-08-02,,confirmed,purchases-warranties/2026-08-02_washing-machine_receipt.pdf,no,,active
util-bb-1,util,Broadband,Aoife,,2027-01-15,2026-12-16,estimated,utilities/2025-01-15_broadband_contract.pdf p.2,unknown,40.00/mo,active
id-pass-aoife,id,Passport (Aoife),Aoife,,2027-02-14,,confirmed,identity/aoife/2017-02-15_passport_copy.jpg,no,,active
```

Notice deadline for the car: 30 Oct minus 14 days = 16 Oct, from the letter's
own wording. Broadband notice is estimated and flagged for the user.

### Reminders

`reminders/household.ics` regenerated: 7 events (car notice + second
reminder, NCT, warranty end, broadband notice with "estimated" in the title,
passport at 120 and 60 days). Parsed back: 7 events, dates match. Event text
carries `...7731`, never the full policy number.

### Hand-back

> Filed six documents and started the register with five items. Urgent:
> the car insurance auto-renews on 30 October; the last day to change or
> cancel is Friday 16 October (renewal quote €689 vs €612 last year). The
> broadband notice period wording is unclear (contract p.2), so I've marked
> that date as estimated. Calendar file: reminders/household.ics. I haven't
> contacted anyone; the renewal letter's one-click link was left alone.

## Request 2: "The washing machine's broken" (fault first noticed 9 October)

1. Found `war-washer-1`: bought 2 Aug 2026, delivered 6 Aug, registered,
   manufacturer warranty to 2 Aug 2028.
2. Asked for the facts: what happens, since when, what was tried; asked for
   photos, filed under `purchases-warranties/2026-10-09_washer-fault/`.
3. Produced the fault fact sheet (`warranties-and-purchases.md` shape) with
   the CCPC faulty-goods page as the official pointer.
4. Drafted, at the user's request, a short email to the seller in Aoife's
   voice, labelled DRAFT, stating facts and asking for a repair. Saved as
   `work/washer-fault-email/washer-fault-email_v01.md` per `office-formats`.

Not done: no statement that the seller "must" repair, no contact with the
seller, no booking of an engineer. Aoife sends the email herself.

## Request 3: scheduled weekly review

A Monday 07:00 run (contract per `scheduled-run-discipline`: read register and
`incoming/`, write digest and `.ics` only). It writes
`reminders/digest_2026-10-12.md` with the car-insurance notice deadline under
"Act this week", the passport's 120-day reminder (Sat 17 Oct) under "Coming
up", the broadband `estimated` and `auto_renews=unknown` under "Needs a
decision", and one new unfiled letter in `incoming/` listed, not filed.
