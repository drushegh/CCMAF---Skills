# The Change Journal

The journal is the machine's equivalent of a commit history: what changed,
why, and exactly how to put it back. It lives **in the workspace**, so it
survives the chat, the context window and the agent. A later session, or the
user alone, must be able to revert from the journal without the conversation.

## Layout

```text
<workspace>/
  journal/
    CHANGES.md                 # append-only, newest run at the bottom
  backups/
    2026-10-11-01/             # one folder per run
      01-run.reg
      02-settings.json
      services-before.csv
```

- Run id: `YYYY-MM-DD-NN`, NN counting runs that day.
- Change id: `<run id>/<NN>`, e.g. `2026-10-11-01/03`.
- `CHANGES.md` is **append-only**. A revert is a new entry that references
  the change it undoes; never edit or delete an old entry. Correcting a
  mistake in an entry is also a new note.
- Backups are referenced by relative path, so the workspace can move.
- The journal contains no secrets: if a captured value is a token, licence key
  or password, record `<redacted, held in backup file>` and keep it only in the
  backup file (and tell the user it is there).

## Run header

```markdown
## Run 2026-10-11-01 — reduce boot time

- Requested by: user, in chat, 2026-10-11 09:40
- Machine: DESKTOP-EXAMPLE, Windows 11 Pro 24H2 build 26100
- Elevated: yes (user-started admin terminal)
- Restore point: #57 "ccmaf run 2026-10-11-01" created 09:52 (verified)
- Plan approved: 09:50, changes 1–4; change 5 declined by user
```

If there is no restore point, say why and what the user chose:
`Restore point: none — 24 h limit; reusing #56 created 2026-10-11 07:10, before this run (user agreed)`.

## Change entry

```markdown
### 2026-10-11-01/02 — Set ExampleSvc start type to Manual

- Tier: Medium
- Why: user asked to speed up boot; service starts at boot but is only used
  by the Example app (verified: dependants = none, `sc.exe enumdepend ExampleSvc`)
- Target: service `ExampleSvc`
- Before: START_TYPE = AUTO_START (DELAYED); state Running
- After: START_TYPE = DEMAND_START; state Running (not stopped this run)
- Backup: backups/2026-10-11-01/services-before.csv
- Command: `sc.exe config ExampleSvc start= demand`
- Undo: `sc.exe config ExampleSvc start= delayed-auto`
- Verify: `sc.exe qc ExampleSvc` shows DEMAND_START — PASS (09:58)
- Status: verified
- Confirmed by user: 09:57
```

Required fields, every time: **Why, Target, Before, After, Backup, Undo,
Verify, Status**. If a field does not apply, write `n/a` and the reason.

### Status values

| Status | Meaning |
|---|---|
| `planned` | In the approved plan, not yet applied (for unattended runs: a proposal) |
| `applied-unverified` | Applied; verification pending (e.g. needs reboot) |
| `verified` | Applied and verification passed |
| `failed` | Command failed or verification failed; see note; machine state stated |
| `reverted` | Undone by a later entry (name it) |
| `declined` | User said no; kept so nobody re-proposes it blindly |

A `failed` entry must state the machine's state as observed *after* the
failure ("value unchanged", "partially written: key created, value missing").

## Revert entry

```markdown
### 2026-10-12-01/01 — Revert 2026-10-11-01/02 (ExampleSvc start type)

- Why: user reports Example app slow to open
- Command: `sc.exe config ExampleSvc start= delayed-auto`
- Verify: `sc.exe qc ExampleSvc` shows AUTO_START (DELAYED) — PASS
- Status: verified
```

Do not go back and annotate the original entry (the file is append-only); the
revert entry's title carries the link, and the run summary lists it.

## Run summary

Written at the end of every run, including aborted ones:

```markdown
#### Summary 2026-10-11-01
- Verified: 01, 02, 03
- Applied, awaiting reboot: 04
- Failed: none
- Declined: 05 (disable search indexing)
- To revert everything: apply the Undo lines of 04, 03, 02, 01 in that order,
  or System Restore to point #57 (affects all system changes since 09:52).
- Next: reboot, then verify 04 (`Get-CimInstance Win32_StartupCommand`).
```

Revert order is always the reverse of apply order.

## Tell the user where it is

End every run by telling the user the journal path and the one-line "to undo
everything" instruction. A journal nobody knows about is not a revert path.
