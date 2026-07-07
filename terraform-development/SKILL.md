---
name: terraform-development
description: >-
  Infrastructure-as-Code discipline with Terraform and OpenTofu,
  provider-independent: HCL module design and composition, remote state with
  locking and encryption, the write→plan→apply loop with plan review as a
  hard merge gate, drift detection and reconciliation, multi-environment
  patterns (directory-per-env, workspaces, tfvars), secrets handling and
  provider identity (OIDC over static keys), testing (fmt/validate/tflint,
  terraform test, plan assertions, Terratest, policy-as-code), and
  import/refactor of existing estates (import/moved/removed blocks). Use
  whenever .tf/.tfvars/HCL files, terraform or tofu commands, state
  files/backends/locking, module registries, plan-output review, drift, or
  IaC design/review appear — on any cloud or on-prem provider. Triggers
  include *.tf, *.tfvars, .terraform.lock.hcl, backend and provider blocks,
  "terraform plan" output in a PR, state lock errors, and "import existing
  infrastructure". PROACTIVELY activate before designing module structure
  or touching state.
---

# Terraform Development

Provider-independent Infrastructure-as-Code engineering with Terraform and
OpenTofu. This skill owns the discipline every provider shares — modules,
state, the plan gate, environments, drift, testing. What you provision with
it routes to the platform skills (Azure resources and the Bicep-vs-Terraform
decision → `azure-development`); the pipelines that run it →
`devops-development`.

Context (July 2026 — re-verify): Terraform has been BUSL-1.1 licensed since
1.5.x (August 2023) — fine for internal/production use, restricted for
products competing with HashiCorp. **OpenTofu** (Linux Foundation, MPL-2.0)
is the open-source fork and stays close to feature parity while adding its
own (notably state encryption, 1.7+). Everything here applies to both;
`terraform` is used generically. Feature version floors are noted where they
matter — verify the pinned version in front of you supports them.

## Non-negotiables

1. **State is remote, locked, encrypted and access-controlled — never
   committed.** State contains resource attributes *and secrets* in
   plaintext; read access to state is read access to the secrets. Local
   state is for throwaway experiments only.
2. **No apply without a reviewed plan of that exact change.**
   `terraform plan -out=tfplan` → human review → `terraform apply tfplan`.
   The plan is the PR body for infrastructure; an unreviewed apply is an
   unreviewed merge to production.
3. **Pin everything.** `required_version` for the CLI, `~>` constraints for
   every provider, commit `.terraform.lock.hcl`, pin module sources
   (registry version / git `?ref=` tag). Unpinned IaC is a deferred outage.
4. **All change flows through code.** Console/portal edits to managed
   resources create drift that the next apply silently reverts — detect
   drift on a schedule and reconcile deliberately, in one direction.
5. **Secrets never live in `.tf` or committed `tfvars`.** Mark values
   `sensitive`; know that `sensitive` masks CLI output but **not state**;
   prefer identity (OIDC/managed identity) over static credentials, and
   ephemeral/write-only values where supported (1.10+/1.11+).
6. **Modules are products.** Small, focused, versioned, documented inputs
   and outputs, no provider blocks inside reusable modules. A module
   somebody can't use without reading its internals isn't finished.
7. **`fmt` + `validate` + lint gate every commit; plan gates every merge.**
   Static checks are seconds; a bad apply is an afternoon (or a headline).
8. **Destroy is a deliberate act.** `prevent_destroy` on stateful resources
   (databases, storage), and treat every `-/+ destroy and then create
   replacement` line in a plan as a data-loss question until proven
   otherwise.

## Decision tables

| Environment separation | Use when | Notes |
|---|---|---|
| **Directory per environment** (shared modules, thin env roots) | Default for real estates | Explicit, per-env backend + identity, blast-radius isolation |
| **Workspaces** | Many near-identical instances of the same stack | Weak isolation: same backend, same credentials; easy to apply to the wrong one |
| **Separate repos/subscriptions/accounts** | Regulatory or org boundaries | Strongest isolation; promote via module versions |

| State layout | Use when |
|---|---|
| One state per env **and** per stack (network / data / app) | Default — small blast radius, fast plans |
| Single state for everything | Only tiny estates; slow plans and total blast radius otherwise |
| Cross-stack reads | Prefer provider `data` sources; `terraform_remote_state` couples consumers to the producer's state layout |

