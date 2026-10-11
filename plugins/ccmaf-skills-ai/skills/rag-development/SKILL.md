---
name: rag-development
description: >-
  Retrieval-augmented generation as an engineering discipline: chunking
  strategies, embedding selection and versioning, vector stores (pgvector,
  dedicated engines) and ANN indexes, hybrid retrieval (BM25 + vector,
  reciprocal rank fusion), re-ranking, query rewriting, context assembly and
  token budgeting, grounding and citation, abstention, freshness and
  re-indexing, and retrieval evaluation (recall@k, precision, nDCG,
  faithfulness). Use whenever a system retrieves documents to ground LLM
  answers — even if the user says "chat with our docs", "semantic search",
  "knowledge base bot" or "the answers are wrong". Triggers include:
  embeddings code, vector store schemas or queries, chunking logic,
  retriever/re-ranker configuration, hallucinated or uncited answers, "it
  can't find X", RAG eval requests, and corpus update or re-indexing
  pipelines. PROACTIVELY activate before designing any retrieval pipeline
  or debugging answer quality in a RAG system.
---

# RAG Development

Standards for building retrieval-augmented generation systems — the
retrieval layer that `llm-development` deliberately leaves to this
skill. The defining property of the domain: **answer quality is bounded
by retrieval quality**. The generator cannot cite what the retriever
never returned, so the retrieval layer is engineered and measured as its
own component — with its own evals — before any prompt is touched.

Version context (July 2026 — fast-moving, re-verify): pgvector 0.8.x is
current (HNSW default, iterative index scans for filtered queries).
Embedding models and re-rankers churn quarterly; treat MTEB-style
leaderboards as shortlist generators, never verdicts, and benchmark on
your own corpus.

## Non-negotiables

1. **Retrieval is measured before generation.** A golden query set with
   labelled relevant documents, and recall@k/nDCG against it, exists
   before anyone edits a prompt because "the answers are wrong".
2. **Hybrid retrieval is the default.** Lexical (BM25) + vector
   similarity, fused (RRF as the baseline). Vector-only search fails on
   exact identifiers, error codes, names and negation — the queries
   users actually type.
3. **Chunk along document structure.** Headings, sections, whole tables
   and code blocks — fixed-size windows only as fallback for
   structureless text. Every chunk carries provenance metadata: source
   ID, section path, updated-at, ACL.
4. **The embedding model version is part of the index schema.** One
   index = one model + version; mixed embeddings in one index are a
   defect. Every model upgrade needs a re-embedding migration plan.
5. **Grounding is enforced, not hoped.** Answers cite retrieved chunk
   IDs; cited IDs are validated mechanically; "not in the corpus" is a
   first-class, *tested* answer path, not an embarrassment.
6. **Retrieved content is untrusted input.** The corpus is an injection
   surface — a poisoned document is a prompt injection with a citation.
   Delimit it, strip its authority, never derive tool permissions from
   it (taxonomy → `secure-development`).
7. **Access control is enforced in the retriever** — metadata filters at
   query time — never by handing the model restricted content and hoping
   it stays quiet.
8. **Log to replay:** original query, rewritten query, retrieved IDs
   with scores, assembled context, cited chunks. A retrieval bug without
   this log is unreproducible.

## Decision tables

| Need | Use |
|---|---|
| Corpus fits comfortably in context and rarely changes | No RAG — put it in the (cached) prompt; RAG earns its complexity at scale and freshness |
| Postgres already in the stack, up to low-millions of vectors | pgvector with HNSW — one fewer system to run (ops → `sql-development`) |
| Heavy filtering, larger scale, dedicated workloads | Dedicated engine (Qdrant, Weaviate, Milvus) or the search stack you already run (OpenSearch/Elasticsearch kNN) |
| Recall fine at k=50, junk at k=5 | Add a cross-encoder re-ranker over the wider candidate set |
| Multi-part or comparative questions | Query decomposition / multi-query retrieval — before graph or agentic complexity |
| Exact lookups (SKUs, codes, names) failing | Fix the lexical leg and its tokenisation first, not the embeddings |
| Right document, wrong or truncated passage | Small-to-big: retrieve on small chunks, expand to the parent section for the model |
| Corpus updates continuously | Incremental upserts + content-hash change detection + scheduled reconciliation |

