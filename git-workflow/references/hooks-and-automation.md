# Hooks and Automation

## Client-side hooks — fast feedback, never enforcement

The hooks that matter day-to-day: `pre-commit` (lint/format/secret-scan
the staged snapshot), `commit-msg` (message convention), `pre-push`
(tests before publishing). Two structural facts drive all hook design:

1. `.git/hooks/` is **not versioned** — a raw hook script protects only
   the machine it's on. Version hooks via `core.hooksPath` (2.9+)
   pointing at a committed directory, or a hook manager the ecosystem
   already uses — `pre-commit` (Python-ecosystem, language-agnostic),
   `husky`/`lefthook` (npm) are the common ones as of 2026-07.
2. Every client hook is skippable (`--no-verify`), so hooks are
   **advisory** — the enforcement point is the server/CI (branch
   protection, required checks → devops-development). Design
   accordingly: hooks catch mistakes early; CI catches them always.

Keep hooks fast (a slow `pre-commit` trains people to `--no-verify`)
and operate on the **staged** content, not the working tree:

```bash
#!/usr/bin/env bash
# .githooks/pre-commit — checked in; activate with:
#   git config core.hooksPath .githooks
set -Eeuo pipefail

mapfile -t staged < <(git diff --cached --name-only --diff-filter=ACM)
[[ ${#staged[@]} -eq 0 ]] && exit 0

for f in "${staged[@]}"; do
  case "$f" in
    *.sh)  bash -n "$f" ;;
    *.env|*secret*) echo "refusing to commit '$f'" >&2; exit 1 ;;
  esac
done
```

Shell discipline inside hooks (quoting, strict mode, portability) →
bash-development.

## Scripting git — plumbing over porcelain

Human-facing output (`git status`, `git log` defaults) is unstable
across versions, config and locale — **never parse it**. Scripts use
the machine formats:

```bash
git status --porcelain=v2                 # stable, documented status format
git rev-parse --abbrev-ref HEAD           # current branch name
git rev-parse --show-toplevel             # repo root
git rev-parse --verify --quiet "$ref"     # "does this ref exist?" (exit code)
git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads
git ls-files -z | xargs -0 ...            # NUL-safe file iteration
git diff --name-only --diff-filter=ACM main...HEAD   # changed vs merge-base
```

Rely on **exit codes**, not output emptiness; add `-z`/`--porcelain`
variants wherever filenames can contain spaces. In CI, avoid depending
on `git` prompts or advice text — set `GIT_TERMINAL_PROMPT=0` so a
missing credential fails fast instead of hanging.

## Recommended configuration

Sane per-user defaults (`--global`); repo-level config only for things
the repo genuinely requires:

```bash
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global rebase.autoSquash true
git config --global fetch.prune true
git config --global push.autoSetupRemote true    # (2.37+) no more
                                                 # --set-upstream dance
git config --global merge.conflictstyle zdiff3   # (2.35+)
git config --global rerere.enabled true
git config --global branch.sort -committerdate
git config --global init.defaultBranch main
```

## Line endings — decided by the repo, once

Per-machine `core.autocrlf` produces the classic "entire file changed"
diffs between Windows and Unix contributors. Commit a `.gitattributes`
instead — it overrides everyone's local setting:

```text
* text=auto
*.sh   text eol=lf
*.bat  text eol=crlf
*.png  binary
```

After adding or changing it: `git add --renormalize .` and commit the
result, which realigns already-committed files with the rules. Files
that must never be touched (test fixtures with exact bytes) get
`-text`.

## Aliases — small, memorable, no logic

```bash
git config --global alias.lg "log --oneline --graph --decorate -20"
git config --global alias.st "status --short --branch"
```

Anything longer than a line of options belongs in a versioned script
(where it can be reviewed and tested), not an alias.

## Boundaries

Server-side enforcement, required checks, merge queues →
devops-development. Secret-scanner selection and policy →
secure-development. The shell inside hooks and scripts →
bash-development (or powershell-development where hooks shell out to
PowerShell tooling).
