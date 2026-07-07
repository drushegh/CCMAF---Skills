# Recovery and Disasters

## First response — before anything else

1. **Stop running mutating commands.** Every additional reset, pull or
   checkout narrows the recovery options.
2. **Anchor what still exists**: `git branch rescue-$(date +%s)` on the
   current HEAD costs nothing and can't hurt.
3. Diagnose from `git reflog`, `git status` and `git log --oneline
   --all --graph` before choosing a fix.

The recurring theme: **committed work is almost always recoverable;
uncommitted work usually isn't.** Which is the strongest argument for
committing early and curating later (rebase-and-history.md).

## reflog — the safety net

`git reflog` records every position HEAD has held (default retention:
90 days; 30 for entries no longer reachable). Per-branch reflogs exist
too: `git reflog show mybranch`.

```bash
git reflog                       # e.g. HEAD@{2}: rebase (start): ...
git reset --hard HEAD@{5}        # put the branch back where it was
git branch restored HEAD@{5}     # ...or anchor it non-destructively first
```

`ORIG_HEAD` is set by rebase, merge and reset to the pre-operation
position — `git reset --hard ORIG_HEAD` undoes the most recent such
operation without reflog spelunking.

## Scenario playbook

| Disaster | Recovery |
|---|---|
| Botched rebase (finished) | `git reflog` → find `rebase (start)` → `git reset --hard <sha-before-it>` (or `ORIG_HEAD` immediately after) |
| Botched rebase (in progress) | `git rebase --abort` — clean return to the start |
| Committed on detached HEAD, then switched away | `git reflog` → find the commit → `git branch rescue <sha>` |
| Deleted a branch with unmerged work | `git reflog` (deletion prints the tip sha too) → `git branch name <sha>` |
| `reset --hard`, lost commits | Commits: reflog as above. Uncommitted tracked edits: gone — no reflog entry exists for the working tree |
| Committed to the wrong branch | `git switch correct-branch && git cherry-pick <sha>` then remove from the wrong branch: `git switch wrong && git reset --hard HEAD~1` |
| Someone force-pushed over your remote work | Your last fetch still has it: `git reflog show origin/branch` → re-push or rebase from that sha |
| Dropped/lost a stash | `git fsck --unreachable \| grep commit` → inspect candidates with `git show` — stashes are commits |
| Nothing reachable anywhere | `git fsck --lost-found` writes dangling commits to `.git/lost-found/` for inspection |

What genuinely is unrecoverable from git alone: never-staged edits,
deleted untracked files (`clean -f`), and anything past reflog/gc
expiry. Check editor local-history and OS file-recovery before
conceding.

## Committed secrets — an incident, not a git task

Order matters:

1. **Rotate the credential immediately.** Once pushed, assume harvested
   — public-repo scanners find keys in seconds, and forks/clones/host
   caches outlive your rewrite. Rotation is the fix; the rewrite is
   hygiene.
2. Rewrite history with **git-filter-repo** — the tool git's own
   documentation recommends over the deprecated `git filter-branch`
   (BFG Repo-Cleaner is the older alternative; status as of 2026-07 —
   re-verify):

```bash
# operate on a FRESH clone; filter-repo insists, correctly
git clone --mirror "$REPO_URL" repo-rewrite && cd repo-rewrite
git filter-repo --invert-paths --path config/secrets.env
git filter-repo --replace-text expressions.txt   # or redact strings in place
git push --force --mirror "$REPO_URL"
```

3. Coordinate: every collaborator re-clones (or rebases per
   rebase-and-history.md); host-side PR/cache copies may need a support
   request to purge; re-run secret scanning to confirm.
4. Prevent recurrence: secret-scanning hooks and push protection
   (hooks-and-automation.md; depth → secure-development).

The same filter-repo procedure removes accidentally committed large
files — same coordination cost, so batch such rewrites.

## After any recovery

Verify before resuming work: `git log --oneline --graph -20` matches
expectations, `git status` clean, the build passes, and — if the
disaster involved a remote — `git fetch` then compare
`git log origin/branch..branch` so you know exactly what a push will do.

## Boundaries

Rewrite mechanics and force-push safety → rebase-and-history.md.
Credential rotation runbooks, scanner choice, blast-radius analysis →
secure-development.
