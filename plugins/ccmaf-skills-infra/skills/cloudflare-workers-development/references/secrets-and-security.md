# Secrets and security

## Secrets for deployed Workers

- `npx wrangler secret put SESSION_SIGNING_KEY` prompts for the value,
  creates a **new version and deploys it immediately**. With gradual
  deployments use `wrangler versions secret put` (creates a version without
  deploying).
- Bulk: `wrangler deploy --secrets-file secrets.json` (or a `.env`-format
  file), up to 100 per request; secrets not in the file keep their values.
  Generate the file in CI from the pipeline's secret store and delete it
  after — never commit it.
- `wrangler secret list` shows names only. Values cannot be read back —
  store the source of truth in a password manager or the CI secret store.
- Declare required secret names in config (`secrets`) so `wrangler deploy`,
  local dev and `wrangler types` flag a missing one.
- Account-wide shared secrets: Secrets Store, bound per Worker (check plan
  availability — verify).
- **`vars` are not secret** — they appear in config, the dashboard and
  version metadata. Only non-sensitive configuration goes there.

## Local secrets

- Put local values in **either** `.dev.vars` **or** `.env` next to the
  Wrangler config — not both: if `.dev.vars` exists, `.env` values are not
  loaded.
- Per environment: `.dev.vars.<env>` (then the generic `.dev.vars` is not
  loaded at all) or `.env.<env>` / `.env.<env>.local` (merged, most specific
  wins).
- Gitignore `.dev.vars*` and `.env*`; commit a `.dev.vars.example` with dummy
  values so others know the names.
- A gitignored `.env.local` that satisfies a module-scope "required
  variable" check is the classic cause of "green locally, red in CI" — give
  tests an explicit dummy environment (→ `devops-development`).

## API tokens for CI and scripts

- Use an **API token** scoped to the account and only the permissions the job
  needs (e.g. *Workers Scripts: Edit*, *D1: Edit*, *Pages: Edit*), never the
  Global API Key. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as CI
  secrets.
- Separate tokens for production and non-production where possible; set an
  expiry and rotate; IP-restrict tokens used only from known runners if your
  CI has stable egress (verify feasibility).
- `wrangler login` (OAuth) is for humans on their own machines.

## Request-level security in Workers

- Validate all input at the Worker boundary (schema validation), bind all
  D1 parameters, and return generic errors — stack traces go to logs only.
- **Rate limiting**: in-memory counters in a Worker are per isolate and
  useless as a limit. Use the Workers Rate Limiting binding (check plan —
  verify), WAF rate-limiting rules, or a Durable Object; KV is too
  eventually consistent and write-limited for counters.
- **Identity**: derive it from a verified cookie/JWT in the Worker, never
  from a client-settable header. If Cloudflare Access fronts the app,
  validate the `Cf-Access-Jwt-Assertion` JWT against your team's JWKS in the
  Worker rather than trusting that the header exists (verify header name).
- CORS: echo only allow-listed origins; handle `OPTIONS` explicitly.
- Static files bypass the Worker by default — protect private assets with
  `run_worker_first` or keep them out of the asset directory (R2 + Worker
  auth).

## Headers and CSP

- Static responses: `_headers` (one CSP rule per path; duplicates
  comma-join). Worker/Function responses: set headers in code, ideally in one
  middleware so every route gets them.
- Prefer a nonce- or hash-based CSP for inline scripts; test it on a preview
  deployment, not a local preview server.
- HSTS: enable once HTTPS is solid on every subdomain; preload is
  effectively irreversible.

General review frameworks (OWASP, threat modelling, validator bypasses) →
`secure-development`.
