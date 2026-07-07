---
name: git-workflow
description: >-
  Version-control discipline with git — the workflow layer beneath any
  CI/CD: branching models and commit hygiene, rebase vs merge decisions,
  interactive history surgery (squash, fixup, split, reorder), conflict
  resolution, bisect and history archaeology, worktrees for parallel
  work, large-repo and monorepo tooling (sparse-checkout, partial clone,
  submodules, LFS), hooks and git automation, and disaster recovery
  (reflog, detached HEAD, botched rebases, force-push repair, committed
  secrets). Use whenever git is used beyond a trivial add/commit —
  "rebase or merge" decisions, squashing or splitting commits, resolving
  conflicts, finding which commit broke something, recovering lost work,
  undoing commits, submodule or LFS trouble, slow clones on big repos,
  or ANY history rewrite. Triggers include: git commands in any shell,
  .gitmodules, .gitattributes, .git/hooks, merge-conflict markers, "I
  lost my changes", "committed to the wrong branch", "detached HEAD",
  force-push questions.
---

# Git Workflow

Version-control discipline for agents and teams: git itself, plus the
workflow habits that keep history useful, reviewable and recoverable.
This skill owns everything from branch creation to the push; the CI/CD
that runs after the push (pipeline YAML, branch protection,
environments) belongs to devops-development. Shell blocks in this skill
parse under `bash -n`; git behaviour claims were cross-checked against
git's own documentation, with the minimum git version noted inline for
newer features. No parser exists that can validate a git *invocation's
semantics* — treat command blocks as reviewed, not machine-proven.

## Non-negotiables

1. **Never rewrite history others may have built on.** Amend, rebase
   and squash freely on your own unpushed branches; once a branch is
   shared, its history is an interface — rewrite it only with explicit
   coordination and a recovery plan
   ([references/rebase-and-history.md](references/rebase-and-history.md)).
2. **Force-push safely or not at all.** `git push --force-with-lease
   --force-if-includes` (2.30+), onto branches you own, after a fresh
   fetch. Bare `--force` is how a colleague's afternoon disappears.
   Never force-push a shared integration branch.
3. **Committed work is recoverable — behave accordingly.** Before
   re-doing "lost" work, check `git reflog`: commits stay reachable for
   ~90 days by default. The inverse holds too: anything *pushed* is
   effectively permanent — a committed secret is a credential-rotation
   incident first and a history rewrite second
   ([references/recovery-and-disasters.md](references/recovery-and-disasters.md)).
4. **Commits are atomic and intention-revealing.** One logical change
   per commit, staged with `git add -p`, imperative subject ≤50 chars,
   body explaining *why*
   ([references/branching-and-commits.md](references/branching-and-commits.md)).
5. **Preview destructive operations.** `git clean -n` before
   `git clean -f`; `git push --dry-run` before an unusual push; every
   history rewrite happens behind a backup ref
   (`git branch backup/pre-rebase`) that you delete only afterwards.
6. **Make `pull` deliberate.** Set `pull.rebase true`, or `false` on
   purpose. Accidental merge bubbles and accidental rebases are both
   workflow bugs — the defect is *accidental*.

## Rebase vs merge

| Situation | Do this |
|---|---|
| Refresh your unshared feature branch from main | `git rebase main` — linear history, no bubble |
| Refresh a branch others also push to | Merge main into it, or agree a rebase window first |
| Land a finished feature | Match the repo's convention: squash-merge (one commit per change), rebase-and-fast-forward (curated commits kept), or `merge --no-ff` (explicit feature boundary) |
| Long-running release/support branches | Merge only — their history is shared by definition |
| Undo something already pushed | `git revert` — never rewrite |

## The undo table

| To undo... | Run |
|---|---|
| Unstaged edits to one file | `git restore <file>` (2.23+) |
| Staging, keeping the edits | `git restore --staged <file>` |
| Last commit's message or content (unpushed) | `git commit --amend` |
| Last commit, keeping changes staged | `git reset --soft HEAD~1` |
| A pushed commit | `git revert <sha>` |
| A pushed merge commit | `git revert -m 1 <merge-sha>` — and read up before re-merging that branch |
| An in-progress rebase/merge gone wrong | `git rebase --abort` / `git merge --abort` |
| A completed rewrite gone wrong | `git reflog` → `git reset --hard <pre-rewrite-sha>` |
| All local changes, deliberately | `git stash -u` first if in any doubt — `reset --hard` destroys tracked edits with no reflog entry |

## High-frequency pitfalls

- **`checkout` does three unrelated jobs** — prefer `git switch`
  (branches) and `git restore` (files), both 2.23+, so scripts and
  instructions stay unambiguous.
