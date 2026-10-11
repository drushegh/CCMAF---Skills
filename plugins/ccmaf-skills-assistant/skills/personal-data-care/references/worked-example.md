# Worked example: a capture triaged, a leaked token handled, a "forget this" request

Fictional user: Tadhg, who keeps an Obsidian vault synced with git to a
private remote and his Android phone, and uses an assistant to process his
inbox.

## 1. Triage during inbox processing

The inbox holds a note pasted from an email by his insurer:

```markdown
# Car insurance renewal
Policy CAR-000-EXAMPLE renews 2026-11-14. Premium €612.
Paid by card 4111 1111 1111 1111 exp 08/27.
Your online account password has been reset to: Example-Temp-2026
Dr's letter re: knee surgery attached for the claim.
```

The assistant's plan row, before any edit:

```markdown
| Note | Proposed action | Notes |
|---|---|---|
| Car insurance renewal.md | Redact, then file to 03-areas/Car/Insurance.md | Full card number (masked: ****1111), a password, and a health reference found. Proposal: keep policy number, renewal date, premium, "card ending 1111"; remove the password (change it, store in password manager); replace the medical line with "medical letter sent with claim (not stored here)". Not yet committed, so no history clean-up needed. |
```

Tadhg agrees, and asks to keep "knee surgery claim" as a phrase because he
needs to track the claim. That is his explicit request, so it stays, in
this one note only. The filed note:

```markdown
# Car insurance
- Policy CAR-000-EXAMPLE renews 2026-11-14. Premium €612.
- Paid by Visa ending 1111 (expires 2027-08).
- Online account: password changed 2026-10-11, stored in Bitwarden.
- Knee surgery claim: medical letter sent with the claim (letter not stored here).
```

The assistant suggests he change the insurer password because it travelled
by email; he does. The daily-note summary says "3 sensitive items redacted
from an insurance capture", without values.

## 2. A token that was pushed

A week later, a gitleaks pre-commit run on the PC flags a GitHub personal
access token in `04-resources/Phone sync setup.md`. History shows it was
committed from the phone three days ago and pushed (phones do not run the
hook).

Steps, following `redaction-procedure.md`:

1. **Show:** "A GitHub token (masked `github_pat_****`) is in *Phone sync
   setup.md*, line 12, committed 2026-10-15 from the phone and pushed to
   the remote."
2. **Contain:** auto-sync paused on the phone plugin.
3. **Rotate:** Tadhg revokes the token in GitHub settings and creates a new
   fine-grained token scoped to the vault repository with an expiry date,
   entered directly into the phone's git plugin. He confirms the old token
   is revoked.
4. **Redact:** the line becomes `Token: stored in the Obsidian Git plugin
   settings on the phone (not here)`. Committed as
   `vault: redact credential in 1 note`.
5. **History:** the token is revoked, so it is harmless in history. The
   assistant explains that rewriting would mean force-pushing and
   re-cloning the phone; Tadhg chooses not to.
6. **Verify:** `gitleaks dir . --redact` clean on the working tree;
   `gitleaks git . --redact` still reports the old commit, now marked in
   `.gitleaksignore` by fingerprint with his approval, with a note that the
   token is revoked.
7. **Tell:** "Token revoked and replaced; removed from the note; it remains
   in history, inactive. Phone sync re-enabled."

Prevention: the assistant suggests the phone never holds setup notes with
credentials, and that he runs a gitleaks scan on the PC after each phone
session (or a weekly scheduled scan that only reports).

## 3. "Please forget my old flatmate's details"

Tadhg's former flatmate asked him to delete her phone number and the
notes about her that he had kept for splitting bills.

1. **Search (read-only):** her name, nickname, phone number (with and
   without spaces and the +353 prefix) and email across the vault, run
   logs and the journal. Found: `05-people/Example Flatmate.md`, 6 daily
   notes mentioning her, 2 inbox-processing plans quoting her number.
2. **Plan shown:** delete the people note (moved to `.trash/`, then
   emptied after Tadhg confirms); in daily notes replace her name with
   "former flatmate" and remove the number; redact the number in the two
   plans. History: the number is in history; she asked for deletion, and a
   phone number cannot be rotated, so Tadhg chooses to clean history.
3. **Apply** with confirmation, journal entry recorded with values as
   `<redacted>`, committed.
4. **History clean-up** on a fresh clone with `git filter-repo
   --replace-text` (expressions file kept outside the repo and deleted
   afterwards) and `--invert-paths` for the people note; verified with
   `git log -S` on a fresh clone printing nothing; force-pushed after his
   approval; phone vault copied out, re-cloned and checked.
5. **Tell:** "Her note and number are gone from the vault and its history.
   Copies may remain in backups made before today (File History on the PC)
   and in your phone's contacts, which I haven't touched."

## What made this go well

- Nothing edited before the user saw what was found, masked.
- Rotation came first for the credential; history rewriting was offered,
  not assumed.
- The user's explicit wish to keep one health phrase was respected and
  contained to one note.
- Every copy was searched: notes, logs, plans, journal, history, devices.
- The final message said what still exists, not just what was removed.
