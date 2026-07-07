# PyTorch fundamentals

Deep learning earns its cost where representation learning wins — vision,
audio, text, sequences — and almost always starts from a **pretrained
model fine-tuned** on your data, not from scratch. The engineering
discipline is the same as tabular (splits, leakage, tracked experiments);
what changes is the failure surface: silent shape bugs, broken training
loops, and runs that burn a GPU-day to reproduce a typo.

## Loop anatomy

The canonical shape — the bugs live in the steps people forget:

```python
import torch
from torch import nn

def train_epoch(model, loader, optimiser, loss_fn, device):
    model.train()                          # dropout/batch-norm into train mode
    total = 0.0
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        optimiser.zero_grad()              # forget this and gradients accumulate
        loss = loss_fn(model(xb), yb)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimiser.step()
        total += loss.item() * xb.size(0)  # .item() — keeping tensors leaks graph memory
    return total / len(loader.dataset)

@torch.no_grad()                           # eval never builds a graph
def evaluate(model, loader, loss_fn, device):
    model.eval()                           # dropout off, batch-norm frozen
    total = 0.0
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        total += loss_fn(model(xb), yb).item() * xb.size(0)
    return total / len(loader.dataset)
```

- **Datasets/DataLoaders**: transforms that *learn* (normalisation stats,
  vocabularies) are fitted on training data only — the same leakage rule
  as tabular. `num_workers > 0` and `pin_memory=True` for GPU input
  pipelines; profile before assuming the GPU is the bottleneck.
- **Checkpoint on validation**: save `state_dict`s (model + optimiser +
  scheduler + epoch), keep best-on-validation separate from
  latest-for-resume. Save `state_dict`, not the pickled module — pickles
  couple to code layout and are an unsafe load surface.

## Sanity checks before any long run

1. **Overfit one batch.** A model that cannot drive loss to ~zero on 32
   examples has a bug (shapes, loss wiring, labels), not a capacity
   problem. This one check catches most broken pipelines.
2. **Loss at initialisation is calculable** — for balanced n-class
   cross-entropy, ≈ ln(n). Materially different means broken outputs or
   labels.
3. **One batch end-to-end**: print shapes and dtypes at each stage;
   confirm labels align with inputs after every augmentation/shuffle.
4. **Watch the first 100 steps** before walking away: loss NaN/exploding
   (learning rate, missing clip), loss flat (LR too low, frozen layers,
   dead outputs), val diverging from train immediately (leakage or split
   bug).

## The knobs that matter

- **Learning rate dominates.** Find a working LR (short sweep over
  decades: 1e-4 → 1e-1), then add a schedule — warmup + cosine decay is
  the boring default; `ReduceLROnPlateau` when epochs are expensive.
- **Fine-tuning**: lower LR for pretrained backbones than for fresh
  heads (often 10×); freeze the backbone for a first epoch when data is
  scarce.
- **Mixed precision** (`torch.autocast` + `GradScaler`) is near-free
  speed on modern GPUs — on by default for training.
- **`torch.compile`** (PyTorch 2.x — July 2026, re-verify) is worth
  trying once the loop is correct; never while debugging.
- **Batch size** trades throughput against generalisation and memory;
  scale LR when you scale batch size materially.
- **Early stopping + patience** on the validation metric, exactly as with
  boosting: epochs are hyperparameters, not achievements.

## Reproducibility and determinism

- Seed everything once, at entry: `torch.manual_seed`, plus Python's
  `random` and NumPy; seed DataLoader workers.
- Full bitwise determinism
  (`torch.use_deterministic_algorithms(True)`) costs speed and forbids
  some ops — use it when chasing a discrepancy, not by default. Instead:
  accept run-to-run noise, and **report the seed variance** across ≥3
  seeds for any headline metric (`evaluation-and-error-analysis.md`).
- A tracked run records: seed, code SHA, data version, full config,
  environment (`tracking-and-production.md`) — GPU-days are too expensive
  to lose to "which config was that?".

## When it still won't learn

Work the checklist in order — data first, model last: label quality and
alignment; input normalisation; a leakage/shortcut audit (is the model
reading a watermark?); then capacity/architecture. A code-shaped bug
(silent broadcasting, wrong reduction) routes to `systematic-debugging` —
minimise, isolate, bisect the change that broke a previously-learning run.
