# Review screen and publishing

## 1. What the install review shows (spec §7)

Before anything installs, the app inspects the plugin **statically** (no
execution, no network) and shows:

- Source, with an **Official** or **Community** badge. Official is decided by
  the source's canonical URL (the CCMAF framework, skills and mods repos),
  never by its name.
- Plugin name, version, description, author, homepage.
- Every component group with counts: skills (name and description from each
  `SKILL.md`), commands, agents, hooks (event, matcher and **the exact command
  line**), MCP servers (name and stdio command plus args, or HTTP URL), `bin/`
  file names, output styles, LSP servers, and flags for experimental
  components.
- The type manifest if present: safety tier and the permission lists it would
  add.
- Every required plugin, each reviewable in turn.
- For Community sources, a plain warning that anyone can publish there and
  that hooks and servers run with the owner's permissions.

Inspection is capped (≤ 2000 files walked, ≤ 1 MB per file read) and refuses
unsafe paths. The review is required for every source add, every install and
every create-from-type.

## 2. Writing for the review

- **Fewer components, fewer questions.** A kit that is a persona, a manifest
  and a scaffold plus required packs reviews in seconds. Each hook and MCP
  server adds a line a careful owner must judge.
- **Hook commands should be readable.** Quote paths, call a named script with
  a clear name, avoid one-line encoded payloads or download-and-run patterns.
  Anything that looks obfuscated is obfuscated, from the owner's seat.
- **MCP endpoints should be expected.** A local stdio server bundled in the
  kit, or a well-known HTTPS endpoint the description explains. No metered or
  key-requiring server as a requirement.
- **Skill descriptions are on show.** They appear verbatim; make them accurate
  triggers, not marketing.
- **No `bin/` unless essential.** Files there go on the agent's PATH; they
  also stop the plugin installing in claude.ai and Cowork.
- **Description explains the tier.** "Changes Windows settings after asking;
  journals every change" tells the owner why it is T2.
- **No symlinks anywhere in the kit.** The review refuses them.

## 3. `requires_plugins`

- Format: `<plugin>@<marketplace>`, for example
  `ccmaf-skills-workspace@ccmaf-skills`. Pack ids in the CCMAF skills
  marketplace are a contract once published; check the current list in that
  repository's catalogue before referencing one.
- Installed with project scope, so they apply only in this workspace.
- Prefer packs from Official sources. A Community requirement forces the owner
  through an extra source-add review.
- Keep it short (hard limit 20). Each pack adds skills to the agent's listing
  and to the review.
- Claude Code's own `plugin.json` also has a `dependencies` field. The app's
  create flow installs and reviews from `requires_plugins`; if you also set
  `dependencies`, keep the two consistent so a plain `claude plugin install`
  outside the app behaves the same. (How the app treats `dependencies` is not
  part of the M1 spec; check before relying on it.)

## 4. Publishing

A source is a git repository with `.claude-plugin/marketplace.json` listing
its plugins. Steps:

1. Put the kit in its own folder in the marketplace repository (or its own
   repository referenced from the marketplace).
2. Give `plugin.json` a kebab-case `name` (not starting with `claude-` or
   `anthropic-`, which validate rejects), a `version`, a `description` and an
   `author`.
3. Add the plugin entry to `marketplace.json`.
4. `claude plugin validate <kit-dir> --strict` and validate the marketplace.
5. Add the marketplace locally (`claude plugin marketplace add <path-or-url>`)
   and run a create-from-type end to end in a throwaway folder.
6. Push. Owners add the source in the app's Settings → Sources; Community
   unless it is one of the Official CCMAF repositories.

Never ship secrets, tokens, personal paths, real names or employer names. The
repository is public by nature.

## 5. Versioning and updates

- Bump `version` in `plugin.json` and in `type.json` together on every
  release. A set `plugin.json` version pins installs until it changes.
- `type.json` `id` never changes. A rename is a new type.
- Scaffold changes do not reach existing workspaces (no overwrite). Put
  changes that must reach everyone in skills (updated through the plugin) or
  in release notes telling owners what to edit.
- Permission changes: adding entries is visible on the update review; owners
  keep whatever they already have (merge is a union). Removing an entry from
  the manifest does not remove it from existing workspaces; say so in release
  notes if it matters.
- Keep a short CHANGELOG in the kit folder: what changed, and whether owners
  need to do anything.

## 6. Release checklist

- [ ] `claude plugin validate --strict` clean.
- [ ] `type.json` checklist passed (`type-manifest.md` section 4).
- [ ] Scaffold walk clean (`scaffold-and-schedules.md` section 2).
- [ ] Persona, tier, permissions and schedules agree.
- [ ] Every `requires_plugins` entry exists at a published version.
- [ ] Review screen read end to end as a stranger, in a throwaway workspace.
- [ ] One routine task runs; one forbidden task is denied or asked.
- [ ] No secrets, personal data, real or company names; no paid dependency.
- [ ] Versions bumped in both manifests; CHANGELOG updated.
