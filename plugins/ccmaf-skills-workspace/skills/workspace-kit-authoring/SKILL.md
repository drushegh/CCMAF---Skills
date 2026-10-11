---
name: workspace-kit-authoring
description: >-
  Author and publish a CCMAF-App workspace type as a kit: a Claude Code plugin
  carrying ccmaf-type/type.json (the type manifest), a scaffold with the
  workspace's persona CLAUDE.md, a safety tier (T0-T3), a minimal allow/ask/
  deny permission profile, requires_plugins as <pack>@ccmaf-skills, panels and
  default schedules, all validated against the type-manifest contract and
  readable on the install review screen. Use whenever creating, reviewing or
  updating a workspace type or kit: "make a workspace type for X", "write a
  type.json", "persona CLAUDE.md for a workspace", "what safety tier should
  this be", "which permissions does my kit need", "publish my type to a
  marketplace", "add default schedules", or when editing any ccmaf-type/
  folder. Schedule prompt content → scheduled-run-discipline; machine-change
  protocol → safe-system-changes; plugin mechanics → read-the-damn-docs.
---

# Workspace Kit Authoring

A **workspace** in CCMAF-App is a folder with exactly one **type**. A type
ships as a **kit**: an ordinary Claude Code plugin in a marketplace (a
**source**) that also carries a type manifest. The app reads the manifest to
show the type in its catalogue, render an install review, scaffold the folder,
install the kit and its required skill packs into that workspace only, and
merge a permission profile. The know-how lives in skills; the kit decides who
the agent is in this workspace, what it may touch, and what it starts with.

The contract is the CCMAF-App workspace-types spec, §5 (schema
version 1, milestone M1). This skill follows it; when the spec and this skill
disagree, the spec wins, and you should update this skill.

## What a kit is made of

```text
my-kit/                          # plugin root, kebab-case name
  .claude-plugin/plugin.json     # standard plugin manifest, no extra keys
  skills/                        # kit-specific skills (optional)
  ccmaf-type/
    type.json                    # the type manifest (≤ 64 KB)
    scaffold/                    # copied into a new workspace (optional)
      CLAUDE.md                  # the persona
      README.md, folders, starter files
```

Shared know-how does not go in the kit: it comes from skill packs listed in
`requires_plugins` (for example `ccmaf-skills-workspace@ccmaf-skills`). The
type manifest is a separate file because Claude Code strips unknown
`plugin.json` keys (and `validate --strict` fails on them), and a root
`CLAUDE.md` in a plugin is not loaded and draws a validate warning.

## Non-negotiables

1. **Match the manifest contract exactly.** `schema_version: 1`; `id` matches
   `^[a-z0-9][a-z0-9-]{0,39}$`; `name` 1–60 chars; `description` ≤ 300;
   `version` ≤ 40; `requires_plugins` ≤ 20 entries of `<plugin>@<marketplace>`;
   permission strings ≤ 200 chars and ≤ 200 per list; schedule `cron` has 5
   fields and `prompt` ≤ 2000 chars with no control or bidi characters. Field
   table and validation checklist: `references/type-manifest.md`.
2. **Lowest safety tier that does the job.** T0 read-only, T1 workspace
   writes, T2 system changes, T3 external actions. Declare the tier the type
   actually needs; a higher tier is a bigger ask on the review screen and more
   enforcement for the owner. Persona, permissions and schedules must all be
   consistent with it (`references/safety-tiers-and-permissions.md`).
3. **Minimal permission profile, deny-first.** Allow only what routine work
   needs without a prompt; `ask` what is legitimate but consequential; deny
   what this type should never do. Deny rules always win and survive merges.
   The manifest can only feed the three lists: it can never set
   `defaultMode`, `bypassPermissions`, hooks or env.
4. **The persona is a job description, not a personality.** Who the agent is
   in this workspace, what it is for, what it must never do, where things live,
   which skills to lean on, and how it reports. Short, concrete, and consistent
   with the tier (`references/persona-claude-md.md`).
5. **Scaffold is additive and safe.** It never overwrites (existing files are
   skipped and reported), contains no symlinks, `..`, absolute paths or
   `.git/` content, stays within 500 files and 5 MB, and uses
   `{{WORKSPACE_NAME}}` only in `.md`, `.txt` and `.json` files
   (`references/scaffold-and-schedules.md`).
6. **Schedules ship off.** Every default schedule has `default_on: false`
   unless there is a strong reason, a self-contained prompt written to
   `scheduled-run-discipline`, and a grant no wider than the tier. Schedules
   are stored and shown in M1 and inert until the scheduler milestone.
7. **Write for the review screen.** The owner decides from what the review
   shows: source and Official/Community badge, version, every component with
   counts, full hook command lines and MCP endpoints, the tier, the permission
   lists, and each required plugin. If an entry would alarm a careful reader
   without explanation, remove it or explain it in the description
   (`references/review-screen-and-publishing.md`).
