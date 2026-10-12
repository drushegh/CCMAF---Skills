# Free vs Paid limits (checked October 2026 — re-verify before quoting)

Sources: developers.cloudflare.com — Workers *Platform > Limits*, D1
*Platform > Limits* and *Pricing*, KV *Platform > Limits*, R2 *Pricing*,
Pages *Platform > Limits*. Limits change; record the date you checked in any
design doc that depends on them (→ `read-the-damn-docs`).

The paid tier is **optional**: the Workers Paid plan has a monthly minimum
plus usage (check the current price). Recommend it only when a design
genuinely cannot fit the free limits, and say which limit forces it.

## Workers

| Limit | Free | Paid |
|---|---|---|
| Requests | 100,000/day (resets 00:00 UTC) | No daily limit (usage billed) |
| CPU time per request | 10 ms | Up to 5 min (default 30 s) |
| Memory per isolate | 128 MB | 128 MB |
| Subrequests per request | 50 | 10,000 |
| Simultaneous open connections per request | 6 | 6 |
| Worker size (uncompressed) | 64 MiB | 64 MiB |
| Startup time | 1 s | 1 s |
| Workers per account | 100 | 500 |
| Env vars per Worker | 64 (5 KB each) | 128 |
| Cron Triggers per account | 5 | 250 |
| Static asset files per version | 20,000 | 100,000 |
| Static asset file size | 25 MiB | 25 MiB |

CPU time is time on the CPU, not wall-clock time waiting on `fetch` or D1 —
I/O-heavy Workers fit 10 ms more often than expected; JSON parsing of large
payloads, crypto and image work do not.

Over the daily request cap, Workers on the free plan return an error page
(error 1027 — verify) unless the route is configured to fail open; plan
for it on public sites.

## D1

| Limit | Free | Paid |
|---|---|---|
| Rows read | 5 million/day | Usage billed |
| Rows written | 100,000/day | Usage billed |
| Databases per account | 10 | 50,000 |
| Max database size | 500 MB | 10 GB |
| Storage per account | 5 GB | 1 TB |
| Queries per Worker invocation | 50 | 1,000 |
| Bound parameters per query | 100 | 100 |
| SQL statement length | 100 KB | 100 KB |

Over a daily cap, D1 returns errors until 00:00 UTC; at the storage cap,
inserts fail until data is deleted.

## KV

| Limit | Free | Paid |
|---|---|---|
| Reads | 100,000/day | Unlimited (billed) |
| Writes (different keys) | 1,000/day | Unlimited (billed) |
| Writes to the same key | 1/second | 1/second |
| Storage | 1 GB | Unlimited (billed) |
| Value size | 25 MiB | 25 MiB |
| Key size / metadata | 512 B / 1,024 B | same |
| Operations per invocation | 1,000 | 1,000 |

## R2 (monthly free allowance)

| Item | Free |
|---|---|
| Storage (Standard class only) | 10 GB-month |
| Class A operations (writes, lists) | 1 million |
| Class B operations (reads) | 10 million |
| Egress to the internet | Free |

Payment method on file may be required to enable R2 (verify).

## Pages

| Limit | Free |
|---|---|
| Builds | 500/month, 1 concurrent per account, 20 min timeout |
| Files per site | 20,000 |
| File size | 25 MiB |
| Custom domains | 100 per project |
| `_redirects` | 2,000 static + 100 dynamic |
| `_headers` | 100 rules, 2,000 chars per line |
| Preview deployments | Unlimited |

Pages Functions requests are billed as Workers requests (verify).

## Designing to fit

- **Cache aggressively** — Cache API / `cacheTtl` on KV reads / static
  assets — so repeated reads never reach D1.
- **Index for scans**: D1 counts rows *read*; one unindexed query on a
  50k-row table every request exhausts 5M reads in 100 requests.
- **Batch writes** and avoid write-amplifying patterns (per-view counters in
  KV burn 1,000 writes in minutes).
- **Move heavy compute out of the request** — precompute at build time,
  in a cron job working in chunks, or on a machine you own.
- Load tests against a free account will hit the caps; test locally or on a
  throwaway account, and warn before running one.
