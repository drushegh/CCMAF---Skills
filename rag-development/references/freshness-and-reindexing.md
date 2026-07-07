# Freshness, Re-indexing and Index Lifecycle

An index is a materialised view of the corpus, and it goes stale the
moment it's built. Freshness is an SLO you declare and engineer — "docs
changes are searchable within N hours" — not an aspiration.

## Incremental sync

Full rebuilds on every change don't survive contact with a real corpus;
the steady state is incremental:

- **Change detection by content hash:** store a hash per chunk
  (captured at chunk time — `chunking-and-preprocessing.md`); on each
  sync, re-chunk changed documents, upsert chunks whose hash changed,
  delete chunks that disappeared. Unchanged chunks are not re-embedded —
  that is where the cost lives.
- **Event-driven where the source offers it** (webhooks, CDC feeds),
  **scan-based where it doesn't** — and *always* a scheduled full
  reconciliation scan underneath the events, because missed webhooks
  are a when, not an if.
- Sync jobs are pipelines: idempotent, logged, monitored for lag
  against the freshness SLO (the engineering discipline is
  `data-engineering-development`; at document scale a simple scheduled
  job in this repo's stack is fine).

## Deletes are load-bearing

The under-engineered half of sync, and the half with legal teeth:

- A deleted or access-revoked source document must tombstone its chunks
  within the freshness SLO — otherwise the system answers from content
  that officially no longer exists, with a confident citation to it.
- Erasure requests (GDPR right-to-be-forgotten class) extend to derived
  data: chunks, embeddings, caches and eval fixtures that embed the
  content. Design the delete path day one; verify it with a test that
  plants, deletes and re-queries a document.
- Prefer hard deletes in the index; where the store soft-deletes,
  ensure filters exclude tombstones by default, not by convention.

## Re-embedding migrations (model or chunker upgrades)

Embeddings from different models are incomparable — an in-place gradual
swap silently breaks ranking. Treat the upgrade as a blue/green
migration:

1. **Price it first:** corpus tokens × embedding cost, plus rebuild
   time. This number decides whether the upgrade is worth it at all.
2. Build the new index (new model/chunker) alongside the old; dual-write
   incoming updates to both during the transition.
3. Run the full retrieval eval suite (`retrieval-evals.md`) against
   both — same golden set, same k. The new stack must win, not tie:
   migrations have risk, ties don't pay for it.
4. Cut over behind a flag, keep the old index warm for fast rollback,
   then decommission on a timer.

Record in index metadata: embedding model + version, chunker version,
build time, source snapshot. An index you can't describe is an index
you can't reproduce.

## Drift monitoring

Quality decays without any code change:

- **Query drift:** production queries move away from the golden set
  (new product areas, new jargon). Sample and review; refresh the eval
  set on a cadence.
- **Corpus drift:** growth changes IVF-class index quality
  (`embeddings-and-vector-stores.md`) and shifts score distributions —
  another reason rank-based logic beats absolute thresholds.
- **Signals worth alerting on:** no-result rate, abstention rate,
  retrieval score distribution shift, sync lag vs SLO, and index size
  vs source-document count diverging (a delete-path failure signature).

## Caching interplay

Retrieval caches (query → results) and prompt caches holding assembled
context both serve stale data after a sync. Key retrieval caches by
index version so a re-index invalidates them wholesale; keep TTLs at or
below the freshness SLO. A correct index behind a stale cache still
answers wrongly — end-to-end freshness is what the SLO means.
