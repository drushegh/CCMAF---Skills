# Local-only data, encryption and exposure

"Where does this end up?" has more answers than users expect. Map them
before storing anything sensitive.

## The exposure map

For any file the assistant writes, list every place a copy exists:

| Copy | Present when | Who can read it |
|---|---|---|
| The PC's disk | Always | Anyone with the user's login, or the disk if unencrypted |
| The phone | Vault synced to phone | Anyone with the unlocked phone; phone backups |
| The git remote | Committed and pushed | The host, anyone with repo access, forks, every clone |
| Sync service (Obsidian Sync, Syncthing peers, cloud drive) | That service is used | The service (unless end-to-end encrypted), every peer device |
| Backups (File History, Time Machine, cloud backup, phone backup) | Backups cover the folder | The backup provider, anyone with backup access |
| Model provider | The assistant reads the file | Processed under the user's account terms and data settings (the user should check their own settings, e.g. whether conversations may be used for training) |
| Community plugins | Restricted mode off | Any installed plugin: full file and network access |
| Logs and journals | The assistant wrote about it | Same as the vault |

If the user is not comfortable with every row, the data does not belong in
the vault.

## Local-only: the pattern

Keep a folder outside the vault, on the PC only, for things the user wants
kept but not synced:

```text
C:\Users\<user>\private\        # not inside the vault, not in OneDrive
  health\
  identity-scans\
  README.md                     # what is here, that it is not synced, how it is backed up
```

Rules:

- Not inside any synced folder (check: OneDrive "Known Folder Move" can
  silently sync Documents, Desktop and Pictures on Windows; verify the
  user's setup before choosing a location under them).
- On an encrypted disk (below).
- Backed up deliberately, to an encrypted backup, or the user accepts that
  losing the PC loses the data.
- The vault may link to it by description ("scan of passport: in the
  private folder on the PC"), never by copying.
- The assistant reads it only when the user asks for something in it.

## Encryption at rest

| Need | Free option | Notes |
|---|---|---|
| Whole PC disk (Windows) | BitLocker (Pro, Enterprise, Education) or Device Encryption (many Home devices) | Check status with `manage-bde -status` (elevated) or Settings, Privacy and security, Device encryption. Recovery key: account or printed, never in the vault. Machine-level detail: `windows-security-hygiene` |
| Whole disk (Linux, macOS) | LUKS; FileVault | Usually chosen at install |
| Phone | On by default on current Android and iOS with a screen lock | A strong screen lock is the actual protection |
| An encrypted folder that syncs | Cryptomator (desktop free; mobile apps need a paid licence for writing, verify current pricing) | Encrypts per file, works over git or cloud drives, but encrypted files make git diffs and merges useless |
| An encrypted container | VeraCrypt | One big file; poor fit for git or sync |
| Encrypted files inside a git repo | `git-crypt` or `age`-encrypted files | Technical; key management is on the user; mobile clients cannot decrypt (verify per app) |
| Secure notes | Password manager secure notes (Bitwarden, KeePassXC) | Best place for small sensitive records |
| End-to-end encrypted sync | Obsidian Sync with end-to-end encryption (paid, optional; verify plan) | Encrypted on the service, readable on devices |

Rule of thumb: sensitive *records* go to a password manager or a
local-only encrypted folder; encrypting a whole synced vault trades away
search, links, diffs and conflict resolution, which is usually a bad deal.

## Phones

- A phone that holds the vault holds everything in it. If the vault
  includes anything sensitive, a strong screen lock is mandatory and the
  user should know how to wipe the phone remotely.
- Phone backups (Google, iCloud) may include app folders; check whether
  the vault folder is in scope before calling anything "local".

## Retention: storing less over time

- Inbox captures and run logs are working material. Agree a retention
  period (for example, run logs older than 90 days archived or removed with
  the user's approval) and record it in the workspace README.
- Daily notes are the user's diary; never prune them without being asked.
- When a project ends, review its notes for personal data no longer needed
  (other people's phone numbers, booking references, scans) and propose
  removing it as part of archiving.
- Scheduled clean-ups only *propose* deletions (`scheduled-run-discipline`).

## What the assistant itself writes

- Run logs and summaries mention data by type: "processed 3 bank emails",
  not the amounts and account numbers.
- Journal entries record `<redacted>` for sensitive before/after values
  (the convention in `safe-system-changes`).
- Error messages and tool output pasted into logs can contain tokens or
  personal data; scrub before saving.
- Temporary files with personal data go to the session scratch area and
  are removed at the end of the task; never leave extracts in the vault.