| Symptom | First check |
|---|---|
| Misses content known to exist | Measure recall on that query; then chunk boundaries and the lexical leg — not the prompt |
| Fluent, confident, wrong | Was the answer in the retrieved context at all? Then faithfulness eval and assembly order |
| Near-duplicate chunks crowd the context | Dedupe/diversity (MMR) at assembly; near-duplicate documents at ingestion |
| Great in eval, degrades in production | Circular eval queries (generated from the chunks); query-distribution drift; index staleness |
| Restricted content in answers | ACL filter applied at query time? Post-filtering after retrieval leaks via scores and citations too |
| "Scores seem low" | Similarity scores are model-relative, not calibrated probabilities — compare ranks; never port a threshold across models |

## High-frequency pitfalls

- Evaluating with questions generated from the chunks themselves —
  circular, inflates recall; keep synthetic data separate from the
  reporting set (`references/retrieval-evals.md`).
- Splitting tables, code blocks or legal clauses mid-structure — the
  retrieved fragment is unanswerable even when retrieval "worked".
- Raising k as a quality dial: more chunks dilute the context and bury
  the evidence — widen the *candidate* set for the re-ranker instead.
- Asymmetric embedding models used without their query/document
  prefixes (E5-style `query:` / `passage:`) — silent recall loss.
- Deletes that never reach the index: stale chunks with valid-looking
  citations, and revoked documents still answerable.
- ANN parameters left on defaults and never measured — HNSW
  `ef_search`-class knobs trade recall for latency and defaults suit
  neither.
- One "chat with everything" index where per-collection routing (HR vs
  product docs vs code) would beat it on every metric.

## Workflow

1. Build the golden query set first: 50+ real questions with labelled
   relevant sources.
2. Baseline: structural chunking, hybrid retrieval with RRF, sensible k.
3. Measure retrieval (recall@k, nDCG). Iterate chunking and query
   handling until retrieval stops being the binding constraint.
4. Add re-ranking if precision at low k is the remaining gap.
5. Engineer context assembly and citations; measure faithfulness and
   answer quality end-to-end (grader mechanics → `llm-development`).
6. Ship with replay logging, index versioning and a freshness pipeline;
   feed production failures back into the golden set.

## Reference index

- `references/chunking-and-preprocessing.md` — extraction, structural chunking, contextual augmentation, metadata
- `references/embeddings-and-vector-stores.md` — model selection, ANN indexes, store choice, index versioning
- `references/hybrid-retrieval-and-reranking.md` — BM25 + vector fusion, query rewriting, re-rankers, multi-hop
- `references/context-assembly-and-citation.md` — ordering, token budgets, citations, abstention, injection defence
- `references/retrieval-evals.md` — golden sets, recall/nDCG, faithfulness, regression CI
- `references/freshness-and-reindexing.md` — upserts, deletes, re-embedding migrations, drift

## Boundaries

- **The model and agent layer** — Claude API mechanics, tool use, agent
  loops, prompt engineering discipline, prompt caching, eval grader
  mechanics (LLM-as-judge, golden-set statistics) → `llm-development`;
  this skill owns the retrieval layer and retrieval-specific evaluation.
- **Prompt-injection taxonomy, secrets, supply chain** →
  `secure-development`; this skill owns the retrieval-side mitigations
  (corpus hygiene, ACL filtering, context delimiting).
- **Postgres and pgvector operations** — indexing, tuning, migrations →
  `sql-development`.
- **Bulk ingestion pipelines** feeding the index at data-platform
  scale → `data-engineering-development`.
- **Corpus acquisition from the web** — crawling, robots.txt,
  legality → `web-scraping-development`.
- **Python idioms and testing** → `python-development`.
