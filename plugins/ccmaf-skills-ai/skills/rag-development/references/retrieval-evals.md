# Retrieval Evaluation

RAG has two failure surfaces — retrieval and generation — and one
useless composite signal ("the answer felt wrong"). Measure the layers
separately: retrieval metrics are cheap, deterministic and runnable in
CI; generation metrics need graders. Grader *mechanics* (LLM-as-judge
calibration, statistical honesty, golden-set discipline) are owned by
`llm-development` (evals); this file covers what is retrieval-specific.

## Retrieval metrics

Against a golden set of (query → labelled relevant documents/chunks):

| Metric | One line | Use for |
|---|---|---|
| Recall@k | Fraction of relevant items in the top k | The primary gate — the generator can't use what isn't there |
| Precision@k | Fraction of the top k that is relevant | Context-quality pressure; what re-rankers improve |
| MRR | 1/rank of the first relevant hit, averaged | Single-answer lookups |
| nDCG@k | Rank-and-grade-weighted relevance | Graded labels, multiple relevant docs — the most informative single number |
| Hit rate@k | Any relevant item in top k (binary) | Coarse smoke signal on small sets |

Practical bar: track recall at the k you *assemble* (5–10) **and** at
the k you feed the re-ranker (50–100). The gap between them tells you
whether to fix first-stage retrieval or the re-ranker.

## Building the golden set

- **Source queries from reality:** query logs, support tickets, SME
  interviews — not from re-reading the corpus. Real queries are
  shorter, vaguer and more misspelt than anything you'd invent.
- **Label relevance** per query against documents/chunks, graded
  (relevant / partially / not) if you can afford it — that unlocks nDCG.
  Labelling is the expensive part; 50 well-labelled queries beat 500
  guessed ones.
- **The circularity trap:** generating eval questions *from the chunks*
  produces questions whose vocabulary matches their answer chunk —
  recall looks superb and means nothing. Synthetic questions are
  acceptable for *smoke coverage* if generated from whole documents,
  human-filtered, and reported separately from the real-query set —
  never as the headline number.
- Include the hard classes deliberately: unanswerable questions (for
  abstention), multi-document questions, exact-identifier lookups,
  ambiguous phrasing, and every production failure you triage (the
  regression suite writes itself).

## Generation-layer metrics (RAG-specific)

- **Faithfulness/groundedness:** decompose the answer into atomic
  claims; verify each against the retrieved context (judge with
  evidence-quoting, per `llm-development`). The RAG-defining metric —
  it catches fluent fabrication sitting on top of good retrieval.
- **Answer relevance:** does the answer address the question (distinct
  from being true).
- **Citation validity:** deterministic — cited IDs exist in the
  provided set; and citation *support* — the cited chunk actually
  supports the claim (judged).
- **Abstention accuracy:** correct refusal rate on unanswerable
  questions, and false-refusal rate on answerable ones — report both,
  they trade off.

Framework suites (RAGAS-class) implement these as prompted judges:
useful scaffolding, but calibrate against a human-labelled sample
before trusting the numbers, and re-calibrate when the judge model
changes.

## Ablation discipline

Change one component per experiment — chunking, embedding model, fusion
weights, re-ranker, k — and evaluate at the *retrieval* layer where the
metrics are deterministic and cheap. End-to-end answer evals confirm
the winner; they are too noisy and expensive to steer component search.
Keep a run ledger (component versions × metrics); memory is not an
experiment tracker.

## CI and production

- Retrieval evals run on every change to chunking, embeddings, index
  config or retrieval logic — they're deterministic given a frozen
  index, so treat regressions as build failures. Version the eval
  *index* alongside the set: rebuilding the index shifts results even
  with identical code.
- Sample production queries continuously: judge-score a slice for
  faithfulness, monitor abstention rate, no-result rate, and citation
  click-through/user feedback where the product surfaces them. Rising
  abstention with stable recall points at corpus gaps, not retriever
  bugs — route to content owners, not engineering.
- Feed every triaged production miss into the golden set with its
  correct label. The eval set is a living asset; its growth rate is a
  health metric of its own.