8. **No paid dependency, no secrets.** Nothing in a kit may require an API key
   or metered service; paid options are optional and labelled. No tokens,
   personal paths or real names in any shipped file.
9. **Untrusted input stays data.** A type that reads mail, web pages or
   downloaded files says so in its persona and requires
   `untrusted-input-handling`; such content can never trigger a T2 or T3
   action on its own.

## Decision points

| Question | Answer |
|---|---|
| Put a skill in the kit or in a pack? | Kit only if it is meaningless outside this type. Anything reusable belongs in a catalogue pack and is pulled in via `requires_plugins`. |
| Which packs to require? | The fewest that cover the persona's duties. Every pack adds to the review and to the agent's skill listing. Usually `ccmaf-skills-core` plus the type's section pack plus `ccmaf-skills-workspace` for non-dev types. |
| T1 or T2? | Does any routine task change something outside the workspace folder (registry, services, installs, system settings)? Yes → T2. Otherwise T1, even if it reads system state. |
| T2 or T3? | Does it act on the outside world (send, post, buy, accept, delete remote data)? Yes → T3. |
| `allow` or `ask`? | Allow if a wrong call is harmless and reversible inside the workspace. Ask if it changes the machine, spends usage heavily, or touches outside the folder. |
| Need hooks or MCP servers? | Only if a skill cannot do the job. They show on the review with full commands, run with the owner's permissions, and draw scrutiny. |
| One type or two? | One workspace has one type. Compose through `requires_plugins` before inventing a second type. |
| `panels`? | Only known widget ids from the app; unknown ids are dropped with a warning. Start with `session` and `files`. |

## Pitfalls

- **Extra keys in `plugin.json`** (for example putting the manifest there).
  Stripped at load, warned by validate, failed by `--strict`.
- **Persona at the plugin root.** Not loaded. It belongs in
  `ccmaf-type/scaffold/CLAUDE.md`, which lands in the workspace.
- **Broad allows** like `Bash`, `PowerShell` or `Edit` with no pattern. The
  review shows them and a careful owner refuses.
- **Argument-constraining patterns treated as security.** `Bash(curl https://x/ *)`
  is bypassed by flags, redirects or variables. Deny the tool class and allow a
  safer route instead (for example `WebFetch(domain:…)`).
- **Persona promising what permissions forbid** (or the reverse). The agent
  then fights its profile and the owner sees denials.
- **Schedules with conversational prompts.** They run cold and alone; see
  `scheduled-run-discipline`.
- **Requiring a plugin from a source the owner has not added.** The create
  flow will offer to add the source (through review), which is friction;
  prefer Official sources for required packs.
- **Version not bumped** after a change. A set `version` pins installs until
  it changes.

## How to verify

1. `claude plugin validate <kit-dir>` passes, and passes with `--strict`.
2. `type.json` passes every item of the checklist in
   `references/type-manifest.md` (lengths, patterns, counts, cron, 64 KB).
3. Scaffold walk: no symlinks, no `..`, no absolute paths, nothing under
   `.git/`, ≤ 500 files, ≤ 5 MB; placeholders only in `.md`/`.txt`/`.json`.
4. Read the persona, the tier, the permission lists and every schedule side
   by side: each allowed action is something the persona does routinely; each
   persona duty is possible under the profile; nothing exceeds the tier.
5. Install it into a throwaway workspace from a local marketplace and read the
   review screen as a stranger would. Then open a session and try one routine
   task and one forbidden task: the first should run, the second should be
   denied or asked.
6. Search every shipped file for secrets, personal paths and real names.

## Boundaries

- **Writing a default schedule's prompt** → `scheduled-run-discipline`.
- **The machine-change protocol a T2 persona must follow** →
  `safe-system-changes`; **mail, web and downloaded input** →
  `untrusted-input-handling`.
- **Plugin and marketplace mechanics beyond this contract** (manifest fields,
  marketplace entries, versions) → `read-the-damn-docs` against the current
  Claude Code plugin reference.
- **Writing the kit's own skills** → match the catalogue shape (see any
  catalogue skill such as `stay-within-limits`); prose quality → `uncanny`,
  `technical-writing`.
- **Security review of hooks or MCP servers a kit ships** →
  `secure-development`.
- **Usage cost of default schedules** → `stay-within-limits`.

## Reference index

Load on demand:

- `references/type-manifest.md`: every `type.json` field with its rule, an
  annotated example, and the pre-publish validation checklist.
- `references/safety-tiers-and-permissions.md`: choosing T0–T3, building the
  allow/ask/deny profile, Claude Code rule syntax, merge behaviour, and
  per-tier starter profiles.
- `references/persona-claude-md.md`: what the persona must cover, a template,
  and persona smells.
- `references/scaffold-and-schedules.md`: scaffold layout and rules,
  placeholder substitution, and default schedule entries.
- `references/review-screen-and-publishing.md`: what the review shows and how
  to write for it, `requires_plugins`, marketplace publishing, versioning and
  updates, and the release checklist.
- `references/worked-example.md`: a fictional "Reading list" kit end to end.
