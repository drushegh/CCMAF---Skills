---
name: cloudflare-workers-development
description: >-
  Building, running and deploying on Cloudflare's developer platform, free tier
  first: Workers (fetch/scheduled handlers, static assets), Wrangler config and
  CLI, local dev with Miniflare/workerd, D1 (SQLite) with migrations, Workers
  KV, R2, Pages and Pages Functions, `_headers`/`_redirects`, secrets and
  `.dev.vars`, environments, cron triggers, versions/rollback, and the deploy
  traps (git-integrated Pages deploying regardless of CI, local-vs-remote
  defaults, preview vs production bindings). Use whenever a task touches
  wrangler.jsonc/wrangler.toml, `wrangler dev`/`deploy`/`d1`/`kv`/`r2`/`pages`
  commands, a Worker's `env` bindings, `.dev.vars`, a `_headers` or
  `_redirects` file, a site hosted on Cloudflare Pages, "deploy to
  Cloudflare", "edge function", "D1 migration", "KV namespace", "R2 bucket",
  or a Workers free-tier limit error. Paid features are flagged as optional.
---

# Cloudflare Workers Development

Engineering rules for Cloudflare's developer platform: **Workers** (code at the
edge), **Wrangler** (the CLI and config), and the storage and hosting products
that bind to a Worker — **D1** (SQLite), **KV** (eventually consistent
key-value), **R2** (S3-compatible object storage) and **Pages** (static sites
with optional Functions). The default stance is **free tier first**: design to
fit the Workers Free plan and call out anything that needs the paid plan.

Version context (October 2026 — fast-moving, re-verify against
developers.cloudflare.com): Wrangler 4.x is current; Cloudflare recommends
`wrangler.jsonc` over `wrangler.toml` for new projects; Wrangler v4 made
**local the default** for D1/KV/R2 commands (add `--remote` to touch real
data); Workers with static assets now cover most of what Pages does and
Cloudflare publishes a Pages → Workers migration guide. Limits in this skill
are dated — confirm in `references/free-tier-limits.md` sources before quoting.

## Non-negotiables

1. **Know which data you are touching.** `wrangler d1 execute`,
   `d1 migrations apply`, `kv key ...` and `r2 object ...` default to the
   **local** simulation in Wrangler v4. Always pass `--local` or `--remote`
   explicitly in scripts and docs so intent is visible, and treat every
   `--remote` write as a production change (confirm first; dry-run where the
   command offers it).
2. **Never put secrets in `vars` or the Wrangler config.** Use
   `wrangler secret put` (or `--secrets-file` on deploy) for deployed Workers
   and a gitignored `.dev.vars` *or* `.env` for local dev. Declare required
   secret *names* in config (`secrets`) so deploys and types catch omissions.
3. **CI is not a gate unless you make it one.** A git-integrated Pages project
   (and Workers Builds) deploys on push regardless of CI status. Protect the
   production branch with required checks, or disable automatic production
   deploys and deploy from CI (`references/pages-and-static-assets.md`;
   pipeline shape → `devops-development`).
4. **Bindings are per environment.** `vars`, `kv_namespaces`, `d1_databases`,
   `r2_buckets`, `services`, `queues`, `secrets` and similar are **not
   inherited** by `env.<name>` blocks — redeclare them in each environment or
   that environment silently has none. `compatibility_date` and flags are
   inherited.
5. **Verify the deployed bindings, not the deploy log.** The deploy summary
   can show a preview database id; `wrangler versions view <id>` (or the
   dashboard) is the authority for what the live version is bound to.
6. **Fit the free plan by design.** 10 ms CPU per request, 50 subrequests,
   100k requests/day (resets 00:00 UTC), D1 5M rows read / 100k rows written
   per day, KV 1,000 writes/day. Count rows scanned, not rows returned, and
   batch writes. When a limit is hit the API errors rather than bills you —
   design the failure path.
7. **KV is eventually consistent.** Changes can take 60 s or more to appear in
   other locations, including negative lookups. Never use KV for counters,
   locks, rate limits that must be exact, or read-after-write flows — use D1
   or a Durable Object.
8. **Local first, then preview, then production.** `wrangler dev` runs the
   real runtime (workerd) with local bindings; test CSP, redirects and
   headers on a preview deployment, because framework preview servers do not
   apply `_headers`/`_redirects`.

## Decision tables

| Need | Use |
|---|---|
| API / server logic at the edge | Worker (`fetch` handler) |
| Static site, SPA, docs site | Workers static assets (new projects) or Pages (existing / git-integrated) |
| Relational data, joins, transactions | D1 (SQLite) — batch writes, index for scans |
| Config, feature flags, cached lookups, sessions tolerant of staleness | KV |
| Files, uploads, images, backups | R2 (no egress fees; free tier needs Standard storage) |
| Exact counters, locks, per-key coordination, WebSockets | Durable Objects (free plan: SQLite-backed only — verify) |
| Scheduled jobs | Cron Triggers (UTC; 5 per account on free) |
| Background work / retries | Queues (check plan availability — verify) |

