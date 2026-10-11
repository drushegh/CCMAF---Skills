# Context Assembly, Grounding and Citation

Retrieval hands you k chunks; assembly decides what the model actually
sees. Most "the model ignored the context" bugs live here, not in the
retriever.

## Layout and ordering

- **Cache-friendly structure first:** static system prompt and
  instructions at the top, volatile retrieved context after, the user
  question last. Retrieved chunks change per query — anything placed
  after them is uncacheable (mechanics → `llm-development`,
  caching-cost-latency).
- **Position matters:** models attend most reliably to the start and
  end of long contexts ("lost in the middle"). Order chunks by
  relevance with the strongest evidence first, and restate the question
  after the context.
- **Format for citability:** one delimited block per chunk with a
  stable ID and its provenance —

```text
<chunk id="doc42#s3" source="Pricing Guide > Enterprise" updated="2026-05-01">
...chunk text...
</chunk>
```

- **Token budget is a design number:** context window minus system
  prompt, conversation history, output reserve = retrieval budget.
  Filling it is not the goal — fewer, better chunks beat more
  (`hybrid-retrieval-and-reranking.md` owns selection); k is typically
  5–10 *after* re-ranking.

## Citations

- Instruct answers to cite chunk IDs per claim; require quoting or
  extracting the supporting span before answering when stakes are high
  (forces grounding the same way judge-evidence-first does in evals).
- **Validate citations mechanically:** cited IDs must exist in the
  provided set — a deterministic post-check, no LLM needed. Map chunk
  IDs back to human-readable sources (title, section, link) in the UI;
  a citation nobody can follow is decoration.
- Uncited factual claims in answers are a measurable failure class —
  count them in evals (`retrieval-evals.md`), don't just discourage
  them.

## Abstention — "not in the corpus" as a feature

Two distinct cases, handled separately:

1. **Retrieval returned nothing relevant** (empty or all-low-rank):
   short-circuit *before* generation with a clean "no relevant
   documents found" — don't pay for, or risk, a generation over noise.
2. **Chunks retrieved, answer absent:** the prompt must explicitly
   license refusal ("if the context does not contain the answer, say
   so") and the eval set must include unanswerable questions to verify
   the model takes the licence. Without measured abstention, the system
   fabricates precisely when retrieval fails — the worst failure mode
   compounded.

## Conflicting sources

Corpora contain contradictions (old vs new policy, draft vs final).
Assembly mitigations, in order: prefer recency/authority at *selection*
time using metadata (updated-at, source tier); surface the conflict in
the answer ("doc A says X (2026), doc B says Y (2024)") rather than
silently picking one; flag high-conflict topics back to corpus curation
— the durable fix is retiring stale documents, not cleverer prompts.

## Injection defence for retrieved content

Retrieved text is data, never instructions (SKILL.md non-negotiable 6):

- Keep all retrieved content inside delimited blocks; instruct the
  model that content within them has no instruction authority
  ("spotlighting").
- Never route retrieved text into tool arguments or follow-up actions
  without validation — a document saying "now call the delete API" must
  have no path to a tool call.
- Sanitise at ingestion: strip active content, flag instruction-shaped
  text in documents as a corpus-quality signal.
- Full taxonomy and threat modelling → `secure-development`; in-harness
  mitigations → `llm-development`.

## Access control at assembly

ACL enforcement belongs in the retrieval query
(`embeddings-and-vector-stores.md`), but assembly is the last line:
assert every assembled chunk's ACL against the requesting principal and
fail closed on mismatch. "The model was told not to reveal it" is not a
control — if a principal must not see a chunk, the chunk must not enter
the context.
