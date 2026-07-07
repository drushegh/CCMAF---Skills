# Testing and validation

IaC testing is a ladder: each rung slower and more real than the last. Run
the cheap rungs on every commit, the expensive ones where the risk justifies
the cloud bill.

## The ladder

| Rung | Tool | Catches | Cost |
|---|---|---|---|
| Format | `terraform fmt -check -recursive` | Style drift | ms |
| Syntax/consistency | `terraform validate` | Type errors, bad references, missing args | seconds |
| Lint | `tflint` + provider ruleset | Invalid instance types, deprecated syntax, convention breaches | seconds |
| Security scan | `trivy config` / `checkov` | Public buckets, open security groups, missing encryption | seconds |
| Logic (no deploy) | `terraform test` in plan mode; `validation`/conditions | Wrong counts, bad wiring, broken invariants | seconds–minutes |
| Real deploy | `terraform test` in apply mode; Terratest | Provider reality: quotas, IAM, actually-works | minutes + money |
| Org policy | OPA/Conftest on plan JSON; Sentinel (HCP) | "No public IPs in prod", tag mandates | seconds, in CI |

`terraform validate` needs an initialised working directory — in CI use
`terraform init -backend=false` first so validation never touches state.

## Assertions inside the configuration

First line of defence — they run on every plan, for every consumer:

```hcl
variable "node_count" {
  type        = number
  description = "Worker node count."

  validation {
    condition     = var.node_count >= 1 && var.node_count <= 20
    error_message = "node_count must be between 1 and 20."
  }
}

resource "azurerm_kubernetes_cluster" "main" {
  # …

  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.node_count >= 3
      error_message = "Production clusters need at least 3 nodes."
    }
  }
}
```

`validation` guards inputs; `precondition`/`postcondition` guard resource
invariants; `check` blocks (1.5+) assert without blocking — use them as
warnings for things worth knowing but not worth failing the run.

## Native `terraform test` (1.6+)

`.tftest.hcl` files hold `run` blocks; each `run` plans (`command = plan` —
fast, free) or applies (real resources, destroyed after) and asserts:

```hcl
# tests/network.tftest.hcl
variables {
  environment = "test"
  cidr        = "10.10.0.0/16"
}

run "creates_three_subnets" {
  command = plan

  assert {
    condition     = length(module.network.subnet_ids) == 3
    error_message = "Expected exactly three subnets."
  }
}
```

Plan-mode tests are the module's unit tests: given inputs, assert the shape
of what would be built. Reserve apply-mode for behaviours only reality can
prove.

## Terratest and real-deploy testing

Terratest (Go) deploys real infrastructure, probes it (HTTP checks, cloud
SDK queries), and destroys it. Stronger assertions than plan-shape testing,
at real cost: cloud spend, slow feedback, and cleanup engineering (orphaned
test resources need a reaper). Reserve it for flagship modules whose failure
is expensive, in a dedicated test subscription/account, scheduled or
pre-release rather than per-commit. Go mechanics → `go-development`.

## Policy as code

Evaluate the **plan**, not the source — the plan is what will actually
happen:

```bash
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
conftest test tfplan.json   # Rego policies: deny public IPs, require tags…
```

Policies encode organisational law (allowed regions, mandatory tags,
forbidden SKUs, no `0.0.0.0/0` ingress) and run as a CI gate beside plan
review — the reviewer checks intent, policy checks the invariants nobody
should have to eyeball. HCP Terraform users get Sentinel built in;
OPA/Conftest is the neutral equivalent.

## What to test where

- Every root/module: fmt, validate, tflint, security scan — pre-commit and
  CI, no exceptions.
- Reusable modules: plan-mode `terraform test` per supported input shape,
  plus `validation` on every variable.
- Flagship modules (network, cluster, landing zone): a small apply-mode or
  Terratest suite, scheduled; organisation-wide, a policy pack on every
  plan in CI.
- Don't chase apply-mode coverage of trivial resources — the provider
  already tested that a storage account can be created; test *your* logic.
