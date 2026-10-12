# Running ComfyUI for Agents, MCP and Deployment

## Headless / server mode

ComfyUI is a server; you don't need the browser UI to use it. Launch
flags that matter:

- `--listen [host]` — bind address. **Without the flag it binds loopback
  (127.0.0.1); only widen it deliberately.** A bare `--listen` (no
  value) binds ALL interfaces (`0.0.0.0,::`, IPv4 + IPv6), as does
  `--listen 0.0.0.0` — both expose the server on the network.
- `--port` — default 8188.
- VRAM mode (mutually exclusive): `--gpu-only`, `--highvram`,
  `--lowvram`, `--novram`, `--cpu`. **Default (no flag) is the right
  choice for most cards.** By default, models are offloaded to system
  RAM after use, and recent builds manage VRAM dynamically.
  `--highvram` keeps models resident in VRAM and `--gpu-only` puts
  everything (text encoders too) on the GPU. Both disable dynamic VRAM,
  and on a model that doesn't fit they OOM-crash the server rather than
  degrade. Use them only when the whole working set fits with headroom.
  `--lowvram` is a no-op while dynamic VRAM is active. Related:
  `--reserve-vram <GB>` (leave room for the OS and other apps),
  `--disable-smart-memory` (offload aggressively), and
  `--cache-ram`/`--cache-lru N`/`--cache-none` (node-result caching
  versus RAM). Flag set checked against `comfy/cli_args.py` (Oct 2026).
  It changes often, so run `python main.py --help` on the installed
  build.
- `--output-directory`, `--input-directory`, `--extra-model-paths-config`.
- `--disable-auto-launch` for servers/CI.

Once running, drive it through the API (`api-automation.md`).

## The security model — read this before deploying

ComfyUI assumes a trusted, local operator. Two hard facts:

1. **No authentication by default.** Anyone who can reach the port can
   queue prompts, read outputs, upload files and enumerate the
   filesystem through nodes. **Never expose a raw ComfyUI port to the
   internet.** Put it behind a reverse proxy with auth + TLS, an SSH
   tunnel, a private network, or a queue/worker boundary — and still
   treat it as sensitive.
2. **Custom nodes and `.ckpt` files run arbitrary code.** A custom node
   is Python executed in-process; ComfyUI-Manager installs them from the
   internet; pickled checkpoints can execute on load. Vet node source and
   provenance, prefer `.safetensors`, and run the whole thing with least
   privilege (dedicated user, no secrets in the environment, network
   egress controlled). This is a `secure-development` threat surface —
   model it as remote-code-execution-by-design.

## Consuming ComfyUI via MCP (agent-driven generation)

There's a large ecosystem of MCP servers that expose ComfyUI to agents —
they generally do one of two things:

- **Generic execution**: queue an arbitrary API-format workflow and
  return outputs (thin wrappers over `/prompt` + `/ws`).
- **Workflow-as-tool**: take a saved workflow, expose its
  parameterisable fields (prompt, seed, dimensions) as a typed MCP tool,
  so the agent calls "generate_image(prompt, …)" without seeing the
  graph. (Several popular servers and a DSL-based one work this way.)

When choosing one: prefer servers that let *you* supply the workflow
(so you control the model/licence/recipe), check what host/credentials
they expect, and apply the same trust rules — an MCP server driving
ComfyUI inherits all of ComfyUI's RCE surface. Building your own such
server → `llm-development` (MCP server development).

## Deployment shapes

- **Local/workstation**: a venv, a GPU, loopback only. Simplest; fine for
  dev and single-operator use.
- **Containerised**: GPU container (CUDA base image, `--gpus all`),
  models mounted as a volume (not baked into the image), the port kept
  internal. → `containers-development` / `kubernetes-development`.
- **Cloud GPU**: a GPU VM or managed GPU service; mind cost (GPUs bill by
  the hour), cold-start/model-load time, and the auth gap above. Cloud
  GPU VMs → `azure-development`.
- **Queue/worker**: for throughput, front ComfyUI workers with a job
  queue rather than calling `/prompt` directly from a public service —
  it also gives you the auth/isolation boundary ComfyUI lacks.

Reproducibility and recipe-recording (`workflow-model.md`) and model
licensing (`models-and-management.md`) apply to every deployment shape.
