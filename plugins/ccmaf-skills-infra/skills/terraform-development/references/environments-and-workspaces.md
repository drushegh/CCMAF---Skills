# Environments and workspaces

Multi-environment IaC has one goal: **prod differs from dev only by
values**, never by structure you can't see. The pattern you pick decides how
enforceable that is.

## The three patterns

**Directory per environment (the default):**

```text
modules/            # all logic lives here, versioned
  network/
  app/
envs/
  dev/
    main.tf         # thin: module calls + wiring only
    backend.tf      # its own state
    dev.tfvars
  prod/
    main.tf
    backend.tf
    prod.tfvars
```

Each environment is its own root, state, backend and CI identity. Explicit
(`envs/prod/` is unambiguous), isolatable (prod state/creds can live in a
different account), and diffable (`diff envs/dev envs/prod` shows exactly
how they differ). Cost: the thin roots are near-duplicates — keep them
*thin* so the duplication is trivial.

**Workspaces:** one configuration, N states
(`terraform workspace select prod`). Right for many near-identical
instances of one stack (per-tenant, per-region sandboxes). Wrong as the
prod/dev boundary for most teams:

- All workspaces share the same backend and the same credentials — no
  isolation gradient between dev and prod.
- The active workspace is invisible in code — "applied to the wrong
  workspace" is a classic incident; branching on
  `terraform.workspace == "prod"` reintroduces structural divergence.

**Separate repos/accounts/subscriptions:** the strongest boundary, driven
by org or regulatory needs. Environments consume the same **published
module versions**; promotion is a version bump flowing through, not a
copy-paste.

## tfvars discipline

- One `<env>.tfvars` per environment, containing *only* what genuinely
  differs: sizes, counts, feature toggles, names. CI passes
  `-var-file=prod.tfvars` explicitly — never rely on the auto-loaded
  `terraform.tfvars` differing per machine.
- Non-secret values only; secrets arrive by identity or environment
  (`secrets-and-identity.md`), and secret-bearing tfvars are never
  committed.
- Schema lives in `variables.tf` with types and `validation` — a tfvars
  typo should die at plan time.

## Promotion

Changes flow **dev → test → prod as the same artifact**: the same module
version / same commit, re-planned per environment (each plan reviewed —
prod's plan can differ because prod's reality differs). Red flags:

- Editing prod's root directly with changes dev never saw.
- Environment-specific conditionals breeding inside modules
  (`var.env == "prod" ? … :`) — push differences out to tfvars values.
- "Temporary" prod-only hotfixes that never flow back — the next promotion
  reverts them (that is drift in code form).

## Keeping environments honest

- **Structural parity check**: environments should differ in tfvars and
  backend config; a growing diff between `envs/*/main.tf` files is debt to
  burn down.
- Dev being tiny is fine; dev being *shaped differently* (no private
  networking, different identity model) silently un-tests the things prod
  depends on. Downgrade sizes, not architecture, where budget allows.
- Name states and resources by convention (`<env>.<stack>` state keys,
  env-tagged resources) so nothing needs tribal knowledge to attribute.

## Pitfalls

- Same state key reused across environments — two roots fighting over one
  state.
- Prod applies allowed from developer machines because "the directory
  pattern makes it easy" — the isolation is only real when identity and
  pipeline permissions match it (`devops-development` for the gates).
- Workspaces *and* directories mixed ad hoc — pick one axis per estate and
  document it.
- Ten environments, no owner list — every environment is real
  infrastructure with real cost; delete the ones nobody can name a purpose
  for.