| Symptom | First check |
|---|---|
| Works locally, empty data in production (or vice versa) | Local vs `--remote` default; migrations applied to the wrong side |
| `no such table` on first local request | `wrangler d1 migrations apply <db> --local` not run yet |
| Binding `undefined` in one environment only | Non-inheritable key not redeclared under `env.<name>` |
| Deployed but still old behaviour | Wrong environment (`-e`), gradual deployment split, cached asset |
| CSP/redirect works locally, not live (or the reverse) | `_headers` comma-joins duplicates; preview server ignores `_headers`; Functions ignore `_headers` |
| `Error 1027` / limit errors | Daily free request cap reached (verify code); D1/KV daily caps |
| `EACCES` binding a port on Windows (login callback 8976, dev 8787) | Port inside a WinNAT excluded range — pick another port |
| Port already in use after stopping dev | Orphaned `wrangler`/`workerd` process |

## High-frequency pitfalls

- Running `migrations apply` without `--remote` and believing production is
  migrated (or with `--remote` when you meant local).
- Editing an applied migration file: D1 tracks applied migrations **by name**
  in `d1_migrations`, so an edited file never re-runs. Add a new migration.
- Using `wrangler dev --remote` (legacy, all bindings remote) where per-binding
  `remote: true` would do — remote bindings write to **real data**.
- Storing secrets in `vars` "just for now"; committing `.dev.vars`.
- Two `Content-Security-Policy` rules matching one path in `_headers` — values
  are comma-joined into one header that enforces both policies.
- Leaving `wrangler dev` running in the background: zombie `workerd`
  processes hold ports and lock `.wrangler/`. Stop what you started; delete
  `.wrangler/tmp` if a restart fails. Never kill processes you did not start.
- Linting/formatting `.wrangler/` build output — add `**/.wrangler/**` to
  ESLint/Prettier ignores and `.gitignore`.
- pnpm 10+ blocking `workerd`/`esbuild` postinstall scripts — allow them
  explicitly (`onlyBuiltDependencies` / `allowBuilds`, verify for your pnpm)
  or `wrangler dev` fails to start (→ `typescript-development`).
- Assuming `Date.now()` advances during a request: Workers freeze time
  between I/O for Spectre mitigation — measure with I/O boundaries in mind
  (verify).

## Workflow

1. **Scaffold or read**: `npm create cloudflare@latest` for new projects, or
   read the existing `wrangler.jsonc`/`toml`, `package.json` scripts and any
   CI workflow before changing anything. Note the Wrangler version.
2. **Config**: set `compatibility_date` (today, for new work) and
   `nodejs_compat` only if you need Node APIs; declare bindings per
   environment; run `wrangler types` and commit or regenerate the `Env` type.
3. **Local**: `.dev.vars` (gitignored) for secrets; `wrangler d1 migrations
   apply <db> --local`; `wrangler dev`. Seed local data deliberately.
4. **Test**: unit/integration tests with `@cloudflare/vitest-pool-workers`
   (runs inside workerd) — see `references/deploy-and-operate.md`.
5. **Preview**: deploy a preview/staging version (`wrangler versions upload`,
   a preview branch, or `-e staging`) and check headers, redirects, bindings.
6. **Production**: apply remote migrations first (backward-compatible,
   expand/contract), then `wrangler deploy`; verify with
   `wrangler versions view`, a smoke request and `wrangler tail`.
7. **Rollback** is `wrangler rollback` to the previous version — but it does
   not roll back D1 schema or data; design migrations so the previous code
   still works.

## How to verify

- `wrangler whoami` before any remote command — confirm the account.
- `wrangler d1 migrations list <db> --remote` shows unapplied migrations;
  `wrangler d1 execute <db> --remote --command "SELECT name FROM d1_migrations"`
  shows applied ones.
- `curl -sI https://<deployment>/path` for headers; compare with `_headers`.
- `wrangler versions view <id>` for the bindings the live version really has.
- Free-tier usage: dashboard analytics per product; check before load tests.

## Boundaries

- **CI/CD pipeline shape, required checks, deploy approvals** →
  `devops-development` (its `hosting-platform-integrations.md` covers git
  integrations that bypass CI).
- **SQL itself, SQLite PRAGMA/upsert traps** → `sql-development`
  (`sqlite-and-postgres-gotchas.md`); this skill owns D1 mechanics.
- **TypeScript, pnpm, bundling** → `typescript-development`; **front-end
  frameworks** built for Pages → `frontend-development` /
  `react-development`; **CSP and security review** → `secure-development`;
  **auth flows** → `identity-development`.
- **Caching, Core Web Vitals** → `web-performance-development`; **logging
  and alerting strategy** → `observability-development`; **test design** →
  `testing-development`.
- **Version-matched docs discipline** → `read-the-damn-docs`; **changing a
  machine's network/port configuration** (WinNAT, firewall) →
  `safe-system-changes`.

## Reference index

| File | Load when |
|---|---|
| `references/wrangler-config-and-local-dev.md` | Writing `wrangler.jsonc`, environments, types, `wrangler dev`, remote bindings, Windows/local-dev trouble |
| `references/storage-d1-kv-r2.md` | Choosing or using D1, KV or R2; D1 migrations, batches, local/remote/preview databases |
| `references/pages-and-static-assets.md` | Pages vs Workers static assets, `_headers`/`_redirects`, Pages Functions, git integration and CI gating |
| `references/secrets-and-security.md` | Secrets, `.dev.vars`/`.env`, API tokens for CI, CSP via `_headers`, Access |
| `references/deploy-and-operate.md` | Deploy, versions, gradual rollout, rollback, cron triggers, tail/logs, CI deploys, testing in workerd |
| `references/free-tier-limits.md` | Checking a design against Free vs Paid limits; diagnosing limit errors |
