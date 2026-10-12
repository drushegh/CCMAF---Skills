# Deploy and operate

## Deploying

- `npx wrangler deploy` (add `-e <env>` for an environment). Before the first
  production deploy: `wrangler whoami`, read the config's bindings, confirm
  with the user which account and environment are targeted.
- `wrangler deploy --dry-run --outdir dist` builds without uploading — use it
  in CI on pull requests to catch bundling and config errors.
- Worker size limit is 64 MiB uncompressed on both plans (the gzip figure
  Wrangler prints is informational); startup must finish within 1 s, so keep
  heavy work out of global scope.
- **Order**: remote D1 migrations (backward compatible) → deploy code →
  verify → later, contract migrations.

## Versions, gradual deployments, rollback

- Every deploy (and every `secret put`) creates a **version**.
  `wrangler versions list`, `wrangler versions view <id>` (bindings, vars,
  compatibility settings — the authority on what is live),
  `wrangler deployments list`.
- Gradual rollout: `wrangler versions upload` then
  `wrangler versions deploy` with a percentage split. During a split, two
  versions serve traffic — expect mixed behaviour in logs.
- `wrangler rollback [<version-id>]` reverts **code and config only**. It
  does not undo D1 migrations, KV writes or R2 changes; secrets changed since
  may not match the old code (verify behaviour).

## CI deploys

```yaml
# .github/workflows/deploy.yml (sketch — pin actions by SHA in real use)
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production          # approvals live here
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
      - run: npx wrangler d1 migrations apply recipe-box --remote
        env: { CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
               CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" }
      - run: npx wrangler deploy
        env: { CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
               CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" }
```

`cloudflare/wrangler-action` is the official alternative to calling `npx
wrangler` directly. If the project also has git integration (Pages or Workers
Builds), CI and the platform will **both** deploy — pick one owner (see
`pages-and-static-assets.md`). Pipeline structure, approvals and SHA pinning
→ `devops-development`.

## Cron Triggers

- `"triggers": { "crons": ["0 3 * * *"] }`; handler
  `scheduled(controller, env, ctx)`. Schedules run in **UTC**.
- Free plan: 5 cron triggers per account and 10 ms CPU per invocation (same
  as requests). Changes take up to 15 minutes to propagate.
- Make the job idempotent and resumable; a 10 ms CPU budget means "fan out
  to a queue or process in small chunks", not "loop over every row".
- Local test: `curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=0+3+*+*+*"`.

## Observing

- `wrangler tail [-e env] [--format pretty|json] [--status error]` streams
  live logs from the deployed Worker — the fastest production debug loop.
  Avoid logging secrets or personal data; tail output lands in terminals and
  agent transcripts.
- `"observability": { "enabled": true }` turns on Workers Logs (persisted,
  queryable in the dashboard; daily free quota — verify).
- `ctx.waitUntil(promise)` for work after the response (analytics, cache
  writes); unawaited promises without it may be cancelled.
- Strategy (what to log, alerting) → `observability-development`.

## Testing

- `@cloudflare/vitest-pool-workers` runs Vitest tests **inside workerd**
  with real binding simulations (D1, KV, R2, Durable Objects), isolated
  storage per test file (verify isolation defaults). Apply D1 migrations in
  test setup (the pool provides helpers — verify the API for your version).
- Integration test against `wrangler dev` with `fetch` for end-to-end
  routes; use a unique port and stop the process you started (Windows
  zombie note in `wrangler-config-and-local-dev.md`).
- Before calling a route fix done, hit the running route — build and type
  checks do not exercise runtime-only errors.

## Incident checklist

1. `wrangler deployments list` — what changed and when?
2. `wrangler tail --status error` — the actual exception.
3. `wrangler versions view <current>` — bindings/env as expected?
4. Free-tier caps reached? (dashboard usage per product; errors after a
   quiet period that reset at 00:00 UTC are a clue).
5. Roll back code with `wrangler rollback` if a deploy caused it; fix data
   separately.
