# Worktrees, Monorepos, Submodules and LFS

## Worktrees — parallel checkouts of one repository

`git worktree` gives extra working directories sharing one object
store: no re-clone, no stash juggling, instant branch isolation.

```bash
git worktree add ../repo-hotfix hotfix/urgent    # existing branch
git worktree add -b review/pr-42 ../repo-pr42 origin/pr-42
git worktree list
git worktree remove ../repo-hotfix
git worktree prune                               # clean up deleted dirs
```

Rules: a branch can be checked out in only **one** worktree at a time;
each worktree has its own index/HEAD but shares refs, stash and config.
This is the right tool whenever two tasks proceed in parallel — an
urgent fix mid-feature, comparing behaviour across branches, or
multiple agents working the same repo without trampling each other's
working tree (one worktree per agent/task).

## Large repos and monorepos — clone less, compute less

Three independent levers; combine as needed:

```bash
# 1. Partial clone: all commits/trees, blobs fetched on demand
git clone --filter=blob:none "$REPO_URL" # widely supported by major hosts
                                         # (as of 2026-07 — re-verify yours)

# 2. Sparse checkout: materialise only the directories you work on
git sparse-checkout set services/billing shared/lib   # cone mode is the
git sparse-checkout list                               # default since 2.37

# 3. Shallow clone: history truncated — CI-only
git clone --depth 1 "$REPO_URL"
```

Shallow clones are for disposable CI jobs only: bisect, blame,
`merge-base` and `describe` need history (`git fetch --unshallow` to
repair). Prefer partial clone over shallow when both would do — full
history, lazily fetched content.

Background performance maintenance for any long-lived big clone:

```bash
git maintenance start        # (2.30+) schedules commit-graph updates,
                             # prefetch and incremental gc
```

`scalar clone <url>` (bundled with git since 2.38) applies the
partial-clone + sparse + maintenance + FSMonitor bundle in one command
— the sane default for very large repos. On enormous working trees,
`core.fsmonitor true` (built-in on Windows/macOS, 2.37+) makes
`git status` stop scanning everything.

## Submodules — a pointer, not a copy

A submodule is a **gitlink**: the superproject commits only a SHA
pointer plus a `.gitmodules` entry. Everything painful about submodules
follows from that:

```bash
git clone --recurse-submodules "$REPO_URL"    # or after the fact:
git submodule update --init --recursive
git config submodule.recurse true             # checkout/pull update them too
git push --recurse-submodules=check           # refuse to publish a pointer
                                              # to an unpushed submodule commit
```

Realities to design around: submodules check out **detached** at the
pinned SHA (committing inside one starts on no branch); `git status` in
the superproject shows submodule drift as a one-line modification that
is easy to commit accidentally; updating means committing a new pointer
in the superproject — a two-repo dance per change. Use submodules for
genuinely independent components pinned by SHA. If the component
changes in lockstep with the parent, prefer a package registry
dependency, `git subtree`, or simply the monorepo layout above.

## Git LFS — large binaries without a bloated history

LFS stores blobs outside the object database, committing text pointers
instead. **Track before adding** — tracking rules never rewrite the
past:

```bash
git lfs install                          # once per machine
git lfs track "*.psd" "assets/**/*.mp4"  # writes .gitattributes; commit it
git add .gitattributes file.psd && git commit
```

Retrofitting a repo whose binaries are already committed is a history
rewrite — coordinate like any other (rebase-and-history.md):

```bash
git lfs migrate import --include="*.psd" --everything
```

Operational realities: clones need LFS installed or they get pointer
files (CI images often lack it — `git lfs fetch`/`checkout` explicitly,
or your CI's LFS option); hosts meter LFS storage and bandwidth with
host-specific quotas and pricing (check your host's current terms —
statement dated 2026-07); LFS objects don't follow normal clones to a
new host without `git lfs push --all`.

## Boundaries

Monorepo *build* orchestration (affected-target detection, caching) is
CI territory → devops-development. Worktree-based parallel agent
orchestration patterns → llm-development (agent-harness). History
rewrites for size (removing committed binaries) →
recovery-and-disasters.md.
