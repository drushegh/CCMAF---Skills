# Run log and summary

The workspace is the record of what a scheduled run did. The owner should be
able to open one file on a phone and know in thirty seconds whether anything
needs them. Everything else is detail for when it does.

## 1. Run folder layout

```text
runs/
  2026-10-12T0900-a3f1/
    summary.md       # written last; the only file most people read
    log.md           # one line per step, append-only during the run
    plan.md          # the item list and caps, written before work starts
    outputs/         # optional: artefacts produced by this run
  index.md           # optional: one line per run, newest first
```

Run ID: local start time to the minute plus a short random suffix
(`2026-10-12T0900-a3f1`). The suffix keeps two runs in the same minute (a
manual run and a scheduled one) apart. Sorting by name sorts by time.

Results that the owner uses day to day (a digest, a report, a briefing) go to
their normal place in the workspace, named in the contract. The run folder
holds the evidence, not the product.

## 2. Log line format

One line per meaningful step, written as it happens (so a crash still leaves
the trail):

```text
09:00:04 START  run=2026-10-12T0900-a3f1 contract=weekly-health budget=15m/25 items
09:00:05 LOCK   acquired
09:00:05 RECOVER previous run 2026-10-05T0900-91bc ok, no partial state
09:00:09 PLAN   18 items (cap 25), 0 backlog
09:00:31 ITEM   disk-space C: ok 41% free
09:01:12 ITEM   event-log system: 3 new errors, see outputs/events.md
09:01:40 SKIP   driver-update: outside grant, proposed in summary
09:02:03 RETRY  feed-fetch attempt 2/3 after timeout
09:02:20 FAIL   feed-fetch: timeout x3, recorded (transient)
09:06:55 WRAP   summary written
09:06:55 UNLOCK
```

Verbs: `START`, `LOCK`, `RECOVER`, `PLAN`, `ITEM`, `SKIP`, `RETRY`, `FAIL`,
`FLAG` (untrusted content or anomaly), `CAP` (budget reached), `WRAP`,
`UNLOCK`. Keep each line under about 120 characters; put detail in
`outputs/`.

Never log secrets, tokens, full message bodies or personal data beyond what
the owner needs to act. Reference the item by ID and subject line.

## 3. Status vocabulary

One status per run, at the top of the summary and in `state.json`:

| Status | Meaning |
|---|---|
| `ok` | Everything in scope done; nothing needs the owner. |
| `ok-needs-you` | Work done; there are proposals or questions for the owner. |
| `partial` | Stopped at a cap or budget; backlog remains; next run continues. |
| `failed` | A persistent error stopped the run; the owner should look. |
| `skipped-locked` | Another run held the lock; nothing done. |
| `nothing-to-do` | No new items. Still a successful run. |

## 4. The summary template

Written last, but it reads first. Lead with what matters to the owner.

```markdown
# Weekly health check — 2026-10-12 09:00 — ok-needs-you

**Needs you (2)**
- Driver update available for the network adapter. Proposed: install via
  winget. Not done (outside grant).
- 3 new system errors from the disk controller since last week. Details:
  outputs/events.md.

**Done**
- Checked 18 items; 16 fine.
- Wrote outputs/health-2026-10-12.md.

**Failed (1, transient)**
- Feed fetch timed out 3 times. Will retry next run.

**Next run**
- Nothing carried over. Backlog: 0.

Run 2026-10-12T0900-a3f1 · 6m 51s · 31 turns · log: log.md
```

Rules:

- The heading carries the status, so a file list or notification preview is
  enough.
- "Needs you" first, and only if non-empty. Each entry says what, why, and
  the proposed action.
- Plain words. No tool names, no stack traces in the summary (they go in
  `log.md` or `outputs/`).
- Short enough for a phone screen without scrolling in the normal case.
- Use the owner's language and units; UK date format if that is the
  workspace's convention, but keep the ISO run ID.

## 5. Index and retention

If the workspace keeps an `index.md`, prepend one line per run:

```text
2026-10-12 09:00  ok-needs-you  2 proposals, 1 transient failure  → 2026-10-12T0900-a3f1/
```

Retention is the owner's choice. A sensible default: keep 30 run folders, or
90 days, whichever is more; never delete run folders that contain a `failed`
or `ok-needs-you` status until the owner has seen them. Pruning old run
folders is itself a delete, so it needs a grant; without one, report "run
history is 214 folders; consider pruning" instead.

## 6. Delivering the summary

The run's job ends with the file. Notifying the owner (a push, an email, a
"Today" panel) belongs to the app or to a separate, explicitly granted step.
A scheduled run that emails its own summary is taking a T3 action; leave that
to tooling the owner configured on purpose.