- **Detached-HEAD commits** aren't lost, just unanchored — `git switch
  -c rescue` before moving away, or recover via reflog.
- **`reset --hard` and `clean -f` are the two real foot-guns**: the
  first silently destroys uncommitted tracked edits, the second
  untracked files, and neither leaves anything in the reflog.
- **Submodule pointer drift** — a superproject commit referencing an
  unpushed submodule commit breaks every other clone; push the
  submodule first (`push.recurseSubmodules=check` catches it).
- **CRLF churn** — line endings belong to the repo (`.gitattributes`
  with `* text=auto` plus explicit `eol=` rules), never to each
  machine's `core.autocrlf`; fix drift with `git add --renormalize .`
- **Shallow clones (`--depth 1`) break archaeology** — bisect, blame,
  `merge-base` and `describe` all misbehave; CI that needs history must
  `git fetch --unshallow` first.
- **LFS tracking added late changes nothing retroactively** — rules in
  `.gitattributes` affect only new adds; already-committed binaries
  need `git lfs migrate` (a history rewrite).
- **"Fixing" a rejected push of rewritten history with `git pull`**
  merges old and new histories and resurrects everything you rewrote —
  stop and re-read the rewrite plan instead.

## Agent workflow

1. **Orient before acting**: `git status`, `git branch --show-current`,
   `git log --oneline -n 5` — never operate on an assumed state, and
   check for an in-progress operation (`.git/rebase-merge/`,
   `MERGE_HEAD`) before starting a new one.
2. **Branch before building** — never commit straight to the default
   branch unless the repo's convention is explicitly trunk-based.
3. **Commit small while working; curate before handoff** — `git commit
   --fixup=<sha>` during the work, one `git rebase -i --autosquash`
   before review, on your own branch only.
4. **Every rewrite starts with a backup ref** and ends with proof:
   `git range-diff backup/pre-rebase...HEAD` (2.19+) or a plain `git
   diff backup/pre-rebase` to show content survived the surgery.
5. **Conflicts get understood, not picked** — read both sides' intent,
   resolve, then build and test: a textually clean merge is not a
   correct merge
   ([references/conflicts-and-merges.md](references/conflicts-and-merges.md)).
6. **Regressions get bisected, not eyeballed** — automate the predicate
   with `git bisect run`
   ([references/bisect-and-archaeology.md](references/bisect-and-archaeology.md)).
7. **Parallel tasks get worktrees** — one branch per worktree — not
   stash juggling or a second clone
   ([references/worktrees-monorepos-submodules.md](references/worktrees-monorepos-submodules.md)).
8. **The moment anything looks lost or mangled: stop mutating.** No
   further resets, pulls or checkouts until you have read
   [references/recovery-and-disasters.md](references/recovery-and-disasters.md).

## Reference index

| Load when the task involves... | File |
|---|---|
| Branching models, commit hygiene, messages, integration styles | [references/branching-and-commits.md](references/branching-and-commits.md) |
| Rebase vs merge depth, interactive rebase, squash/split/reorder, stacked branches, force-push rules | [references/rebase-and-history.md](references/rebase-and-history.md) |
| Merge conflicts, rerere, strategy options, lockfile/binary conflicts | [references/conflicts-and-merges.md](references/conflicts-and-merges.md) |
| Finding the breaking commit; who/when/why archaeology | [references/bisect-and-archaeology.md](references/bisect-and-archaeology.md) |
| Lost commits, reflog, detached HEAD, botched rebases, committed secrets | [references/recovery-and-disasters.md](references/recovery-and-disasters.md) |
| Worktrees, monorepo scale (sparse checkout, partial clone), submodules, LFS | [references/worktrees-monorepos-submodules.md](references/worktrees-monorepos-submodules.md) |
| Hooks and hook managers, scripting git, recommended config, line endings | [references/hooks-and-automation.md](references/hooks-and-automation.md) |

## Boundaries with sibling skills

- **CI/CD above the push** — pipeline/workflow YAML, branch protection
  and required checks, environments, deployment → `devops-development`.
- **What the change contains** — reviewing the diff/PR →
  `code-review-development`; turning a finished diff into a reviewer
  recap → `visual-recap`.
- **Hook script quality** — strict mode, quoting, portability of the
  shell inside hooks → `bash-development`.
- **The debugging method around bisect** — reproduce/isolate/
  hypothesise discipline → `systematic-debugging`; this skill owns the
  git mechanics it leans on.
- **Committed-secret blast radius** — rotation, secret scanning, supply
  chain → `secure-development`.
- **Large refactors and migrations** that produce the sweeping diffs →
  `legacy-modernisation`.
