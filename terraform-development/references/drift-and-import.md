# Drift, import and refactoring

Drift is reality diverging from code: console edits, other automation,
provider-side changes, failed applies. Left alone it makes every plan noisy
and every apply a gamble — the next `apply` may silently revert someone's
emergency fix.

## Detecting drift

Run a scheduled read-only plan against each environment:

```bash
terraform plan -detailed-exitcode -lock=false
# exit 0: clean · exit 1: error · exit 2: changes pending (drift or unapplied code)
```

Exit code 2 pages nobody but files a ticket with the plan attached. Nightly
per environment is the workable default; anything managing IAM or network
edges deserves more frequent runs.

## Reconciling drift — a decision, not a reflex

For each drifted attribute, decide direction **deliberately**:

| Situation | Direction |
|---|---|
| Console hotfix during an incident, correct going forward | **Adopt into code**: mirror the change in HCL so the plan goes clean |
| Unauthorised/accidental manual change | **Revert from code**: apply restores declared state (announce first — someone thought they needed it) |
| Provider now manages/computes the attribute | `ignore_changes` for that attribute, with a comment saying why |
| External system legitimately owns the field (e.g. an autoscaler writes capacity) | `ignore_changes` on that field — codify the ownership split |

Never "fix" drift with a blind `-refresh-only` apply — that launders
unknown changes into the record unread. And fix the *cause*: recurring
drift means someone lacks a code path for a change they routinely need.

## Refactoring safely — moved and removed

Terraform tracks resources by **address**; renames look like
destroy-and-create unless you say otherwise:

```hcl
# Rename / restructure without destroying (1.1+)
moved {
  from = azurerm_storage_account.old_name
  to   = module.storage.azurerm_storage_account.main
}

# Stop managing WITHOUT destroying (1.7+)
removed {
  from = azurerm_resource_group.legacy

  lifecycle {
    destroy = false
  }
}
```

These are declarative, reviewable and land through the normal plan gate —
the plan renders them as "moved"/"removed", not destroy/create. Ship
`moved` blocks in the same change as the rename (module authors: publish
them with the version that renames). CLI `state mv`/`state rm` remain the
fallback for repairs — with a state backup first
(`state-and-backends.md`).

## Importing existing resources

`import` blocks (1.5+) bring unmanaged resources under management through
plan review, and can generate starting config:

```hcl
import {
  to = azurerm_virtual_network.main
  id = "/subscriptions/…/resourceGroups/rg-prod/providers/Microsoft.Network/virtualNetworks/vnet-prod"
}
```

```bash
terraform plan -generate-config-out=generated.tf   # first pass only
```

Generated config is a **draft**: expect noisy attributes, provider defaults
spelled out, and values that belong in variables — refactor it to house
style, then re-plan until the import shows **no changes** to the real
resource. An import that plans modifications will *change production* on
apply; converge the config to reality first, improve reality in a separate,
reviewed change after.

## Adopting an existing estate (brownfield)

1. **Inventory**: enumerate what exists (provider CLI/console export);
   decide what's worth managing at all.
2. **Prioritise**: stateful and security-critical first (networks, IAM,
   data stores) — the resources where unmanaged drift hurts most.
3. **Slice**: import one stack at a time into the target state layout
   (`environments-and-workspaces.md`) — never a big-bang import of
   everything into one state.
4. **Converge**: each slice ends with a clean plan and CI ownership (plan
   gate, drift detection) switched on.
5. **Close the console**: once a stack is managed, restrict write access
   outside the pipeline — imports without that follow-through are permanent
   drift generators. Modernisation sequencing → `legacy-modernisation`.

## Pitfalls

- Importing into a `count`/`for_each` address without pinning the key —
  the next index shift re-plans everything.
- `removed` without `destroy = false` misread as "forget" — state the
  intent explicitly.
- Drift findings silently reverted by the next deploy's apply — treat every
  exit-code-2 finding as a change needing an owner before the next apply.
- Generated import config committed verbatim — refactor before merge.
