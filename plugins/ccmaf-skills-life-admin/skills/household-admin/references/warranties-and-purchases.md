# Warranties and purchases

When something breaks, the user needs three things fast: proof of purchase,
the terms that apply, and a clear account of the fault. This reference keeps
those ready and describes rights only by pointing to official sources.

## What to record for a purchase worth tracking

Track items where a fault would hurt: appliances, electronics, furniture,
tools, bikes, anything over a threshold the user sets (say €100), and
anything with a registered or extended warranty.

Register row (`type=war`) plus a note in `register-notes.md`:

```markdown
## war-washer-1 — washing machine
- Bought: 2026-08-02, appliance store (online order), €429.00
- Proof of purchase: household/filed/purchases-warranties/2026-08-02_washing-machine_receipt.pdf
- Model / serial: model WM-FICT-800, serial last 4 ...K2Q9 (full on the rating plate)
- Delivered: 2026-08-06 (the date statutory periods usually run from; see locale pointer)
- Manufacturer warranty: 2 years from purchase, registration required: done 2026-08-07
- Extended cover: none
- Manual: household/filed/purchases-warranties/2026-08-02_washing-machine_manual.pdf
```

- **Delivery date** matters: statutory periods in some locales run from when
  the consumer received the goods. Record it when known.
- **Registration**: some manufacturer warranties need product registration.
  Record whether it was done; never register on the user's behalf.
- **Serial numbers** are fine to record (they are product, not personal,
  identifiers), but keep full serials out of file names.
- Link the receipt to its bank transaction through `personal-finance-records`
  when that skill is in use, so the payment proof is one step away.

## Three different things, kept apart

| Layer | What it is | Where its terms come from |
|---|---|---|
| Statutory rights | The consumer's legal rights against the seller, regardless of any warranty | Law; describe only by pointing to the official consumer body (locale pack) |
| Manufacturer warranty or guarantee | A voluntary promise from the maker, in addition to statutory rights | The warranty document |
| Extended warranty or insurance | A paid product, often from a third party | Its policy document |

Do not merge these into one "warranty end" date. The register's
`renewal_or_expiry` holds the manufacturer warranty end; statutory periods are
noted as a pointer ("statutory rights: see CCPC faulty goods page"), not as a
computed date, because how they apply depends on facts and law the assistant
must not assess.

In the EU, a seller's legal guarantee for goods lasts at least two years under
EU consumer-sales rules, and member states may set longer periods; national
consumer bodies explain how it applies (verify current national rules via the
locale pack). Never tell the user they are or are not entitled to a remedy.

## When something breaks: fault prep

Produce a fact sheet the user can use with the seller or maker:

```markdown
# Fault summary — washing machine (draft for the user)
- Item: washing machine, model WM-FICT-800
- Bought: 2 August 2026 from <seller>, €429.00 (receipt attached: yes)
- Delivered: 6 August 2026
- Fault first noticed: 9 October 2026
- What happens: stops mid-cycle with error E21; drum does not drain
- What the user has done: checked filter (clear), restarted (same error)
- Photos/video: household/filed/purchases-warranties/2026-10-09_washer-fault/
- Manufacturer warranty: within 2-year period (registered 7 Aug 2026)
- Official guidance on rights: <locale pointer, e.g. CCPC faulty goods page>
- What the user wants: repair or replacement (user to decide)
```

Then, if asked, draft a short letter or email to the seller in the user's
voice for the user to send (`document-authoring` for the drafting). The draft
states facts and what the user asks for; it does not cite legal provisions
beyond naming the official guidance page, and it is labelled a draft.

Do not contact the seller, fill in an online returns form, or book a repair.

## Manuals and service records

- File manuals next to the receipt; if only a link to an online manual exists,
  download it once the user agrees (from the maker's own site) and file it
  locally, because links rot.
- Service records (boiler service, car service) go in the relevant category
  folder with the date and what was done; the register tracks the next due
  date.

## Ending

When the manufacturer warranty ends, the row becomes `ended`; the receipt
stays filed, because statutory rights and insurance claims can still need it.
Moving purchase records to `archive/` happens when the item is disposed of,
and the user says so.
