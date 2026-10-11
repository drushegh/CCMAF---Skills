# What never to store, and how to spot it

Each entry gives the rule, the reason, what to write instead, and a
detection hint. Detection patterns are deliberately loose: they find
candidates for a person to look at, never things to delete automatically.

## Tier 1: refuse to store

### Passwords, PINs, passphrases, security answers

- **Why:** the vault syncs to several devices and a remote; one leak is
  every account reused with that password.
- **Instead:** "Electricity account: login in Bitwarden" or "PIN: in the
  password manager". Offer to help the user set up a free manager
  (Bitwarden, KeePassXC) if they have none.
- **Spot:** words near a value: `password`, `pwd`, `pass:`, `PIN`,
  `passcode`, `login:`, `mother's maiden`, `security question`, in English
  and the user's other languages (Irish: `pasfhocal`).

### One-time codes, recovery codes, backup codes

- **Why:** recovery codes bypass two-factor authentication entirely.
- **Instead:** printed and kept somewhere physical, or in the password
  manager. A one-time code is used and forgotten; never logged.
- **Spot:** "recovery code", "backup codes", groups of 8 to 10
  alphanumerics in a list of 8 to 16.

### Card numbers, CVV, full expiry with number

- **Why:** fraud risk; card data has its own industry rules (PCI DSS) for
  good reason.
- **Instead:** issuer and last four digits: "Visa ending 4821, expires
  2027-08" (expiry alone is fine).
- **Spot:** 13 to 19 digits, possibly in groups of four separated by
  spaces or dashes, that pass the Luhn check (`scanning-tools.md` has a
  checker). A three- or four-digit number labelled CVV, CVC or "security
  code".

### API keys, tokens, private keys, `.env` content

- **Why:** they grant access without a person in the loop and are
  scraped from public repositories within minutes.
- **Instead:** the secret store of the tool that uses it; the note says
  which tool and where.
- **Spot:** `-----BEGIN ... PRIVATE KEY-----`, `ghp_`, `github_pat_`,
  `xox[bpas]-`, `sk-` followed by a long string, `AKIA` followed by 16
  uppercase alphanumerics, `AIza` followed by 35 characters, any
  `KEY=`/`TOKEN=`/`SECRET=` line, a file called `.env`. A scanner such as
  gitleaks covers hundreds of formats; use it rather than this list.

## Tier 2: reference, do not copy

### Bank details (IBAN, BIC, account and sort codes)

- **Why:** an IBAN alone is less dangerous than a card number, but it
  enables direct-debit fraud and phishing that sounds convincing.
- **Instead:** "Current account at the credit union" or the last four
  characters. If the user insists on full details (for paying a
  tradesperson regularly), keep them in the password manager's secure
  notes or an encrypted finance record (`personal-finance-records`).
- **Spot:** two letters, two digits, then 11 to 30 alphanumerics; an Irish
  IBAN is 22 characters starting `IE` (`IE` + 2 check digits + 4-letter bank
  code + 6-digit sort code + 8-digit account number).

### National identifiers

- **Why:** identity theft, and in Ireland the PPS number unlocks social
  welfare, tax and health services.
- **Instead:** "PPS number: on payslips and Revenue letters".
- **Spot (Ireland):** PPS number is 7 digits followed by one or two
  letters (e.g. the shape `1234567T` or `1234567TA`; fictional). Also
  passport numbers, driving licence numbers, UK National Insurance numbers
  (two letters, six digits, one letter). Labels: `PPS`, `PPSN`,
  `passport no`, `licence no`, `NI number`.

### Full date of birth plus address plus name together

- **Why:** each alone is ordinary; together they are the standard
  identity-verification set.
- **Instead:** birthdays as `MM-DD` in a people note if the user wants
  reminders; addresses in the contacts app.

## Tier 3: only on explicit request (special categories)

GDPR Article 9 lists special categories: racial or ethnic origin, political
opinions, religious or philosophical beliefs, trade union membership,
genetic data, biometric data used for identification, health, and sex life
or sexual orientation. Treat them as "only if asked", for the user and
especially for third parties.

### Health

- **Default:** appointments (date, time, clinic, "bring referral letter")
  are fine. Diagnoses, symptoms, medication, test results and mental-health
  notes are not recorded unless the user asks for that specific record.
- **When asked:** keep one dedicated note or folder, preferably in the
  local-only or encrypted location (`local-only-and-storage.md`), and say
  where it lives and whether it syncs. Do not scatter health mentions into
  daily notes, people notes or run logs.
- **Third parties:** "Mum's hospital appointment Tuesday, drive her" is
  fine; her diagnosis is not, unless the user is her carer and asks.
- **Spot:** medication names, dosage patterns (`mg`, `twice daily`),
  clinical words (diagnosis, prescription, referral, scan results),
  counselling or therapy notes.

### Beliefs, orientation, union membership, ethnicity

- **Default:** do not infer or record. If the user mentions them in
  passing, act on the task and leave the detail out of notes.

## Tier 4: minimise

- **Children:** names, school, activities, events. No ID numbers, no
  medical detail without request, no photos in synced notes unless asked.
- **Other adults:** role, relationship, what was agreed. Not their
  private contact details, finances or health.
- **Location history:** "met at the café on Main Street" is fine; a
  running log of someone's movements is not.
- **Screenshots and scans:** treat an image as the data it shows. Ask
  before filing an image of a card, ID, letter from a doctor, or bank
  statement.

## When the user asks to store something on the refuse list

1. Say plainly why it is risky in this vault (synced, on the phone, in a
   remote, readable by the assistant and plugins).
2. Offer the better place (password manager, local encrypted folder).
3. If they still want it in the vault, it is their data: store the
   minimum, in one named place, and note in your reply where it lives.
   Never store it in run logs, journals or summaries regardless.
4. Exception: credentials for the assistant's own use (tokens, passwords
   it would log in with) are never written to workspace files; they go in
   the OS credential store or the tool's own secret mechanism.
