# Authorisation models: RBAC, ABAC, ReBAC

Authentication ends with "who is calling". Authorisation is the harder,
longer-lived question: *may this caller do this action to this resource?*
Model it deliberately — retrofitting a permission model onto scattered `if`
statements is a rewrite.

## Where enforcement lives

- **API boundary (middleware)**: coarse gate — authenticated? token audience
  right? role/scope plausible for this route? Cheap, uniform, unavoidable.
- **Service layer**: the real decision — *this* caller, *this* action,
  *this* resource, including ownership and tenancy. Every code path goes
  through it; a helper like `authorise(actor, action, resource)` keeps the
  decision in one place and testable.
- **Database**: row-level security as a backstop for shared-schema tenancy
  (→ `sql-development`), not the primary mechanism.
- **UI**: hides what the user can't do — pure ergonomics, zero enforcement.

Deny by default at every layer: an unmatched route, an unmapped role or a
null tenant fails closed.

## RBAC — the workhorse

Users → roles → permissions. The indirection is the point:

- **Code checks permissions, not roles** — `can(actor, "invoice:approve")`,
  never `role === "manager"`. Renaming or splitting roles then touches data,
  not code.
- Keep the role set small and nameable; **role explosion**
  (`regional_manager_readonly_v2`) is the smell that says the real model is
  attribute- or relationship-shaped.
- Watch self-service escalation: whoever can grant roles effectively holds
  every role they can grant. Admin-role assignment is itself a permission,
  audited and step-up-gated (→ `mfa-and-passkeys.md`).

## ABAC — policy over attributes

Decisions from attributes of subject, resource, action and context: "managers
may approve invoices **of their own cost centre**, under €10k, from a managed
device, during business hours". Powerful and auditable, at the cost of a
policy engine and attribute plumbing.

Policy-as-code engines (decision-level; verify current standing before
committing): **OPA/Rego** (general-purpose, CNCF), **Cedar** (AWS-originated,
open source, formally verified core), **Casbin** (library-embedded,
multi-model). Externalising policy beats scattering it, but budget for
testing policies like code — they are code.

## ReBAC — permissions as relationships

Google Zanzibar lineage: store tuples like
`document:readme#viewer@user:anne` and answer checks by walking the graph
(`viewer of doc X because member of group Y which is editor of folder Z`).
Reach for it when **sharing and hierarchy are the product** — documents,
folders, projects, org trees — where RBAC roles can't express "access follows
this object's graph". Implementations: **OpenFGA** (CNCF), **SpiceDB** —
running one is real operational surface; adopt deliberately.

## Choosing

| Signal | Model |
|---|---|
| Stable job-function permissions, tens of roles | RBAC |
| Rules keep saying "…but only if/when/where" | ABAC (or RBAC + explicit attribute conditions) |
| Rules keep saying "…their own / shared with / inside" | ReBAC (or RBAC + ownership checks while it's simple) |
| Cross-service consistency needed | Externalised policy/decision service over per-service `if` trees |

Hybrids are normal: RBAC for admin planes, relationships for user content.
Start with RBAC + ownership checks and **instrument the exceptions** — the
`if` statements that bypass the model tell you which model you actually need.

## Multi-tenant isolation

The highest-stakes authorisation problem in SaaS:

- **Tenant comes from the token** (claim set at authentication), never from a
  request parameter, header or body an attacker controls.
- Every query is tenant-scoped **by construction**: a repository/base-query
  layer that demands tenant context, so forgetting the filter doesn't
  compile or throw — not a convention that asks every developer to remember.
- Shared schema + RLS backstop, schema-per-tenant, or database-per-tenant:
  an isolation/cost/operational trade — record the choice and its rationale.
- Cross-tenant denial is a **test suite**, not a hope: fixtures with two
  tenants, every endpoint probed with tenant A's token against tenant B's
  resources, run in CI.
- Background jobs, exports, search indexes and caches leak tenancy when keys
  omit the tenant — include tenant ID in cache keys and queue payload
  authorisation checks.

## Anti-patterns

- Authorisation decisions cached beyond their truth (role revoked, cache
  still says yes) — scope caches tightly and invalidate on grant changes.
- The **confused deputy**: a privileged service performing an action for a
  caller using its own authority without re-checking the caller's — pass and
  verify the end-user context (token exchange, `oauth-oidc-flows.md`).
- Negative permissions ("everyone except…") — they interact explosively with
  role composition; model exclusions as the absence of a grant.
- Authorisation logic duplicated per endpoint until two copies disagree — the
  single `authorise()` seam again.
