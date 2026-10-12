# Storage: D1, KV and R2

## Choosing

| Question | D1 | KV | R2 |
|---|---|---|---|
| Data shape | Relational rows (SQLite) | Key → value (≤ 25 MiB) | Objects/files (S3 API) |
| Consistency | Strong on the primary; read replicas via Sessions API | **Eventual** (60 s+ across locations) | Strong per object |
| Free-tier pinch point | 5M rows *read*/day, 100k rows written/day, 500 MB per DB | **1,000 writes/day**, 100k reads/day | 10 GB-month, 1M Class A / 10M Class B ops per month |
| Good for | App data, joins, transactions | Config, flags, cached API responses, static lookups | Uploads, media, exports, backups |
| Bad for | Huge blobs | Counters, locks, read-after-write, frequently updated data | Queryable data |

Figures dated October 2026 — see `free-tier-limits.md`.

## D1

### Querying

```ts
const { results } = await env.DB
  .prepare("SELECT id, title FROM recipes WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?")
  .bind(ownerId, 20)
  .all();

// Several writes atomically: batch() runs statements in order as one
// transaction — if one fails, the whole batch rolls back.
await env.DB.batch([
  env.DB.prepare("INSERT INTO recipes (id, owner_id, title) VALUES (?, ?, ?)").bind(id, ownerId, title),
  env.DB.prepare("UPDATE owners SET recipe_count = recipe_count + 1 WHERE id = ?").bind(ownerId),
]);
```

- **Always bind parameters** (`?`), never interpolate. Max 100 bound
  parameters per query; 100 KB per statement — chunk bulk inserts.
- Use `batch()` for multi-statement atomicity; don't rely on interactive
  `BEGIN`/`COMMIT` from Worker code (verify current support). `exec()` is for
  maintenance only (no binding, weaker safety).
- **Rows read is what you pay for** (in quota on free): a query returning 10
  rows that scans 100,000 costs 100,000. Index every column you filter or
  sort on, and check `meta.rows_read` in responses and in tests.
- Free plan: 50 queries per Worker invocation (1,000 on paid). N+1 loops hit
  this fast — join or batch.
- **Foreign keys are enforced by default** in D1 (unlike stock SQLite). In a
  migration that rebuilds tables, use `PRAGMA defer_foreign_keys = on;` at
  the start; violations still fail at the end of the transaction.
- SQLite semantics apply — upsert keeps the original PK, `INSERT OR IGNORE`
  hides other constraint errors (→ `sql-development`,
  `sqlite-and-postgres-gotchas.md`).
- Read replication: only used through the Sessions API
  (`env.DB.withSession(...)`); otherwise every query goes to the primary.

### Migrations

- `wrangler d1 migrations create <db> <name>` → `migrations/0001_<name>.sql`.
- `wrangler d1 migrations apply <db> --local` before the first local
  request; `--remote` for production. **Wrangler v4 defaults to local** —
  write the flag every time.
- Applied migrations are tracked **by name** in the `d1_migrations` table
  (configurable via `migrations_table`). Editing an applied file does nothing;
  renaming one makes it run again. Treat applied files as immutable.
- On error, the failing migration is rolled back and earlier ones stay
  applied. Wrangler captures a backup after applying to remote (verify
  retention); take your own export before risky changes:
  `wrangler d1 export <db> --remote --output backup.sql`.
- Order with code: apply backward-compatible migrations **before** deploying
  the code that needs them (expand → deploy → contract). `wrangler rollback`
  rolls code back, never schema.
- Staging and production are separate databases; apply to each, using `-e`.

### Local, preview and production databases

Three ids can exist for one binding: the local simulation, a
`preview_database_id` (used by remote dev) and the production `database_id`.
The deploy summary has been observed printing the preview id; confirm what
the live version is bound to with `wrangler versions view <version-id>` or
the dashboard before concluding "production is empty".

## KV

- `await env.CACHE.get(key, { type: "json", cacheTtl: 300 })`;
  `put(key, value, { expirationTtl })` (minimum TTL 60 s — verify;
  `cacheTtl` minimum 30 s).
- **Eventual consistency**: changes can take 60 s or more to be visible in
  other locations; deletions and "key not found" are cached too. The writing
  location usually sees its own write, but Cloudflare says not to rely on it.
- **1 write per second per key**, and only **1,000 writes/day** on free —
  never use KV as a counter, a rate limiter or a session store with frequent
  updates. Use D1 (or a Durable Object for exact per-key coordination).
- `list()` is paginated with a cursor and is itself eventually consistent.
- Local CLI: `wrangler kv key put/get --binding CACHE ... --local|--remote`
  (local default in v4).

## R2

- Bind with `r2_buckets`; `env.FILES.put(key, body, { httpMetadata })`,
  `get`, `head`, `delete`, `list({ prefix, cursor })`. S3-compatible API for
  external tools with an R2 access key (scoped, stored as a secret).
- **No egress fees** to the internet. Free tier covers Standard storage only
  (not Infrequent Access). Enabling R2 has historically required a payment
  method on file even within the free tier (verify) — say so before
  recommending it on a "no card" project.
- Buckets are private by default. Serve files through a Worker (auth,
  headers) or a custom domain; avoid the `r2.dev` public URL for production
  (rate-limited, development use — verify).
- Uploads from browsers: presigned URLs (S3 API) or a Worker endpoint with
  size/type checks; validate content type by bytes, not extension
  (→ `secure-development`).
