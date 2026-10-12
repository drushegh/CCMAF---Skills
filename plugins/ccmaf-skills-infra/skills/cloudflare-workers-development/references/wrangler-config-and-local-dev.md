# Wrangler config and local development

## Config file

- **`wrangler.jsonc` for new projects** (Cloudflare's recommendation);
  `wrangler.toml` is still supported. Don't keep both. JSONC allows comments
  — use them to explain every binding.
- Minimal shape (fictional names):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "recipe-box-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],      // only if you need Node APIs
  "observability": { "enabled": true },           // Workers Logs (verify quota)
  "d1_databases": [
    { "binding": "DB", "database_name": "recipe-box",
      "database_id": "<prod-id>", "migrations_dir": "migrations" }
  ],
  "kv_namespaces": [ { "binding": "CACHE", "id": "<kv-id>" } ],
  "vars": { "APP_ENV": "production" },            // non-secret config only
  "secrets": { "required": ["SESSION_SIGNING_KEY"] }, // names only (verify shape)
  "env": {
    "staging": {
      // bindings are NOT inherited — redeclare every one
      "d1_databases": [ { "binding": "DB", "database_name": "recipe-box-staging",
                          "database_id": "<staging-id>" } ],
      "kv_namespaces": [ { "binding": "CACHE", "id": "<staging-kv-id>" } ],
      "vars": { "APP_ENV": "staging" }
    }
  }
}
```

- **`compatibility_date`** pins runtime behaviour. Set it to the current date
  when starting, bump it deliberately (read the compatibility-flags changelog
  for the dates you cross) and test after bumping.
- **`nodejs_compat`** enables Node built-ins (`node:buffer`, `node:crypto`,
  `AsyncLocalStorage`…). Add it only when needed; check that the npm
  packages you use work on workerd — "runs on Node" is not proof.
- **Non-inheritable keys** (redeclare per `env.<name>`): `vars`, `define`,
  `kv_namespaces`, `d1_databases` and all other bindings, `durable_objects`,
  `r2_buckets`, `services`, `queues`, `workflows`, `vectorize`,
  `tail_consumers`, `secrets`, `secrets_store_secrets`. Inheritable:
  `compatibility_date`, `compatibility_flags`, `main`, and most top-level
  settings. Select an environment with `-e staging` (or the
  `CLOUDFLARE_ENV` variable — verify for your Wrangler version).
- **`preview_database_id`** (D1) / `preview_id` (KV): what `wrangler dev`
  uses when talking to remote resources, so local work never hits production.
  It is also why some output shows a database id that is *not* production.

## Generated types

Run `wrangler types` after every binding change. It writes
`worker-configuration.d.ts` with an `Env` interface matching your config and
the runtime types for your compatibility date. Wire it into `tsconfig.json`
and CI (`wrangler types --check`, if available in your version — verify) so a
missing binding is a type error, not a runtime `undefined`.

## `wrangler dev`

- Runs your Worker **locally** in workerd via Miniflare — the production
  runtime, `TZ=UTC`. Default port 8787 (`--port` to change, `--ip` to bind).
- Bindings use **local simulations** by default (D1, KV, R2, Queues, Durable
  Objects). Local state lives under `.wrangler/state/` (verify the exact
  path; `--persist-to` changes it). It starts **empty** — apply migrations
  with `wrangler d1 migrations apply <db> --local` and seed data before the
  first request.
- **Remote bindings**: set `"remote": true` on an individual binding to use
  the real resource while code runs locally. Writes affect real data and
  count against quotas. Not supported for Durable Objects, vars, secrets,
  static assets and some others. Workers AI always runs remotely.
- `wrangler dev --remote` is the legacy mode (code uploaded to a preview,
  all bindings remote, slower). Prefer per-binding `remote: true`.
- The **Cloudflare Vite plugin** (`@cloudflare/vite-plugin`) runs the Worker
  inside `vite dev` with the same runtime — use it for full-stack Vite apps
  (React Router, etc.); it supports remote bindings but not `--remote`.
- Test scheduled handlers locally:
  `curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=0+3+*+*+*"`.

## Housekeeping

- Gitignore `.wrangler/`, `.dev.vars*`, `.env*` (except a committed
  `.env.example` / `.dev.vars.example` with dummy values).
- Add `**/.wrangler/**` to ESLint, Prettier and test-runner ignore globs —
  Wrangler writes bundled output there and linters choke on it.
- With pnpm, allow the native build scripts of `workerd`, `esbuild` and
  `sharp` (pnpm 10+ blocks them by default: `ERR_PNPM_IGNORED_BUILDS`) —
  `onlyBuiltDependencies` in pnpm 10, `allowBuilds` in later versions
  (verify for your pnpm).
- Pin Wrangler as a dev dependency and run it via `npx wrangler` / package
  scripts, so CI and every developer use the same version.

## Windows local-dev traps

- **Zombie processes.** Stopping `wrangler dev` uncleanly (closing a
  terminal, a killed agent task) can leave `workerd` running, holding the
  port and files in `.wrangler/`. Find the PID you started
  (`netstat -ano | findstr :8787`), stop that process tree
  (`taskkill /PID <pid> /T /F`), then delete `.wrangler/tmp` if the next
  start fails. Never kill `node`/`workerd` processes you did not start.
- **`EACCES` on a port that looks free.** Windows reserves *excluded port
  ranges* (WinNAT/Hyper-V), and they can include 8976 (the `wrangler login`
  OAuth callback) or 8787. Check with
  `netsh interface ipv4 show excludedportrange protocol=tcp`. The safe fix is
  to pick another port: `wrangler login --callback-port <port>`,
  `wrangler dev --port <port>`. Restarting the WinNAT service also frees it
  but is a machine change needing admin rights — follow
  `safe-system-changes` and ask first.
- **Headless/CI login.** Don't run `wrangler login` in CI or remote shells;
  use a scoped API token in `CLOUDFLARE_API_TOKEN` plus
  `CLOUDFLARE_ACCOUNT_ID` (see `secrets-and-security.md`).
