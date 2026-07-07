# Conflicts and Merges

A conflict is git saying "two intents touched the same lines — a human
(or agent) must combine the *intents*". Resolving it is a semantic
task; the markers are just where to start.

## Read the conflict properly

Set the three-way conflict style once, globally:

```bash
git config --global merge.conflictstyle zdiff3   # (2.35+; diff3 on older git)
```

`zdiff3` adds the merged base between the two sides, so you can see
what the line looked like *before either change* — half of all
mis-resolutions come from guessing that:

```text
<<<<<<< HEAD
their meaning of the line on your side
||||||| merged common ancestor
what it said before anyone touched it
=======
the incoming side's version
>>>>>>> feature/other
```

Context commands while conflicted:

```bash
git status                        # which files; what operation is in progress
git log --merge --oneline -- f    # the commits from both sides that touched f
git diff                          # combined diff of the conflicted area
git diff --ours                   # what the merge does relative to your side
git diff --theirs                 # ...relative to the incoming side
```

## The resolution discipline

1. Understand what **each side was trying to do** — from the commits
   (`git log --merge`), not just the lines.
2. Write the combination that satisfies both intents. Sometimes that's
   neither side's text.
3. `git add <file>` to mark resolved; when everything is staged,
   `git merge --continue` / `git rebase --continue`.
4. **Build and run the tests before pushing.** Two changes can merge
   textually clean and still be wrong together (one side renamed a
   function, the other added a call to the old name) — the *semantic
   conflict* that no marker flags. The merge commit is code; test it.

Bailing out is always available and always safe:
`git merge --abort` / `git rebase --abort` / `git cherry-pick --abort`.

## Whole-file decisions (binary files, generated files)

```bash
git restore --ours   -- path/to/file   # keep your side
git restore --theirs -- path/to/file   # take the incoming side
git add path/to/file
```

Beware the direction flip during **rebase**: "ours" is the branch you
are rebasing *onto*, "theirs" is your own work being replayed. Verify
with `git log --merge` before trusting either label.

## Lockfiles and other generated artifacts

Never hand-merge `package-lock.json`, `poetry.lock`, `Cargo.lock` and
friends. Take either side wholesale, then regenerate so the lockfile
matches the merged manifest:

```bash
git restore --theirs -- package-lock.json
npm install                     # or the ecosystem's equivalent
git add package-lock.json
```

Some ecosystems ship merge drivers (declared in `.gitattributes`, e.g.
`package-lock.json merge=npm-merge-driver`) — use one if the repo
already has it. A `.gitattributes` rule of `path merge=ours` silently
discards incoming changes on that path — appropriate for generated
changelogs, dangerous anywhere else.

## rerere — stop resolving the same conflict twice

```bash
git config --global rerere.enabled true
```

REuse REcorded REsolution: git remembers how you resolved a conflict
hunk and replays it when the identical conflict reappears — which is
constantly, during long rebases, repeated trial merges, or cherry-picks
across release branches. Replayed resolutions are applied but left
unstaged, so you still review them. `git rerere forget <path>` clears a
recorded resolution that was itself wrong.

## Strategy options — the sharp edge

- `git merge -X ours` / `-X theirs`: normal merge, but conflicting
  *hunks* auto-resolve to one side. Occasionally right for
  vendored/generated trees.
- `git merge -s ours` (the *strategy*, not the option): discards the
  other side's content **entirely** while recording the merge — the
  result contains none of their changes. Almost never what "prefer our
  side" means. Confusing the two is a classic silent-data-loss bug.

## Boundaries

Conflicts during history surgery → rebase-and-history.md. If a merge
"lost" work after the fact → recovery-and-disasters.md. Reviewing the
merged result's quality → code-review-development.
