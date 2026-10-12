# Models, Assets and Environment Management

## Model types and where they live

ComfyUI loads weights from `ComfyUI/models/<subfolder>/`. The ones you'll
handle:

| Subfolder | Holds |
|-----------|-------|
| `checkpoints` | full models (UNet+CLIP+VAE bundled) — SD1.5/SDXL/SD3 etc. |
| `diffusion_models` / `unet` | bare diffusion models (e.g. Flux) loaded with separate CLIP/VAE |
| `clip` / `text_encoders` | text encoders (CLIP-L/G, T5) for split models |
| `vae` | standalone VAEs |
| `loras` | LoRA / LyCORIS adapters |
| `controlnet` | ControlNet models |
| `upscale_models` | ESRGAN-family upscalers |
| `embeddings` | textual-inversion embeddings (used as `embedding:name`) |
| `clip_vision`, `ipadapter`, `style_models` | IP-Adapter / vision conditioning |

Files are typically `.safetensors` (prefer over `.ckpt` — pickles can
execute code on load; another supply-chain reason to use safetensors).

## Sharing models across installs — extra_model_paths.yaml

Don't duplicate large weights. Copy `extra_model_paths.yaml.example` to
`extra_model_paths.yaml` and point ComfyUI at an existing model library
(e.g. an A1111 install or a shared drive):

```yaml
my_models:
  base_path: D:/ai/models/
  checkpoints: checkpoints/
  loras: loras/
  vae: vae/
```

## Check the repo layout before downloading

Many Hugging Face mirrors publish models in **diffusers format**:
separate `unet/` (or `transformer/`), `vae/` and `text_encoder/`
folders with a `model_index.json`. `Load Checkpoint`
(`CheckpointLoaderSimple`) needs one bundled `.safetensors` file. Before
pulling gigabytes, list the files:
`curl -s https://huggingface.co/api/models/<owner>/<repo>` and look at
`siblings[].rfilename` for a root-level `.safetensors`. If there is
only a split layout, find the single-file ("ComfyUI" / "all-in-one")
release, or load the parts with the separate diffusion-model, CLIP and
VAE loaders into the matching `models/` subfolders.

## Tooling

- **comfy-cli** — the official CLI: `comfy install` (set up ComfyUI),
  `comfy model download`, `comfy node install/registry`, `comfy launch`.
  The cleanest scriptable/CI path.
- **ComfyUI-Manager** — in-UI install of custom nodes and models, with a
  "missing nodes" resolver for imported workflows. Convenient, and the
  main vector for running untrusted code — vet before installing
  (`mcp-and-deployment.md`, `secure-development`).
- **Comfy Registry** (registry.comfy.org) — the package index custom
  nodes publish to; Manager and comfy-cli install from it.

## Model licensing — verify before commercial use

This is a real obligation, not housekeeping. Weights carry licences that
the *images you generate* may inherit or be restricted by:

- **CreativeML OpenRAIL-M** (many SD checkpoints) — permissive with
  use-based restrictions.
- **Flux** — `schnell` is Apache-2.0; **`dev` is non-commercial** unless
  you hold a commercial licence from Black Forest Labs.
- **Civitai / community checkpoints & LoRAs** — bespoke, varied terms;
  some forbid commercial use, model merging, or selling outputs.

Before delivering generated assets commercially, confirm the licence of
**every** weight in the graph (base model, each LoRA, ControlNet) and
record it. When unsure, flag it rather than assuming — for client
work this is the difference between a usable asset and a liability.

## Practical environment notes

- VRAM is the binding constraint; quantised (fp8/GGUF) variants trade
  quality for fitting on smaller GPUs. ComfyUI offloads to CPU/RAM when
  short, at a speed cost.
- **Slow or inconsistent renders are often disk and RAM, not GPU.**
  When system RAM is tight, models are evicted and re-read from disk
  on each run or each switch. From a slow HDD or network share, that
  reload dwarfs sampling time. Keep the model library on local NVMe
  (point `extra_model_paths.yaml` at it), keep enough free RAM for the
  working set, and avoid switching checkpoints between queued jobs.
  Recent builds also offer `--fast-disk` for disk-backed offload on
  fast NVMe (verify on your build). Time the first run after launch
  separately from warm runs before blaming the sampler or GPU.
- **Video on about 12 GB VRAM:** feasible families include
  LTX-Video, SVD, AnimateDiff and quantised (fp8/GGUF) Wan variants at
  modest resolution and frame counts. Full-precision large video
  models generally aren't. Check each model card's VRAM guidance
  (verify; this changes with every release).
- Pin a Python venv; ComfyUI + custom nodes are sensitive to torch/CUDA
  versions. Containerising → `containers-development`.
- Keep `models/` out of git (huge binaries); track only workflows and
  node code.
