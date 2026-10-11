# Contributing

Issues and pull requests are welcome. A skill is one self-contained directory inside one pack:

```
plugins/ccmaf-skills-<pack>/skills/<skill>/
  SKILL.md        # frontmatter (name, description) + a lean core
  references/     # topic files, loaded on demand
```

## Editing or adding a skill

1. **Write the skill.** Edit `plugins/<pack>/skills/<skill>/SKILL.md`, or create a new directory in the pack it belongs to. The directory name is the skill's identity: lowercase and hyphenated, `<domain>-development` for technology-stack skills, a short descriptive name for disciplines. Frontmatter `name` must equal the directory name; `description` carries the trigger phrases and stays under 1,024 characters (the validator errors above 1,536). A skill lives in exactly one pack.
2. **Catalogue it.** Add or update the skill's entry in `scripts/catalog-data.json` under `skills`: its `pack` id and a one-line `summary` of at most 140 characters. A new pack also needs an entry under `packs` (`id`, `title`, `audience`, `description`, `order`).
3. **Generate.** Run `node scripts/generate-catalog.mjs`. It rewrites the pack `plugin.json` and README files, `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `SKILLS.md` and `skills-manifest.json`. Never edit those by hand.
4. **Validate.** Run `node scripts/validate-skills.mjs --strict` and fix every error. It checks frontmatter, manifests against the directories on disk, catalogue coverage, cross-references and relative links, and LF line endings, and prints the listing-budget report: the description characters each pack adds to every session. If you have the Claude Code CLI, `claude plugin validate .` should also pass.
5. **Record it.** Add a line to `CHANGELOG.md` under a dated heading.

CI runs the validator in strict mode and `node scripts/generate-catalog.mjs --check` on every push and pull request.

## Conventions

- **Cross-references are names, not hard links.** Route adjacent concerns to sibling skills by their directory name in backticks. A consumer who installed only one pack gets less depth there, never breakage. Relative links must stay inside the skill's own directory unless the target is in the same pack.
- **Renaming a skill or moving it between packs is a breaking change** for anyone who selected it by name or installed its pack. Note it in the changelog.
- **Markdown first, LF line endings, nothing that runs on its own.** Helper scripts under a skill's `scripts/` must be dependency-free and run only when the skill tells the agent to.
- **UK English**, and date-stamp fast-moving claims (versions, deadlines, deprecations) with a re-verify note.
- **No client, employer or project-specific policy.** The catalogue is domain-neutral and public.
