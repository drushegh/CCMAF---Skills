# Modules and composition

A module is Terraform's unit of reuse and its unit of blast radius. The
craft is keeping modules small and composable, and keeping the *root* module
— the thing you actually apply — a thin composition of them.

## Module anatomy

```text
modules/network/
  main.tf          # resources
  variables.tf     # every input, typed, described
  outputs.tf       # the module's contract
  versions.tf      # required_version + required_providers
  README.md        # what it builds, inputs/outputs, an example
```

- **Roots compose, children build.** Environment roots (`envs/prod/`)
  should read as an inventory: module calls, wiring, and env values —
  little to no raw resource sprawl.
- **No provider blocks in reusable modules.** Declare `required_providers`
  only; the root configures providers and passes them (including aliased
  providers for multi-region). A module with its own `provider` block can't
  be composed.

## Variables and outputs — the contract

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment name."

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of dev, test, prod."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to every resource."
  default     = {}
}

output "subnet_ids" {
  description = "IDs of the created subnets, keyed by name."
  value       = { for k, s in azurerm_subnet.this : k => s.id }
}
```

- Every variable: a **type**, a **description**, and a default only when a
  safe one exists. Use `validation` blocks to fail at plan time, not apply
  time. Mark secret inputs `sensitive = true` (state caveat →
  `secrets-and-identity.md`).
- Outputs are the public API — expose what consumers need (IDs, names,
  endpoints) so they never reach into module internals or re-derive names.
- Prefer a few **object-typed** variables with `optional()` attributes over
  thirty scalar flags once inputs cluster naturally.

## Composition over nesting

- Keep the module tree **shallow** — root → modules, one further level at
  most. Deep nesting hides the plan's cause-and-effect.
- **Dependency inversion**: modules accept IDs as inputs
  (`vnet_id = module.network.vnet_id`); they don't look up other stacks'
  resources internally. The root owns the wiring.
- `for_each` over modules replaces copy-paste per instance; key by stable
  names, never list indexes.

## Sizing modules

| Smell | Better |
|---|---|
| "God module" building network + compute + data + IAM | One module per cohesive capability, root composes |
| Thin wrapper adding nothing to a single resource | Use the resource directly; wrap only to encode real org policy |
| Module used once, ever, in one root | Inline it until reuse is real |
| Flag soup (`create_x`, `enable_y` × 20) | Split into modules per shape, or accept objects |

The test: can someone use it from the README alone, and does its plan output
make sense without reading its internals?

## Versioning and sources

- Registry modules: pin exact or `~>` versions. Git sources: pin a tag —
  `source = "git::https://…//modules/network?ref=v1.4.2"` — never a branch.
- Version modules like libraries: semver, a changelog, and breaking changes
  behind a major bump. Consumers upgrade by choice, not by surprise.
- Vet community modules like any dependency (provenance, maintenance,
  pinned version — supply-chain depth → `secure-development`); for
  nontrivial infrastructure, a thin in-house module wrapping vetted
  patterns usually ages better than a sprawling third-party one.

## Pitfalls

- Outputting entire resource objects — leaks internals and makes every
  refactor a breaking change; output the specific attributes.
- `depends_on` on modules as a reflex — usually masks missing
  value-level dependencies; wire real references instead.
- Renaming resources inside a published module without shipping `moved`
  blocks — every consumer plans destroy/recreate on upgrade
  (`drift-and-import.md`).
