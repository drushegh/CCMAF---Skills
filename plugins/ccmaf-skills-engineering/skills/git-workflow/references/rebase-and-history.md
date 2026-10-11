# Rebase and History Surgery

History rewriting is routine *before* sharing and exceptional after.
The golden rule, restated precisely: a commit is rewritable until
someone else may have based work on it — pushed to a personal branch
nobody tracks is grey area; pushed to a reviewed PR branch is "warn
reviewers"; merged to an integration branch is never.

## The safety ritual (before ANY rewrite)

```bash
git branch backup/pre-rebase          # cheap insurance, delete later
git rebase -i main                    # ... the surgery ...
git range-diff backup/pre-rebase...HEAD   # prove content survived (2.19+)
git branch -D backup/pre-rebase       # only once satisfied
```

Even without a backup ref, `git reflog` and `ORIG_HEAD` (set by rebase,
merge and reset) can restore the pre-rewrite state — see
recovery-and-disasters.md.

## Interactive rebase — the verbs

`git rebase -i <base>` opens the todo list, oldest first:

| Verb | Effect |
|---|---|
| `pick` | Keep as-is |
| `reword` | Keep the change, edit the message |
| `edit` | Stop at this commit to amend or split it |
| `squash` | Fold into the previous commit, merge the messages |
| `fixup` | Fold into the previous commit, discard this message (`fixup -C` keeps this one instead) |
| `drop` | Delete the commit (so does deleting the line) |
| `exec <cmd>` | Run a command between commits — `exec make test` verifies every commit still passes |
| `break` | Pause here for manual inspection |

## The autosquash workflow

Commit corrections *as you work*, curate once at the end:

```bash
git commit --fixup=abc1234        # "this amends abc1234"
git commit --fixup=reword:abc1234 # message-only fix (2.32+)
# ...more work, more fixups...
git rebase -i --autosquash main   # todo list arrives pre-ordered
```

Set `rebase.autoSquash true` to make every interactive rebase honour
`fixup!`/`squash!` markers automatically.

## Splitting a commit

```bash
git rebase -i main                # mark the target commit "edit"
git reset HEAD^                   # undo the commit, keep the work
git add -p && git commit          # first logical piece
git add -p && git commit          # second...
git rebase --continue
```

## Moving work with `--onto`

`git rebase --onto <newbase> <upstream> [<branch>]` transplants the
commits in `<upstream>..<branch>` onto `<newbase>`. The two everyday
uses:

```bash
# Branched off feature-A by mistake; should sit on main:
git rebase --onto main feature-A my-branch

# Drop commits: keep only the last 3, replaying them onto main:
git rebase --onto main HEAD~3
```

## Stacked branches

A chain `main ← part-1 ← part-2 ← part-3` historically meant rebasing
each branch by hand after any change below it. Since 2.38,
`git rebase -i --update-refs main` (from the top of the stack) moves
every branch ref in the chain in one operation. Set
`rebase.updateRefs true` if stacking is your normal mode. After the
rewrite, each stacked branch needs its own force-with-lease push.

## Force-pushing rewritten branches

```bash
git fetch origin
git push --force-with-lease --force-if-includes   # (--force-if-includes 2.30+)
```

`--force-with-lease` refuses if the remote moved past what your
remote-tracking ref saw; `--force-if-includes` additionally refuses if
you fetched but never integrated those commits. Neither protects
*other people's clones* — that's what coordination is for.

## When a shared branch WAS rewritten (coordinated or otherwise)

Everyone else with local work on the old history recovers with:

```bash
git fetch origin
git rebase --onto origin/branch <old-origin-sha> my-local-work
# or, if their local branch simply tracked it with no extra commits:
git reset --hard origin/branch
```

`git pull` here is the classic mistake — it merges the old and new
histories, resurrecting every rewritten commit. `pull.rebase true`
plus `rebase.autoStash true` makes even this case degrade gracefully.

## Boundaries

Merge-conflict handling during a rebase → conflicts-and-merges.md
(rerere is especially valuable in long rebases). Recovery from a
botched rebase → recovery-and-disasters.md.