| Verification level | Tool |
|---|---|
| Syntax/consistency | `terraform fmt -check`, `terraform validate` |
| Lint/provider correctness | `tflint` (+ provider ruleset) |
| Security/misconfig scan | `trivy config` / `checkov` |
| Logic without deploying | `terraform test` (plan-mode runs), variable `validation`, pre/postconditions |
| Real infrastructure | `terraform test` (apply mode) / Terratest — sparingly |
| Org policy | OPA/Conftest on `terraform show -json` plan output |

## High-frequency pitfalls

- **State surgery without a backup** — `terraform state pull >
  backup.tfstate` first, always; prefer `moved`/`removed`/`import` blocks
  over `state mv/rm`.
- **Refactoring renames that destroy** — renaming a resource/module address
  without a `moved` block plans destroy-and-recreate.
- **`count` where `for_each` belongs** — list index shifts re-address (and
  so replace) unrelated resources; key by stable name.
- **`-target` as a habit** — it's an incident tool; routine targeted
  applies mean the state layout is wrong.
- **Applying a stale plan** — plan artifacts expire with reality; re-plan
  after upstream merges or long approval gaps.
- **Secrets discovered in state "later"** — they were always there; lock
  down the backend before, not after.
- **Provider blocks inside shared modules** — breaks composition and
  multi-region/multi-account use; providers are configured at the root and
  passed in.
- **Giant single state** — hour-long plans, total blast radius, one lock
  for every team; split by stack and environment.
- **Local applies against production** — CI applies with OIDC-federated
  identity; laptops carry neither the credentials nor the audit trail.
- **Ignoring "known after apply" churn** — noisy plans train reviewers to
  rubber-stamp; fix the config so steady state plans clean.

## Workflow (the loop)

1. **Write** — change modules/roots; keep the diff small and single-purpose.
2. **Static gate** — `terraform fmt`, `validate`, `tflint`, security scan;
   fix before pushing.
3. **Plan in CI** — `terraform plan -out=tfplan` against the target
   environment; post the rendered plan to the PR.
4. **Review the plan, not just the HCL** — adds/changes/destroys expected?
   Any `forces replacement` on stateful resources? IAM/network changes
   intended? (`plan-review-and-workflow.md` has the checklist.)
5. **Apply the saved plan** — same artifact that was reviewed, applied by
   CI with federated identity, serialised per state.
6. **Verify** — outputs, smoke checks, the running thing; then confirm the
   next plan is empty.
7. **Detect drift on a schedule** — `terraform plan -detailed-exitcode` in
   a nightly job; reconcile findings deliberately
   (`drift-and-import.md`).

## Reference index

Load on demand:

- `references/modules-and-composition.md` — module anatomy, variables/outputs, composition over nesting, versioning, anti-patterns
- `references/state-and-backends.md` — remote backends, locking, state security, splitting state, state operations
- `references/plan-review-and-workflow.md` — reading a plan, the review checklist, plan-as-gate CI shape, apply discipline
- `references/environments-and-workspaces.md` — directory-per-env vs workspaces, tfvars, promotion, keeping environments thin
- `references/secrets-and-identity.md` — secrets vs state reality, sensitive/ephemeral/write-only, provider auth, OIDC
- `references/testing-and-validation.md` — the verification ladder: fmt/validate/tflint/scanners, terraform test, Terratest, policy-as-code
- `references/drift-and-import.md` — drift detection and reconciliation, import/moved/removed blocks, adopting existing estates

## Boundaries

- **Azure specifics** — azurerm/azapi patterns, Bicep vs Terraform on a
  project, azd, Azure landing zones → `azure-development` (one IaC language
  per project; don't mix estates).
- **What runs *inside* a provisioned cluster** — manifests, Helm, GitOps
  reconciliation → `kubernetes-development` (Terraform builds the cluster;
  GitOps owns its contents — avoid heavy use of kubernetes/helm providers
  for app workloads).
- **The pipelines that run plan/apply** — YAML, environments/approvals,
  OIDC federation setup → `devops-development`.
- **Supply-chain and secrets-management depth** (provider/module
  provenance, vault architecture) → `secure-development`.
- **Wrapper scripting** around terraform → `bash-development` /
  `powershell-development`; **Go, for Terratest or custom providers** →
  `go-development`.
- **PR/branching discipline** the plan gate rides on → `git-workflow`.
- **Server configuration management** post-provision (Ansible,
  cloud-init) → `linux-administration`.
