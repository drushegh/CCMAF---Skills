# Embeddings and Vector Stores

## Choosing an embedding model

Selection criteria, in the order they actually bite (July 2026 —
providers and rankings churn; re-verify on the providers' model pages
and benchmark on your own corpus):

| Criterion | Why it matters |
|---|---|
| Retrieval quality **on your corpus** | Leaderboard rank (MTEB et al.) is a shortlist filter; domain text, jargon and languages shift results — run your golden set |
| Symmetric vs asymmetric | Many open models (E5/BGE-class) require `query:` / `passage:` instruction prefixes; omitting them silently costs recall |
| Dimensions | Storage and latency scale with them; Matryoshka-trained models allow truncating (e.g. 1024→256) with modest loss — check the model card |
| Max input tokens | Must exceed your chunk size + prepended context, with headroom |
| Multilingual coverage | Cross-lingual corpora need it natively — bolted-on translation degrades quietly |
| Hosting: API vs open-weights | API = zero ops, per-token cost, provider availability risk; open-weights (BGE/E5/GTE class) = your GPU, your latency floor, no data egress |

The embedding model + version is **index schema** (SKILL.md
non-negotiable 4): record it in index metadata, and treat a model change
as a migration (`freshness-and-reindexing.md`), never an in-place swap.

## Distance metrics

Cosine, dot product and Euclidean are equivalent for unit-normalised
vectors. Normalise embeddings on write and query, pick the operator the
index was built for, and stop worrying about it. What *does* matter:
scores are only comparable within one model — never port a similarity
threshold across models, and prefer rank-based logic to absolute
thresholds everywhere.

## ANN indexes

Exact (brute-force) scan is correct and fast enough below roughly 10⁵
vectors — start there and add an ANN index when latency says so, because
every ANN index trades recall for speed:

| Index | Build | Query knobs | Character |
|---|---|---|---|
| HNSW | Slow build, more memory | `ef_search`-class (higher = better recall, slower) | The default choice; graph-based, strong recall/latency curve |
| IVFFlat | Fast build, less memory | `probes` (higher = better recall, slower) | Needs representative data at build time; degrades as data drifts from the training sample |

Two disciplines: (1) **measure ANN recall against exact scan** on your
own queries after building and after major data growth — silent recall
decay is a real failure mode; (2) tune query-time knobs against your
latency budget, don't inherit defaults.

Quantisation (scalar/binary) cuts memory multiples for single-digit
recall loss on most corpora — worth it at scale, verify on your golden
set.

## Filtering interplay

Metadata filters (tenant, ACL, date, collection) interact badly with
naive ANN: post-filtering a top-k result can return fewer than k — or
zero — matches for selective filters. Check how the store handles it
(filtered/pre-filtered search, pgvector 0.8's iterative index scans;
July 2026 — re-verify): selective-filter queries need the store to keep
scanning until k *matching* results are found. ACL filters especially
must be pushed into the query, not applied after retrieval.

## Choosing a store

| Situation | Choice |
|---|---|
| Postgres already in the stack, ≤ low millions of vectors | pgvector — transactional metadata + vectors in one system, one backup story (ops → `sql-development`) |
| Existing Elasticsearch/OpenSearch estate | Its kNN + BM25 in one engine — hybrid retrieval without a second store |
| Dedicated vector workloads, heavy filtered search, horizontal scale | Qdrant / Weaviate / Milvus class |
| No-ops preference, managed budget | Managed services (cloud search offerings, Pinecone class) — check egress, per-query pricing and index portability *before* the corpus lives there |

The boring answer is usually right: the store you already operate, until
measured scale or filtering behaviour forces a dedicated one.

```sql
CREATE TABLE chunks (
    chunk_id      BIGINT PRIMARY KEY,
    document_id   BIGINT NOT NULL,
    section_path  TEXT NOT NULL,
    body          TEXT NOT NULL,
    embedding     VECTOR(1024) NOT NULL,
    acl_tags      TEXT[] NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    content_hash  TEXT NOT NULL
);

CREATE INDEX idx_chunks_embedding ON chunks
USING hnsw (embedding vector_cosine_ops);
```

(pgvector DDL; parse-checked with sqlglot's Postgres dialect. Query with
the operator matching the opclass — `<=>` for cosine distance — and
`ORDER BY ... LIMIT k`.)
