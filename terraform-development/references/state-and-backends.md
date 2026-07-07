# State and backends

State is Terraform's record of what it manages — the mapping from addresses
in code to real resource IDs, plus every attribute it read, **including
secrets in plaintext**. Treat the state file as a credential store with a
map attached.

## Remote backends and locking

Remote state + locking is the floor for any shared work: one writer at a
time, no state on laptops, history/versioning at the storage layer.

| Backend | Locking (July 2026 — re-verify) |
|---|---|
| `azurerm` (blob storage) | Native blob-lease locking |
| `s3` | Native lockfile locking via `use_lockfile = true` (GA since 1.11; DynamoDB-based locking is the legacy path) |
| `gcs` | Native locking |
| HCP Terraform / Terraform Enterprise | Built-in locking, runs, RBAC |

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateprod"
    container_name       = "tfstate"
    key                  = "prod.network.tfstate"
    use_azuread_auth     = true
  }
}
```

Backend blocks take no variables — per-environment values arrive via
`terraform init -backend-config=…` (partial configuration) or per-env
directories with their own backend files.

## State security

- **Access to state = access to its secrets.** Encrypt at rest (storage
  encryption; OpenTofu adds client-side state encryption, 1.7+), restrict
  read access as tightly as apply access, and audit it.
- Enable storage **versioning/soft-delete** — a corrupted or truncated
  state with no prior version is an estate-wide incident.
- Never commit `*.tfstate`/`*.tfstate.backup`; `.gitignore` them and
  `.terraform/` (the lock file `.terraform.lock.hcl` IS committed).

## Splitting state

One state per **environment × stack** is the default: `prod.network`,
`prod.data`, `prod.app`. Small states mean fast plans, narrow blast radius,
and locks that don't serialise unrelated teams.

Cross-stack references, in order of preference:

1. **Provider `data` sources** looking up the real resource by name/tag —
   decoupled from how the other stack stores state.
2. `terraform_remote_state` — convenient but couples the consumer to the
   producer's backend layout and exposes its whole state outputs.
3. A configuration store (parameter store / app config) the producer writes
   and consumers read — best at org scale.

## State operations (with seatbelts)

Always first: `terraform state pull > pre-surgery.tfstate` (a timestamped
backup), and work on a locked, quiesced state.

| Task | Prefer (declarative, reviewable) | Legacy/imperative |
|---|---|---|
| Rename/move an address | `moved` block | `terraform state mv` |
| Stop managing without destroying | `removed` block (1.7+) | `terraform state rm` |
| Bring an existing resource under management | `import` block (1.5+) | `terraform import` CLI |
| Inspect | `terraform state list` / `state show ADDR` | — |

The block forms go through **plan review** like any other change — that is
the point. CLI surgery mutates state immediately with no plan and no PR;
reserve it for repairs the blocks can't express.

`terraform force-unlock` only after confirming the holder is truly dead (a
crashed run) — force-unlocking an *active* apply corrupts state.

## Recovery playbook

1. Stop all applies against the state (announce, disable CI job).
2. Pull the current state and every available prior version.
3. Diagnose: compare `state list` against reality (provider console/CLI).
4. Repair with the smallest tool: restore a storage version, or targeted
   `import`/`removed` blocks — not hand-editing JSON unless truly cornered
   (and then on a copy, validated by a clean plan).
5. Prove recovery: `terraform plan` shows only expected changes.

## Pitfalls

- Two roots pointing at the **same state key** — they will fight; one
  state, one root.
- Sharing one backend container + credentials across all environments —
  prod isolation is backend isolation too
  (`environments-and-workspaces.md`).
- Treating state as a database — don't parse or template from raw state in
  other tooling; use outputs or data sources.
