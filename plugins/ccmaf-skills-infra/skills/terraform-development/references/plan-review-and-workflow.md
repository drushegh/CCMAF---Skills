# Plan review and the write→plan→apply workflow

The plan is where IaC earns its safety story: a complete, reviewable diff of
what will happen to real infrastructure *before* it happens. Treat the plan
— not the HCL — as the thing being approved.

## The loop

```bash
terraform init                       # backend + providers (respects .terraform.lock.hcl)
terraform fmt -check -recursive      # formatting gate
terraform validate                   # internal consistency
terraform plan -out=tfplan           # the reviewable artifact
terraform show tfplan                # human-readable rendering for the PR
terraform apply tfplan               # applies EXACTLY what was reviewed
```

`apply` without a saved plan re-plans and prompts — acceptable
interactively in dev; in any pipeline, **plan and apply are separate steps
with an approval between them, and apply consumes the saved artifact.**

## Reading a plan

| Symbol | Meaning | Reviewer reaction |
|---|---|---|
| `+` | create | Expected? Named/tagged correctly? |
| `-` | destroy | **Stop.** Is data involved? Why is this in scope? |
| `~` | update in place | Check which attributes actually change |
| `-/+` | destroy then recreate | **The dangerous one** — find the `# forces replacement` attribute and decide if the data/identity loss is acceptable |
| `<=` | read (data source at apply time) | Fine; note why it deferred |
| `(known after apply)` | value computed at apply | Normal for new resources; suspicious churn on steady state |

## The review checklist

1. **Count check**: `X to add, Y to change, Z to destroy` — do the numbers
   match the intent of the PR? A one-line change planning 40 actions needs
   an explanation before anything else.
2. **Every destroy and replacement justified** — databases, disks, queues
   and anything named "prod" get explicit confirmation; `prevent_destroy`
   on stateful resources turns surprises into errors.
3. **Security-sensitive diffs** get their own eyes: IAM/role bindings,
   network rules/firewalls, public exposure flags, encryption settings.
4. **No unexplained changes to resources the PR didn't touch** — that's
   drift or a module upgrade side-effect surfacing; identify which before
   approving.
5. **Steady-state noise is a defect**: if a no-change PR doesn't plan
   clean, fix the config (ignore_changes for legitimately external fields,
   correct types/defaults) rather than teaching reviewers to skim.

## Plan as the PR gate (CI shape)

- CI runs the static gate + `plan` per affected environment root and posts
  the rendered plan to the PR; merge is blocked without a green,
  reviewed plan. Pipeline mechanics → `devops-development`.
- **Serialise applies per state**: one apply at a time per backend key
  (locking enforces correctness; a CI concurrency group avoids queued
  failures).
- **Stale plans**: a saved plan is a snapshot — applying it after other
  merges or hours of drift executes decisions made against old reality.
  Re-plan if the base moved or the approval sat too long; better pipelines
  plan-and-apply from the merged commit.
- Plan output can leak values into logs — mark inputs `sensitive`, and
  restrict who can read CI logs for production plans
  (`secrets-and-identity.md`).

## Escape hatches (documented, exceptional)

| Flag | Legitimate use | Abuse smell |
|---|---|---|
| `-target=ADDR` | Surgical recovery mid-incident | Routine use to avoid a slow/broken wider plan |
| `-replace=ADDR` | Force recreation of a degraded resource | Substitute for fixing the config |
| `-refresh-only` | Reconcile state after out-of-band change | — |
| `-refresh=false` | Speed up plans in emergencies | Hiding drift permanently |

Every escape-hatch apply gets followed by a full, clean plan to prove the
estate converged.

## Apply discipline

- Applies run in CI with **OIDC-federated identity** scoped to the target
  environment — not from laptops with standing credentials
  (`secrets-and-identity.md`).
- Watch the apply: provider errors mid-apply leave a *partial* application
  (state records what completed). The remedy is read the error, fix, and
  re-plan — not blind re-runs.
- After apply: verify outputs and the running system, then confirm the
  next `terraform plan` is empty. "Applied" is not "done"; *converged* is.
