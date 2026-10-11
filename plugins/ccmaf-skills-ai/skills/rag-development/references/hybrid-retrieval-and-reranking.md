# Hybrid Retrieval, Query Handling and Re-ranking

## Why lexical search still carries half the load

Embeddings encode meaning; they are poor at *exactness*. Queries
containing part numbers, error codes, API names, people, negation or
rare domain terms retrieve better lexically — and those are
disproportionately the queries users type when something is broken.
BM25 (the standard lexical ranking function: term frequency saturated,
scaled by inverse document frequency, normalised by document length)
needs no training, no re-embedding on corpus changes, and explains its
results. Vector-only RAG systems fail their first "what does error
E4021 mean" query; hybrid is the default, not the upgrade.

Mind the tokenisation: the lexical leg's analyser decides whether
`vector_cosine_ops` or `E-4021` survives as a searchable term — test the
identifiers your users actually query.

## Fusion

Lexical and vector scores live on incomparable scales; don't average
them. **Reciprocal Rank Fusion (RRF)** fuses by rank alone and is the
robust baseline:

```python
def rrf(rankings, k=60):
    """rankings: list of ranked lists of chunk IDs."""
    scores = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

Weighted score fusion can edge out RRF but needs score normalisation
and re-tuning whenever either leg changes; earn that maintenance with
eval evidence first (`retrieval-evals.md`).

## Query handling before retrieval

- **Conversational rewriting is mandatory in chat:** "does it support
  SSO?" retrieves nothing — rewrite with dialogue context into a
  standalone query ("does <product under discussion> support single
  sign-on") before embedding. This is the single highest-leverage fix
  for multi-turn RAG.
- **Decomposition:** comparative/multi-part questions ("X vs Y pricing")
  retrieve better as sub-queries, results fused or answered per part.
- **Multi-query expansion:** several paraphrases, union the results —
  cheap recall for ambiguous phrasing.
- **HyDE** (embed a hypothetical generated answer instead of the
  query): occasionally rescues hard corpora; costs an LLM call per
  query — measure before adopting.

Each adds latency and cost per query. Adopt in the order listed, and
only past a measured gap.

## Re-ranking

First-stage retrieval optimises recall at k=50–200 cheaply; a
**re-ranker** then buys precision at k=5–10 by scoring each
query–candidate pair jointly:

- **Cross-encoders** (hosted re-rank APIs, open-weights BGE-reranker
  class; July 2026 — re-verify the current options) — the standard
  choice: substantial precision gains, tens of milliseconds per
  candidate batch.
- **LLM-as-re-ranker** (listwise prompting) — strongest and most
  expensive; a fallback for low-volume, high-stakes retrieval, not a
  default.

Budget rule: retrieve wide (recall problem, cheap stage), re-rank
narrow (precision problem, expensive stage). If recall@100 is bad, a
re-ranker has nothing to work with — fix retrieval first.

## Diversity and dedupe at selection

Top-k by score alone returns five paraphrases of the same paragraph.
Apply near-duplicate suppression and diversity selection (MMR-style:
balance relevance against similarity to already-selected chunks), and
cap chunks-per-document so one long document can't monopolise the
context.

## Multi-hop, agentic and graph retrieval

- **Agentic retrieval** (the model searches, reads, reformulates,
  searches again) genuinely helps questions whose answers span
  documents ("which customers are affected by the bug fixed in 4.2") —
  at multiples of the latency and cost. Wire the loop per
  `llm-development` (tool use); this skill owns the search tools it
  calls.
- **Graph-RAG** (entity/relationship extraction into a knowledge graph,
  retrieval over it) is justified when *relationships are the
  question* (org charts, dependencies, lineage) — not as a general
  upgrade; the extraction pipeline becomes its own maintenance burden.

Escalation path, evidence-gated at every step: hybrid + RRF → + query
rewriting → + re-ranker → + multi-query/decomposition → agentic →
graph. Most systems should stop at step three.
