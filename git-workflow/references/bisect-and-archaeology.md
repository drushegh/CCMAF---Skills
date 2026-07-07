# Bisect and History Archaeology

## git bisect — find the breaking commit in O(log n)

Bisect binary-searches history between a known-good and known-bad
commit. 1,000 commits ≈ 10 test runs. Manual loop:

```bash
git bisect start
git bisect bad                  # current HEAD is broken
git bisect good v2.3.0          # last version known to work
# git checks out the midpoint; test it, then:
git bisect good                 # or: git bisect bad / git bisect skip
# ...repeat until:  <sha> is the first bad commit
git bisect reset                # ALWAYS: return to where you started
```

### Automate it — `git bisect run`

The manual loop invites judgement drift; a script doesn't:

```bash
git bisect start HEAD v2.3.0
git bisect run ./test-for-bug.sh
git bisect reset
```

Exit-code contract for the script: `0` = good, `1–124` or `126–127` =
bad, **`125` = skip this commit** (untestable — e.g. build broken for
unrelated reasons), `≥128` aborts the bisect. Typical shape:

```bash
#!/usr/bin/env bash
set -u
make build || exit 125          # can't build here => can't judge => skip
./run-the-check.sh              # exits 0 when behaviour is correct
```

### Bisect discipline

- The predicate must test **one observable behaviour**, cheaply. Flaky
  predicates poison the search — run the check 2–3 times inside the
  script for intermittent bugs, or fix the flake first.
- Searching for something other than a bug? Use neutral terms:
  `git bisect start --term-new=fast --term-old=slow` — bisect finds any
  *transition*, not only breakage.
- On branch-heavy histories, `git bisect start --first-parent` (2.29+)
  walks only mainline merges — it finds the *merge* that introduced the
  problem, which is usually the actionable answer.
- Bisect needs history: a `--depth 1` CI clone must
  `git fetch --unshallow` first.

## Pickaxe — when did this string/pattern change?

```bash
git log -S 'calculateTax' --oneline          # commits that ADD/REMOVE the string
git log -G 'tax(Rate|Amount)' --oneline      # commits whose diff MATCHES the regex
git log -S 'calculateTax' --all -- src/      # across all branches, one subtree
```

`-S` counts occurrences (catches additions/deletions, ignores moves
within a file); `-G` matches the diff text (catches every touch,
including moved lines). Add `-p` to see the diffs, `--reverse` to find
the *first* introduction.

## Line and function history

```bash
git log -L 42,60:src/billing.py        # evolution of lines 42-60
git log -L :calculate_tax:src/billing.py   # evolution of one function
```

## blame — but properly

```bash
git blame -w -C -C file.py     # -w ignore whitespace; -C follow copies/moves
                               # (repeat -C up to three times to dig harder)
```

Blame answers "which commit last touched this line", not "who is at
fault". Mass-reformat commits wreck naive blame — list them in a
`.git-blame-ignore-revs` file and set
`git config blame.ignoreRevsFile .git-blame-ignore-revs` (2.23+);
major hosts honour the same file in their blame views (as of 2026-07 —
re-verify against your host).

## Finding deleted things

```bash
git log --all --full-history --diff-filter=D -- path/to/lost-file
git show <sha>^:path/to/lost-file      # content just BEFORE the deletion
git log --all -S 'unique snippet'      # deleted code you only half-remember
```

## Comparing two versions of a series

`git range-diff old-tip...new-tip` (2.19+) pairs up commits across a
rebase and shows what changed *within* each — the reviewer's tool for
"what did the force-push actually change?".

## Boundaries

Bisect is the *isolation* step of a larger method — reproduction,
hypothesis discipline and verification around it → systematic-debugging.
Recovering commits bisect/archaeology can no longer see →
recovery-and-disasters.md.
