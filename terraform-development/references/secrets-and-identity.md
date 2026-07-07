# Secrets and identity

Terraform's uncomfortable truth: **anything a provider reads or writes can
end up in state in plaintext** — `sensitive = true` masks CLI output, not
state. Design secret handling around that fact instead of discovering it in
an audit.

## The hierarchy (best first)

1. **No secret at all — identity.** The pipeline authenticates to the
   provider via **OIDC federation** (cloud workload identity); resources
   authenticate to each other via managed/workload identity. Nothing to
   store, rotate or leak.
2. **Secrets referenced, not provisioned.** Terraform wires the *reference*
   (a vault URI, a secret name); the application resolves the value at
   runtime with its own identity. The value never transits Terraform or
   state.
3. **Ephemeral / write-only handling** where the value must pass through
   Terraform: ephemeral values (1.10+) and write-only resource arguments
   (1.11+) let providers receive a secret without persisting it to state or
   plan — support is per-provider/per-argument (July 2026 — re-verify
   coverage for yours).
4. **Secret transits Terraform and lands in state** (e.g.
   `random_password` → database + vault). Sometimes unavoidable — accept it
   *explicitly*: the state backend is now a secret store; lock it down
   accordingly (`state-and-backends.md`).

## Non-negotiables

- No literal secrets in `.tf`, committed `tfvars`, or defaults. Feed them
  via environment (`TF_VAR_db_password`), CI secret stores, or vault data
  sources at plan time.
- Mark secret variables and outputs `sensitive = true` — it keeps values
  out of plan output and CI logs, which is worth having even though state
  still holds them.
- `.gitignore`: `*.tfstate*`, `.terraform/`, crash logs, any
  `secret*.tfvars` convention. Add a pre-commit secret scanner; a secret
  that reached git history is rotated, not deleted
  (→ `secure-development`).
- Provider blocks carry **no static credentials** — configuration comes
  from ambient identity/environment, so the same code runs as different
  principals per environment.

## Provider identity per environment

- One federated identity **per environment**, scoped to that environment's
  resources; prod credentials simply don't exist in dev pipelines. OIDC
  subject claims bind the identity to repo + branch/environment — pipeline
  wiring routes to `devops-development`.
- Humans get read/plan roles broadly and apply roles narrowly (or not at
  all — CI applies). Standing admin credentials on laptops are the
  anti-pattern the whole workflow exists to remove.
- The **state backend** gets its own access story: state readers can read
  every secret Terraform ever persisted; scope it like the vault it
  effectively is.

## Patterns

```hcl
variable "db_admin_password" {
  type        = string
  sensitive   = true
  description = "Injected via TF_VAR_db_admin_password from the CI secret store."
}

# Reference-not-value: app receives the secret's NAME; resolves it at runtime.
resource "azurerm_key_vault_secret" "db" {
  name         = "db-admin-password"
  value        = var.db_admin_password   # transits state — hierarchy level 4
  key_vault_id = azurerm_key_vault.main.id
}
```

When generating credentials, prefer the provider's native rotation or
`random_password` with `keepers` for deliberate rotation — and record that
the generated value lives in state.

## Review checklist for secret-touching changes

1. Could identity replace this secret entirely? (Level 1 beats everything.)
2. Does the value transit state? If yes, is the backend's access list
   still correct?
3. Is it `sensitive` end to end — variable, resource argument, outputs?
4. Do plan logs in CI leak it (module outputs, error messages)?
5. Rotation: who rotates it, how, and does a rotation plan clean or does
   it cascade replacements?
