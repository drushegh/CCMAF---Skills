# Changelog

Every commit to `main` is a release; entries are dated rather than versioned. Newest first.

## 2026-11-16 — upstream standards: fetch and cite

- `read-the-damn-docs`: new `references/upstream-standards.md`, a pointer-only registry of maintained standards (Modern Web Guidance, web-features/Baseline and browser-compat-data, OWASP ASVS 5.0 / Cheat Sheets / LLM Top 10 2026 / MASTG, WCAG 2.2 + ARIA APG, Google AIP, Google Cloud Well-Architected via `google/skills`, the Agent Skills spec, AGENTS.md, OpenSSF Scorecard, SLSA, Microsoft REST API Guidelines). For each source it gives the fetch target, citation format, optional pin and licence. Also covers the untrusted-content and `[GAP]` rules. `cloudflare/skills` and `vercel-labs/agent-skills` are reference-only; the Vercel repo has no LICENSE file (checked 2026-11-16). No standard text is copied.
- `secure-development`: the OWASP Top 10 for LLM Applications moves from the 2025 list to the 2026 list (published 4 August 2026; most IDs moved, and System Prompt Leakage became LLM08:2026 Hidden Context Exposure). It is now a pointer to `2026/final/` plus an ID-and-title index verified on 2026-11-16. ASVS requirements are fetched by ID from the 5.0.0 JSON and cited as `v5.0.0-<chapter>.<section>.<req>`. Cheat sheets are fetched by URL. `threat-modelling.md` points LLM features at the 2026 Appendix B.
- `frontend-development`, `web-performance-development`, `accessibility-development`: a short "Upstream guidance (fetch at use)" section each, pointing at Modern Web Guidance (installed plugin or `npx`, version recorded; unattended runs bypass the plugin and pin the CLI), Baseline status, and WCAG 2.2 / APG by ID. No guides are vendored.

## 2026-10-22 — workspace-kit journal contract alignment

- `safe-system-changes`: when the host enforces a per-change prompt (Claude Code `ask` rules or a guard hook), that prompt is the confirmation, and the change card is printed right before the single command. A workspace persona may pre-approve low-risk change kinds and raise any item to a higher tier. `references/change-journal.md` gains the journal's machine-readable rules (no format change).
- `machine-config-as-code`: the workspace layout's journal is `journal/CHANGES.md`, the same file `safe-system-changes` writes.
- `workspace-kit-authoring`: the worked example uses the `book-open` icon (`book` is not in the app's allowlist), and the manifest reference lists the known panel ids, including `systemHealth` and `changeJournal`.

## 2026-10-12 — new skill: astro-development

- New `astro-development` (`web`): Astro content sites as decision rules and field-tested traps rather than an API tutorial, from one production static site. Covers when to choose Astro, deciding `trailingSlash` with `build.format` and setting `site` first, typed content collections with https-only URL fields, `astro:env` and why local flags belong in `.env.development`, processed vs `is:inline` scripts under a strict hash-based CSP (built-in `security.csp` vs a postbuild header, with tokenizer rules and test fixtures), pixel-art-safe images and font licences, sitemap/RSS/Pagefind, testing the built site with Playwright, Windows build traps and static deploys. Version-specific facts were checked against the official docs for Astro 7.3.8; anything unconfirmed is marked "(verify)". It defers Cloudflare Pages depth to `cloudflare-workers-development`.
- The `web` pack description names it. The catalogue is now 108 skills in 19 packs.

## 2026-10-12 — new skill: motion-design

- New `motion-design` (`creative`): direction, numbers and verification for code-driven motion — rendered motion graphics (launch films, title reveals, explainer loops, GIF/MP4) and the motion layer of live UI. Directed-brief template and ban lists, easing/spring (damping ratio)/stagger/beat-grid values, the deterministic render contract, a stills → contact sheet → frame-numbered notes review loop, Web Audio scoring and A/V sync, seamless loops and export. Ships helper scripts: a Playwright frame renderer, motion tokens (closed-form spring, bezier, seeded RNG, beat grid), a `?t=` freeze hook, an ffmpeg contact-sheet/export script and a smoke test.
- The `creative` pack description names it. The catalogue is now 107 skills in 19 packs.

## 2026-10-12 — gotchas fix wave: 33 skills updated, 4 new skills

Field-tested corrections and traps from an audit of the gotchas logs kept by 38 projects that use these skills. Items seen in practice but not confirmed against official docs are marked "(verify)" in the text.

- Updated 33 skills, some with new reference files: `accessibility-development`, `api-development`, `azure-development`, `bash-development`, `comfyui-development`, `devops-development`, `dotnet-development`, `drawio-development`, `dynamics-365-development`, `frontend-development`, `game-feel`, `godot-development`, `godot-mcp-workflow`, `llm-development`, `office-formats`, `power-pages-development`, `power-platform-development`, `powershell-development`, `python-development`, `react-development`, `read-the-damn-docs`, `rust-development`, `secure-development`, `sql-development`, `tauri-development`, `testing-development`, `threejs-development`, `typescript-development`, `ui-verification`, `ux-design`, `visual-plan`, `visual-recap`, `web-performance-development`.
- New `browser-extension-development` (`web`): Manifest V3 extensions from service-worker lifecycle to store review, plus porting from Chrome to Firefox and Edge.
- New `cloudflare-workers-development` (`infra`): Workers on the free tier, covering Wrangler, local dev, D1/KV/R2, Pages, secrets and deploy traps.
- New `phaser-development` and `kenney-asset-integration` (`games`): Phaser 3/4 browser games, and getting Kenney's CC0 asset kits into Godot, three.js and Phaser.
- The `web`, `infra` and `games` pack descriptions now name the new skills. SKILLS.md has a new "Browser extension developer" row in its "which packs do I need" table.
- `godot-mcp-workflow` pointed at a "blender-toolkit" skill that doesn't exist. It now points at `blender-development`.
- The catalogue is now 106 skills in 19 packs.

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
