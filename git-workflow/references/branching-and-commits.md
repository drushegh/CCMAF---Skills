# Branching and Commits

## Choosing a branching model

Match the repo's existing model before proposing a new one. When
starting fresh, default to the simplest model the release cadence
allows:

| Model | Shape | Right when |
|---|---|---|
| Trunk-based | Tiny short-lived branches (or direct commits) into `main`; feature flags hide unfinished work | Continuous deployment, strong CI, small increments |
| Feature-branch flow (GitHub flow) | Branch per change → PR → merge to `main`; `main` always deployable | The default for most teams and for agent work |
| Release branches | `main` plus `release/x.y` maintained in parallel; fixes land on `main` and are cherry-picked back | Supporting multiple shipped versions |
| git-flow | `develop` + `main` + release/hotfix ceremony | Rarely justified today — scheduled, versioned releases with long stabilisation; don't introduce it into a repo that doesn't have it |

Branch hygiene, whatever the model: branches are **short-lived** (days,
not weeks — long-lived branches are conflict factories), named
`type/topic` (`feature/invoice-export`, `fix/null-customer`), deleted
after merge, and pruned locally (`git fetch --prune`, or set
`fetch.prune true`).

## Atomic commits

One logical change per commit: it compiles, its tests pass, and it can
be reverted or cherry-picked without dragging unrelated work along.
Mixed working trees are normal — *commits* built from them shouldn't
be:

```bash
git add -p                 # stage hunk by hunk; y/n/s(plit)/e(dit)
git diff --staged          # review exactly what the commit will contain
git commit                 # never `git commit -am` on a mixed tree
```

"Fix bug + reformat file + drive-by rename" is three commits. The
payoff is downstream: reviewable diffs, a bisect that lands on a small
commit, clean reverts and honest blame.

## Commit messages

```text
Subject: imperative, ≤50 chars, capitalised, no trailing full stop

Body (wrapped ~72): what was wrong, why this change is the right fix,
and any non-obvious consequence. The diff already shows *what* changed
— the body records *why*. Reference issues/tasks per repo convention.

Trailers when applicable:
Co-authored-by: Name <email>
```

Test: the subject completes "If applied, this commit will …". If you
need "and" in the subject, the commit probably isn't atomic.

**Conventional Commits** (`feat:`, `fix:`, `chore:` … with `!` or a
`BREAKING CHANGE:` footer) is worth adopting when tooling consumes it —
changelog generation, semantic-release version bumps. Follow it where
the log shows it's in use; don't half-adopt it. Some projects (CCMAF
included) additionally require a task/bug ID in every subject — repo
convention always wins.

## Integration style — how features land

Pick one per repo and stay consistent; each trades away something:

| Style | History you get | Trade-off |
|---|---|---|
| Squash-merge | One commit per PR on `main` | Simplest mainline; intra-PR commits are lost, so big PRs become opaque blobs — keep PRs small |
| Rebase and fast-forward | Every curated commit lands linearly | Best for bisect/blame; demands genuinely atomic commits and pre-merge curation |
| `merge --no-ff` | Feature bubbles with explicit boundaries | Preserves everything; graph gets noisy, bisect crosses merge commits |

Squash-merge plus small PRs is the pragmatic default for agent-driven
work: the PR becomes the atomic unit and mainline stays linear.

## Keeping a branch current

Refresh from `main` early and often — integrating two days of drift is
easy, two weeks is archaeology:

```bash
git fetch origin
git rebase origin/main        # unshared branch: preferred
# or: git merge origin/main   # shared branch: safe for everyone
```

For chains of dependent branches (stacked work), see the
`--update-refs` workflow in rebase-and-history.md.

## Boundaries

Branch *protection* (required checks, review counts) is host/CI
configuration → devops-development. PR description and review craft →
code-review-development.
