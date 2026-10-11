# Scanning for secrets and sensitive numbers

All scans here are **read-only**. They produce a list for a person to
review; nothing is deleted or rewritten automatically. Run them before the
first push of a vault, before any bulk commit, and in a pre-commit hook.

## gitleaks (free, open source)

gitleaks detects hundreds of credential formats. From version 8.19 the
commands are `git`, `dir` and `stdin` (the older `detect` and `protect`
still work but are hidden; verify against the installed version with
`gitleaks --help`).

```bash
gitleaks dir . --redact -v               # scan the working tree (files), mask secrets in output
gitleaks git . --redact -v               # scan the whole git history
gitleaks git . --redact --log-opts="-1"  # only the latest commit
```

- `--redact` masks the secret in output (accepts a percentage, e.g.
  `--redact=80`); always use it so findings do not leak into logs.
- False positives can be ignored by fingerprint in `.gitleaksignore` at the
  repo root (experimental feature). Review each before ignoring.
- Install from the project's releases or a package manager (`winget`,
  `scoop`, `brew`, verify package names); it is a single binary.

### Pre-commit hook

With the `pre-commit` framework (Python):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2   # pin to a current release tag (verify)
    hooks:
      - id: gitleaks
```

```bash
pre-commit install
```

Without the framework, a plain `.git/hooks/pre-commit` that runs
`gitleaks git --pre-commit --staged --redact` is common (verify those flags
for your version; the README documents the hook route above). Hooks are
per clone: phones running mobile git clients will not run them, which is
one more reason to scan on the PC before pushing.

Bypassing a hook (`git commit --no-verify`, `SKIP=gitleaks`) needs the
user's explicit say-so for that commit, with the finding reviewed.

## Personal numbers gitleaks does not cover

gitleaks looks for credentials, not card numbers, IBANs or PPS numbers.
This script finds candidates and checks card numbers with the Luhn
algorithm. Save it outside the vault (for example in the session scratch
directory) and run it with the vault as an argument:

```python
#!/usr/bin/env python3
"""Read-only scan for card-like, IBAN-like and PPS-like strings in .md/.txt files."""
import re, sys, pathlib

CARD = re.compile(r'\b(?:\d[ -]?){13,19}\b')
IBAN = re.compile(r'\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b')
PPSN = re.compile(r'\b\d{7}[A-W][A-Z]?\b', re.IGNORECASE)

def luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
        alt = not alt
    return total % 10 == 0

def mask(s: str) -> str:
    s = re.sub(r'[ -]', '', s)
    return '*' * (len(s) - 4) + s[-4:]

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
for path in root.rglob('*'):
    if path.suffix.lower() not in {'.md', '.txt'} or '.git' in path.parts:
        continue
    for n, line in enumerate(path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
        for m in CARD.finditer(line):
            digits = re.sub(r'\D', '', m.group())
            if 13 <= len(digits) <= 19 and luhn_ok(digits):
                print(f'{path}:{n}: card-like {mask(m.group())}')
        for m in IBAN.finditer(line):
            print(f'{path}:{n}: IBAN-like {mask(m.group())}')
        for m in PPSN.finditer(line):
            print(f'{path}:{n}: PPS-like {mask(m.group())}')
```

Run: `python -I scan_personal.py <vault-path>`. Output is masked to the
last four characters. Expect false positives (long reference numbers,
order IDs that happen to pass Luhn); each hit is reviewed with the user.
The PPS pattern is approximate (7 digits, a check letter, optional second
letter; the letter rules have changed over time, verify for exactness).

## Quick grep recipes

From the vault root (Git Bash, WSL, Linux, macOS). Case-insensitive,
read-only:

```bash
# Labels that usually precede a secret
grep -rniE '(pass(word|wd|code)?|pin|cvv|cvc|security (code|answer)|recovery code|api[_ -]?key|secret|token)\s*[:=]' \
  --include='*.md' --include='*.txt' .

# Private keys and common token prefixes
grep -rnE -- '-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[bpas]-|AKIA[0-9A-Z]{16}' .

# Health words (review only; many hits will be harmless)
grep -rniwE 'diagnos(is|ed)|prescri(bed|ption)|medication|[0-9]+ ?mg|therapy|counsell?ing' --include='*.md' .
```

PowerShell equivalent for the first recipe:

```powershell
Get-ChildItem -Recurse -Include *.md, *.txt |
  Select-String -Pattern '(pass(word|wd|code)?|pin|cvv|cvc|recovery code|api[_ -]?key|secret|token)\s*[:=]' |
  Select-Object Path, LineNumber
```

(Select-String is case-insensitive by default. Output shows paths and line
numbers only, so the values are not echoed.)

## Hygiene for the scans themselves

- Never write a found value to a file, log or chat; report path, line and
  a masked form.
- When you must search for a specific known value (to confirm a
  redaction), avoid leaving it in shell history: in Bash, prefix the
  command with a space if `HISTCONTROL` includes `ignorespace`, or read the
  value with `read -rs` into a variable; in PowerShell, use
  `Read-Host -AsSecureString` only in an interactive session the user runs.
- Scan results files (if the user wants one) go in the session scratch
  area, not the vault.
