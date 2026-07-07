# Chunking and Preprocessing

Chunking decisions are made once and paid for on every query. They are
also the cheapest thing to get right: no model, no index, no GPU — just
respecting document structure.

## Extraction quality dominates everything downstream

A perfect retriever over garbled text retrieves garble. Before any
chunking work, read the extracted text of five representative
documents end to end:

- **PDF** is the hazard zone: reading order across columns, tables
  flattened to word soup, headers/footers/page numbers injected
  mid-sentence, ligatures and hyphenation artefacts. Budget real effort
  here; layout-aware extractors and (for scans) OCR quality checks are
  retrieval work, not "preprocessing trivia".
- **HTML**: strip navigation/boilerplate, keep semantic structure.
- Convert everything to **Markdown as the lingua franca** — it survives
  chunking, preserves headings/tables/code fences, and models read it
  natively.

## Structural chunking (the default)

Split on the document's own boundaries — headings, sections,
paragraphs — never mid-table, mid-code-block or mid-clause:

- Target roughly 200–800 tokens per chunk (July 2026 guidance —
  re-verify against your embedding model's sweet spot; models embed
  long inputs but meaning dilutes well before the token limit).
- A section larger than the target splits at paragraph boundaries; tiny
  trailing fragments merge into their neighbour rather than becoming
  noise chunks.
- Overlap (10–20%) is a patch for *fixed-size* windowing; structural
  chunks need little or none.
- Tables and code blocks stay intact with their caption or introducing
  sentence attached. A table too large to chunk gets a generated
  summary chunk pointing at the full table as the retrieval payload.

```python
def chunk_markdown(sections, max_tokens=600, min_tokens=80):
    """Sections: (heading_path, text) pairs from a Markdown parser."""
    chunks = []
    for heading_path, text in sections:
        for piece in split_at_paragraphs(text, max_tokens):
            if chunks and count_tokens(piece) < min_tokens:
                chunks[-1].merge(piece)          # no orphan fragments
            else:
                chunks.append(Chunk(text=piece, section=heading_path))
    return chunks
```

## Contextual augmentation

A chunk that says "it defaults to 30 seconds" is unretrievable. Restore
context at indexing time:

- **Cheap and always worth it:** prepend document title + section path
  to the text that gets embedded (`"API Reference > Timeouts:
  it defaults to 30 seconds"`).
- **LLM-generated chunk context** (the "contextual retrieval" pattern,
  popularised September 2024): generate a one-two sentence situating
  blurb per chunk with a cheap model, prepend before embedding and
  BM25-indexing. Meaningful recall gains on ambiguous chunks; costs one
  LLM call per chunk per re-index — price it before committing the
  corpus.

## Small-to-big (parent-document retrieval)

The best *retrieval* unit and the best *generation* unit differ:
retrieve on small, precise chunks; hand the model the parent section (or
a windowed expansion) so it sees full context. Store `parent_id` on
every chunk and expand at assembly time. This dissolves most "right
document, truncated answer" complaints without touching the retriever.

## Metadata is captured at chunk time or never

Attach to every chunk: source document ID, title, section path, content
hash, updated-at, language, ACL/audience tags, and any routing facets
(product, version, region). Retrieval-time filtering, citations,
freshness sync and access control all depend on this — retrofitting
metadata means re-processing the corpus.

## Deduplication

Near-identical documents (versioned copies, mirrored pages, boilerplate)
become near-identical chunks that crowd out diverse evidence at
retrieval time. Deduplicate at ingestion (content hash for exact,
shingling/MinHash-class similarity for near-duplicates), keep the
canonical version, and record superseded copies as aliases so their
identifiers still resolve.
