# Changelog

Every commit to `main` is a release; entries are dated rather than versioned. Newest first.

## 2026-10-11 — role/section packs

**Breaking for path-based consumers.** Skills no longer live at the repository root.

- Moved all 72 skills from `<skill>/` to `plugins/ccmaf-skills-<pack>/skills/<skill>/`, in 13 packs: `core`, `engineering`, `web`, `backend`, `infra`, `microsoft`, `ai`, `data`, `apps`, `games`, `creative`, `research`, `automation`. Skill names and contents are unchanged.
- Each pack is its own plugin in the `ccmaf-skills` marketplace (`/plugin install ccmaf-skills-<pack>@ccmaf-skills`). Pack ids are a stable contract from this release on.
- The all-in-one `ccmaf-skills` plugin stays, and is still the first marketplace entry; its `skills` array now points into the packs.
- Added `scripts/catalog-data.json` (pack metadata and one-line skill summaries, the single source of truth), `scripts/generate-catalog.mjs` (generates every pack `plugin.json` and README, `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `SKILLS.md`, `skills-manifest.json`; `--check` for CI) and `scripts/validate-skills.mjs`.
- Added `SKILLS.md` (the full catalogue plus a "which packs do I need" table), `skills-manifest.json`, `CONTRIBUTING.md`, and a `validate` GitHub Actions workflow.
- CCMAF `skills-sync` resolved skills at `<root>/<skill>`; it needs a framework update to resolve `plugins/*/skills/<skill>`. Until then, older framework versions report the selected skills as missing upstream, keep their local copies, and hold the pin.
