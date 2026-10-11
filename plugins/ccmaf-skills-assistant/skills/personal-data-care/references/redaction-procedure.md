# Redaction procedure

Sensitive data found in the vault, a workspace file, a log or a commit.
The order matters: **contain, rotate, redact, clean history (optional),
verify, tell.**

## 0. Stop and show

Do not edit yet. Tell the user:

- what you found (type, not the value: "what looks like a full card
  number"), shown masked (`**** **** **** 4821`);
- where: file, line, and whether it is committed, pushed, or synced to
  other devices (`git log -S'<value>' --oneline --all` finds commits that
  added or removed it; run it locally only);
- what you propose.

Never paste the full value back into chat, a log, a journal or a commit
message.

## 1. Contain

- If a sync or scheduled push is about to run, pause it (turn off the
  plugin's auto-sync, or tell the user to).
- If the data is only in the working tree and not committed, the problem is
  small: go to step 3.

## 2. Rotate (if it is a credential or a payment card)

If the value was committed and pushed, or synced to another device or a
cloud drive, assume it is exposed:

| Leaked | Action (by the user; the assistant guides) |
|---|---|
| Password | Change it on the service; change anywhere it was reused |
| API token, personal access token | Revoke it in the issuing service; create a new one |
| SSH or other private key | Remove the public key from every server or service; generate a new pair |
| Card number with CVV | Contact the card issuer to cancel and reissue |
| Recovery codes | Generate new codes (old ones become invalid) |
| IBAN, PPS number | Cannot be changed easily; watch for phishing and fraud, tell the bank if worried |

The user confirms each rotation is done. This is the real fix; everything
after it is tidying.

## 3. Redact in the working tree

Replace the value with a reference, not with nothing:

```markdown
Before: Card: 4111 1111 1111 1111, CVV 123
After:  Card: Visa ending 1111 (details in Bitwarden)
```

(The example uses a well-known test card number, not a real one.)

Rules:

- One redaction marker style, so redactions are findable:
  `[redacted: <what>, <where to find it>]` or a reference as above.
- Redact every copy: search the whole workspace for the value and for
  variants (with and without spaces). Include `00-inbox/`, daily notes,
  run logs, the change journal, inbox-processing plans, exported summaries.
- If the user wants the data kept somewhere safer, move it there first,
  confirm it arrived, then redact.
- Commit the redaction on its own: `vault: redact sensitive data in 2 notes`
  (no detail of what in the message).

## 4. Clean history (optional, disruptive)

After rotation, a dead password in history is harmless. History rewriting
is worth it only when the data cannot be rotated (PPS number, health
detail, someone else's private information) or the user wants it gone.

What it involves, stated to the user before starting:

- Every commit after the first appearance gets a new hash.
- The remote must be **force-pushed**, which is otherwise forbidden in a
  vault.
- **Every other clone** (phone, laptop) must be re-cloned after copying
  out any unsynced edits; an old clone pushed again re-introduces the data.
- Hosted services may keep cached views, forks or pull-request refs of old
  commits; the host's support may need to purge them (check the host's
  documentation for removing sensitive data).
- Backups taken before the rewrite still contain it.

Tool: `git filter-repo` (separate install; Python). Typical uses:

```bash
# Work on a fresh clone; filter-repo refuses to run on a non-fresh clone without --force
git clone <remote> vault-clean && cd vault-clean

# Replace a string everywhere in history; expressions.txt holds one rule per line:
#   literal-value==>[redacted]
git filter-repo --replace-text ../expressions.txt

# Or remove a whole file from history
git filter-repo --invert-paths --path "05-people/Old notes.md"
```

`filter-repo` removes the `origin` remote as a safety measure; re-add it
and force-push only after the user approves:

```bash
git log -S'<value>' --all --oneline     # must print nothing
git remote add origin <remote>
git push --force --all && git push --force --tags
```

Keep `expressions.txt` outside the repository and delete it afterwards: it
contains the very value being removed. Check flags against the
`git filter-repo` documentation for the installed version (verify).

Then, on each other device: copy out unsynced notes, delete the old clone,
re-clone, paste the notes back.

## 5. Verify

- [ ] `git grep -nF '<value>'` on the working tree: nothing (run with the
      value typed locally; never written to a file in the workspace).
- [ ] If history was cleaned: `git log -S'<value>' --all` prints nothing on
      a fresh clone from the remote.
- [ ] Logs, journals and summaries searched too.
- [ ] Rotation confirmed by the user, where applicable.
- [ ] Other devices re-cloned or confirmed clean.

## 6. Tell

Two or three lines: what was found (type only), what was rotated, where
redacted, whether it still exists in history, backups or on other devices,
and what the user still needs to do. If the cause was a habit (pasting bank
emails into the inbox), suggest the change that prevents it.

## Journal entry

Record the redaction as a change-journal entry (`safe-system-changes`),
with the value itself always written as `<redacted>`. The undo for a
redaction is "restore from the safer location", never "restore the value".
