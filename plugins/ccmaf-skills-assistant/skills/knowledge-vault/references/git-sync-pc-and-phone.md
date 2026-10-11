# Git sync between a PC and a phone

Git gives free sync plus full history: every version of every note, and a
way back from any mistake. The cost is that it is not automatic, and phone
git clients are weaker than desktop git. This file covers the set-up, the
phone options, and when to choose something else.

## Choose the mechanism first

| Option | Cost | PC | Android | iPhone | History | Notes |
|---|---|---|---|---|---|---|
| Git (private remote) | Free | Excellent | Workable (see below) | Workable with a git client app | Full | Manual or timed commits; conflicts possible |
| Syncthing | Free | Good | Syncthing-Fork (the official Android app was discontinued at the end of 2024) | No official client; third-party apps exist (verify current state) | Optional versioning folder | Device-to-device, at least one device must be on |
| Obsidian Sync | Paid, optional | Good | Good | Good | Version history included | Simplest on iPhone; end-to-end encryption option (verify plan details) |
| iCloud Drive | Free tier | macOS only; not recommended on Windows | No | Good | Limited | Obsidian's help warns iCloud on Windows can duplicate or corrupt files |
| OneDrive / Google Drive | Free tier | Good (files must be kept offline) | Needs a third-party sync app | Not supported | Limited | Avoid Files On-Demand for the vault |

Rule: **one mechanism per vault.** If the user picks git, the vault must not
also sit in a OneDrive, Dropbox or iCloud folder, and Syncthing must not
watch it. If they later switch, stop the old one first.

For an iPhone user who wants no fiddling, recommend Obsidian Sync (paid) or
iCloud (Apple-only) honestly, and offer git as the free, more hands-on
choice.

## The remote

- A **private** repository on a hosted service (GitHub, GitLab, Codeberg,
  a self-hosted Gitea or Forgejo). Private still means "stored by a third
  party": check `personal-data-care` before deciding what lives there.
- One remote, one branch (`main`). No feature branches in a personal vault.
- Authentication: SSH keys on the PC; on phones, an HTTPS personal access
  token scoped to that one repository with the minimum permission
  (contents read/write) and an expiry date. Store the token only in the
  app's credential store, never in a note.

## PC set-up

```bash
cd ~/vault                      # or the existing vault folder
git init -b main
# add .gitignore and .gitattributes from vault-structure.md first
git add .gitignore .gitattributes
git commit -m "vault: ignore rules and line endings"
git add .
git status                      # review: no workspace.json, no secrets
git commit -m "vault: initial import"
git remote add origin <your-private-repo-url>
git push -u origin main
```

Recommended local settings for a vault:

```bash
git config pull.rebase false        # merge on pull: simplest to reason about with conflicts
git config merge.conflictstyle zdiff3   # shows the common ancestor in conflicts (git 2.35+; use diff3 on older git)
git config core.quotepath false     # readable non-ASCII file names in git output
```

Rebase-on-pull (`pull.rebase true`) gives a tidier history, but a conflict
in the middle of a rebase is harder for a non-developer to finish. Keep
merge unless the user prefers otherwise.

Before the first push, scan for secrets (`personal-data-care`,
`references/scanning-tools.md`). Something pushed once is in the remote's
history even after you delete the file.

### Committing from inside Obsidian (desktop)

The community "Git" plugin (by Vinzent03) can commit, pull and push on a
timer and pull on start-up. It needs Restricted mode turned off, which
lets community plugins run with full access: a deliberate choice. Suggested
settings (names may differ by version, verify):

- Auto commit-and-sync interval: 10 to 30 minutes, not every minute.
- Pull on start-up: on.
- Commit message including the device name, e.g. `vault: desktop {{date}}`
  (check the plugin's placeholder syntax), so history shows which device
  wrote what.

Without the plugin, a two-line script on a schedule works (Task Scheduler
or cron; follow `scheduled-run-discipline`). It must stop on conflict
rather than push through it:

```bash
cd ~/vault && git add -A && { git diff --cached --quiet || git commit -m "vault: $(hostname) $(date +%F_%H%M)"; } \
  && git pull --no-rebase --no-edit && git push
```

`git pull` exits non-zero on a conflict, so `git push` never runs and the
conflict waits for a person.

## Android

Options, most robust first (verify each before recommending; apps change):

1. **Obsidian Git plugin on mobile.** Uses a JavaScript re-implementation
   of git. Its README calls mobile support very unstable, with no SSH
   authentication, limited repository size because of memory, and no
   rebase. Fine for a small text-only vault; risky for a large one.
2. **A separate git client app** that syncs the vault folder (for example
   GitSync, which advertises scheduled sync and conflict handling; verify
   current features and pricing). Obsidian then just edits files.
3. **Termux** with real `git`, scripted pull/push. Most capable, most
   technical; storage permissions are needed for the vault folder.

Keep the phone's vault small: text in git, large attachments elsewhere.

## iPhone and iPad

iOS apps cannot freely share folders, so the vault must live where both
Obsidian and the git client can reach it.

1. **Working Copy** (iOS git client). Clone the repository, link it to an
   empty Obsidian vault folder, then commit and push from Working Copy.
   Obsidian's help notes some features need a paid in-app purchase (verify
   which: pushing has been one of them).
2. **GitSync** on iOS advertises HTTPS, SSH and OAuth authentication and
   scheduled sync (verify).
3. **Obsidian Git plugin** on mobile: same limits as on Android.

If none of these suit, Obsidian Sync (paid) or iCloud are the supported
iPhone routes; say so plainly.

## The habit that prevents most conflicts

| Moment | PC | Phone |
|---|---|---|
| Before editing | Pull (or the plugin pulls on start-up) | Open the git app, pull, then open Obsidian |
| After a session | Commit and push | Commit and push before locking the phone |
| Daily note | Edit on one device at a time; if both, add under different headings | Same |

Teach the user the one-line rule: **pull when you open, push when you
close.** Timed auto-sync helps but does not replace it.

## Verify the set-up

- [ ] Edit a test note on the PC, push; pull on the phone and see it.
- [ ] Edit on the phone, push; pull on the PC and see it.
- [ ] Edit the same line on both without syncing, then sync both: a
      conflict appears and nothing is lost (practise the procedure in
      `conflict-handling.md` once, on a test note).
- [ ] `git log --oneline -3` on the PC shows commits from both devices.
- [ ] The vault folder is not inside OneDrive, Dropbox or iCloud, and no
      Syncthing folder covers it.
