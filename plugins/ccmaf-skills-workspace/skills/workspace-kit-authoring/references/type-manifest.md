# The type manifest: `ccmaf-type/type.json`

Contract: the CCMAF-App workspace-types spec, §5, schema version 1. Rules
below restate the spec as of October 2026. If the spec has moved on, it wins.

## 1. Annotated example

```json
{
  "schema_version": 1,
  "id": "pc-care",
  "name": "PC care",
  "description": "A dedicated chat that looks after this Windows machine.",
  "icon": "monitor",
  "version": "0.1.0",
  "agents": ["claude"],
  "safety_tier": "T2",
  "requires_plugins": ["ccmaf-skills-system@ccmaf-skills"],
  "permissions": {
    "allow": [],
    "ask": ["Bash(reg add *)"],
    "deny": ["Bash(format *)"]
  },
  "panels": ["session", "files"],
  "schedules": [
    {
      "id": "weekly-health",
      "label": "Weekly health check",
      "cron": "0 9 * * 1",
      "prompt": "Run the weekly health check.",
      "default_on": false
    }
  ],
  "resident_allowed": false
}
```

(The spec's own example writes the permission patterns as `Bash(reg add:*)`;
Claude Code treats a trailing `:*` and a trailing ` *` as equivalent. Pick one
form and use it consistently.)

## 2. Field rules

| Field | Type | Rule | Notes |
|---|---|---|---|
| `schema_version` | integer | Must be `1` | Anything else: the app treats the type as unreadable |
| `id` | string | `^[a-z0-9][a-z0-9-]{0,39}$` | Stable forever; part of the TypeRef `<marketplace>/<plugin>/<id>` written into every workspace marker |
| `name` | string | 1–60 chars | Shown on catalogue tiles and the type badge |
| `description` | string | ≤ 300 chars | One or two plain sentences: what the workspace is for and what it may change |
| `icon` | string | From the app's icon set | Unknown ⇒ generic icon |
| `version` | string | ≤ 40 chars | Semver recommended; recorded in the marker as `type_version` |
| `agents` | string[] | Subset of the app's known agent kinds | Empty ⇒ `["claude"]`. Kits are Claude Code plugins, so M1 types are Claude-only in practice |
| `safety_tier` | string | `T0`, `T1`, `T2` or `T3` | M1 displays and reviews it; enforcement for T2/T3 arrives in later milestones. Declare it honestly now |
| `requires_plugins` | string[] | ≤ 20; each `<plugin>@<marketplace>`, validated as a plugin id | Each must come from a source the owner has added; missing ⇒ create flow offers to add it, through review |
| `permissions.allow/ask/deny` | string[] | Each ≤ 200 chars; ≤ 200 per list | Only these three lists. Cannot set `defaultMode`, `bypassPermissions`, hooks or env |
| `panels` | string[] | Known widget ids only | Unknown dropped with a warning |
| `schedules[]` | object[] | `cron`: 5 fields; `prompt` ≤ 2000 chars, sanitised (no control or bidi chars) | Stored and shown in M1, inert until the scheduler milestone |
| `resident_allowed` | boolean | | Whether the paid resident mode may be offered. No type may require it; default `false` |

Whole file: refused above 64 KB. Text fields are sanitised by the app; do not
rely on markup, control characters or zero-width characters surviving (and do
not use them).

Schedule entry fields: `id` (kebab-case, unique within the type is the safe
assumption), `label` (short, human), `cron`, `prompt`, `default_on`.

## 3. Where the manifest's effects land

On create-from-type the app: copies the scaffold, installs the kit and every
`requires_plugins` entry with project scope, merges `permissions` into
`<workspace>/.claude/settings.json`, writes `<workspace>/.ccmaf/workspace.json`
(the marker), registers the folder, and opens a session with the first
allowed agent. Failure at any step stops and reports what was done; nothing is
rolled back or deleted silently.

Consequences for authors:

- The permission merge is a **union**: existing entries are never removed and
  deny entries are always kept. You cannot loosen an owner's settings, only
  add to them.
- The marker carries your `id` and `version`. Renaming `id` orphans existing
  workspaces from the type.
- `.ccmaf/` belongs to the app and `.claude/` to Claude Code. Do not ship
  either in the scaffold.

## 4. Validation checklist (pre-publish)

Run through every line. Automate it if you publish more than one kit.

- [ ] File is valid JSON, UTF-8, ≤ 64 KB.
- [ ] `schema_version` is `1`.
- [ ] `id` matches the pattern, and has not changed since the last release.
- [ ] `name` 1–60, `description` ≤ 300, `version` ≤ 40.
- [ ] `icon` is in the app's icon set (or you accept the generic icon).
- [ ] `agents` lists only known kinds.
- [ ] `safety_tier` is one of T0–T3 and matches what the persona does.
- [ ] `requires_plugins`: ≤ 20; each is `<plugin>@<marketplace>`; each
      plugin exists in that marketplace at a published version.
- [ ] Every permission string ≤ 200 chars; each list ≤ 200 entries; every
      pattern parses as a Claude Code permission rule.
- [ ] No permission entry exceeds the tier (no system-changing allow in a T1
      type; no outside-world allow in anything below T3).
- [ ] `panels` uses only known ids.
- [ ] Every schedule: 5-field cron, `prompt` ≤ 2000 chars with no control or
      bidi characters, `default_on: false` unless justified, prompt follows
      `scheduled-run-discipline`.
- [ ] `resident_allowed` is `false` unless the type genuinely benefits.
- [ ] No secrets, personal paths or real names anywhere in the file.

Quick checks from PowerShell:

```powershell
$t = Get-Content -Raw .\ccmaf-type\type.json | ConvertFrom-Json
(Get-Item .\ccmaf-type\type.json).Length -le 64KB
$t.id -cmatch '^[a-z0-9][a-z0-9-]{0,39}$'
$t.requires_plugins | Where-Object { $_ -notmatch '^[^@\s]+@[^@\s]+$' }
$t.schedules | Where-Object { ($_.cron -split '\s+').Count -ne 5 }
```

The app's own validator is authoritative; these only catch the common slips.
