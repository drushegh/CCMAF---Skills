# Changelog

Every commit to `main` is a release; entries are dated rather than versioned. Newest first.

## 2026-10-11 — workspace-type packs: 30 new skills, 6 new packs

For Claude working as an agent on your own machine rather than in a codebase. Install `core` and `workspace`, then the pack for the kind of workspace; SKILLS.md has the "which packs do I need" rows.

- New pack `workspace` (ordered straight after `engineering`): `safe-system-changes`, `untrusted-input-handling`, `scheduled-run-discipline`, `workspace-kit-authoring`.
- New pack `system`: `windows-administration`, `windows-diagnostics`, `windows-security-hygiene`, `windows-performance-tuning`, `machine-config-as-code`.
- New pack `documents`: `document-authoring`, `editorial-review`, `office-formats`.
- New pack `assistant`: `knowledge-vault`, `inbox-triage`, `calendar-assistant`, `daily-briefing`, `commitments-tracker`, `personal-data-care`. The assistant skills share `knowledge-vault`'s default layout: briefings in `01-daily/briefings/`, the commitments ledger in `03-areas/commitments/`, the briefing config at `03-areas/assistant/briefing.md`.
- New pack `homelab`: `homelab-operations`, `nas-and-storage`, `media-server-stack`.
- New pack `life-admin`: `personal-finance-records`, `household-admin`.
- Added to existing packs: `browser-automation`, `computer-use-automation`, `file-automation` (`automation`); `research-notes`, `learning-coach` (`research`); `creative-writing` (`creative`); `everyday-data-analysis` (`data`). Those packs' descriptions now cover the new skills.
- The catalogue is now 102 skills in 19 packs. Existing pack ids and skill names are unchanged; pack `order` values from `web` onwards moved down one to make room for `workspace`.
- `validate-skills.mjs` no longer treats Markdown link syntax inside inline code spans as a link to resolve.

## 2026-10-11 — role/section packs

**Breaking for path-based consumers.** Skills no longer live at the repository root.

- Moved all 72 skills from `<skill>/` to `plugins/ccmaf-skills-<pack>/skills/<skill>/`, in 13 packs: `core`, `engineering`, `web`, `backend`, `infra`, `microsoft`, `ai`, `data`, `apps`, `games`, `creative`, `research`, `automation`. Skill names and contents are unchanged.
- Each pack is its own plugin in the `ccmaf-skills` marketplace (`/plugin install ccmaf-skills-<pack>@ccmaf-skills`). Pack ids are a stable contract from this release on.
- The all-in-one `ccmaf-skills` plugin stays, and is still the first marketplace entry; its `skills` array now points into the packs.
- Added `scripts/catalog-data.json` (pack metadata and one-line skill summaries, the single source of truth), `scripts/generate-catalog.mjs` (generates every pack `plugin.json` and README, `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `SKILLS.md`, `skills-manifest.json`; `--check` for CI) and `scripts/validate-skills.mjs`.
- Added `SKILLS.md` (the full catalogue plus a "which packs do I need" table), `skills-manifest.json`, `CONTRIBUTING.md`, and a `validate` GitHub Actions workflow.
- CCMAF `skills-sync` resolved skills at `<root>/<skill>`; it needs a framework update to resolve `plugins/*/skills/<skill>`. Until then, older framework versions report the selected skills as missing upstream, keep their local copies, and hold the pin.
