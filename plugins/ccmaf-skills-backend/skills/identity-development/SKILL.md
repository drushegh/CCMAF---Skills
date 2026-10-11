---
name: identity-development
description: >-
  Authentication and authorisation engineering, standards-first: OAuth 2.0/2.1
  and OIDC flow selection (authorization code + PKCE, client credentials,
  device grant, token exchange), token engineering (JWT vs opaque, validation,
  lifetimes, refresh rotation, revocation, DPoP), sessions vs tokens and
  browser auth security (cookie flags, CSRF, the BFF pattern), MFA and
  passkeys/WebAuthn, SSO (SAML/OIDC federation, SCIM provisioning), and
  authorisation models (RBAC/ABAC/ReBAC, multi-tenant isolation) with the auth
  vulnerability catalogue. Use whenever a task designs, implements or reviews
  login, tokens, sessions, SSO or permissions — "add auth", JWT handling,
  refresh tokens, OAuth callbacks, cookie/SameSite decisions, role or tenant
  checks, IdP integration (Entra, Keycloak, Okta), SAML metadata, WebAuthn.
  Triggers include Authorization headers, id_token/access_token/refresh_token,
  /oauth or /callback endpoints, "users can see another tenant's data".
  PROACTIVELY activate before writing any auth code.
---

# Identity Development

Engineering authentication and authorisation as a system: which protocol flow
serves which client, how tokens and sessions are issued, validated, rotated
and revoked, how humans prove who they are (passwords, MFA, passkeys), how
enterprises federate (SSO, SCIM), and how permissions are modelled and
enforced. Standards-first and vendor-neutral — the IdP (Entra, Keycloak,
Auth0, Okta) is an implementation choice; the flows and validation rules are
not. `secure-development` owns the broader OWASP frame; this skill owns the
auth engineering inside it (boundaries below).

Standards context (July 2026 — re-verify before citing): OAuth 2.0 (RFC
6749/6750) is the deployed base; **OAuth 2.1** remains an IETF draft that
consolidates practice rather than adding features — its rules (PKCE
everywhere, no implicit grant, no password grant, exact redirect URIs) are
already binding via **RFC 9700** (OAuth 2.0 Security BCP, January 2025).
OpenID Connect Core 1.0 is the identity layer on top. Passkeys ride W3C
WebAuthn (Level 2 Recommendation; Level 3 in progress). SAML 2.0 (2005) is
still the enterprise-SSO workhorse; SCIM 2.0 (RFC 7643/7644) owns
provisioning.

## Non-negotiables

1. **Don't build what you can federate.** Default to an established IdP;
   where you must implement protocol pieces, use maintained
   OAuth/OIDC/SAML/JWT libraries — hand-rolled token parsing, crypto or SAML
   XML handling is how breaches start.
2. **Authorization code + PKCE for everything user-facing** — server web
   apps, SPAs and native apps alike. The implicit and resource-owner-password
   grants are dead (RFC 9700); never generate them for new work.
3. **Validate tokens completely, every time**: signature against an algorithm
   allow-list (never the token's own `alg` header), `iss` exact-match, `aud`
   contains this API, `exp`/`nbf` with bounded clock skew, key selected by
   `kid` from the issuer's JWKS. A token failing any check is rejected — no
   partial trust.
4. **ID tokens prove who; access tokens grant what.** Never call an API with
   an ID token; never treat possession of an access token as login. Different
   audiences, lifetimes and validation rules.
5. **Short lifetimes plus rotation.** Access tokens: minutes to an hour.
   Refresh tokens: rotate on every use, detect reuse, revoke the whole family
   when reuse appears — mandatory for public clients.
6. **Sessions vs tokens is a decision, not a reflex.** A first-party
   server-rendered web app is usually best served by an HttpOnly cookie
   session, not a JWT. Reach for OAuth tokens when a third party, a native
   app or a service boundary is involved (table below).
7. **Authorisation is server-side, on every request, deny by default.** Roles
   decide what a caller may *do*; ownership/tenancy decides what they may
   *touch* — check both. UI hiding is not enforcement.
8. **Keys and client secrets are managed material.** Asymmetric signing for
   anything multi-party; rotation via `kid` + JWKS overlap; secrets never in
   code, URLs or logs. A leaked credential is an incident
   (→ `incident-response`), not a to-do.
9. **MFA is phishing-resistant by preference** — passkeys/WebAuthn first,
   TOTP second, SMS last resort — and **recovery flows meet the same bar as
   login**, because they are login.
10. **Log authentication events; never log credentials or tokens.** Login
    success/failure, refresh, revocation, MFA challenges, permission denials
    — with actor and origin, enough to detect stuffing and takeover.

## Decision tables

Client → flow:

| Client | Flow |
|---|---|
| Server-rendered web app (confidential client) | Authorization code + PKCE |
| SPA | Authorization code + PKCE — tokens in memory, or better a BFF (`references/sessions-and-browser-auth.md`) |
| Native / mobile app | Authorization code + PKCE via the system browser (RFC 8252) |
| Service ↔ service, daemons | Client credentials — workload identity/federation over shared secrets where the platform offers it |
| Constrained device / CLI without a browser | Device authorization grant (RFC 8628) |
| API calling a downstream API for the user | Token exchange (RFC 8693) or the platform's on-behalf-of equivalent |
| Anything | Never implicit; never password grant |

Session or token:

| Situation | Choice |
|---|---|
| First-party web app, one backend | Cookie session (HttpOnly, Secure, SameSite) |
| SPA + its own API | BFF: cookie to the browser, tokens held server-side |
| Third-party clients, public API | OAuth 2.0 bearer tokens |
| Native/mobile app | OAuth tokens in the platform keystore |
| Service-to-service hops | JWT access tokens with per-service `aud` |

JWT or opaque access token:

| | JWT | Opaque |
|---|---|---|
| Validation | Local via JWKS — fast, offline | Introspection call (RFC 7662) — one source of truth |
| Revocation | Only as fast as expiry | Immediate |
| Fits | Cross-service, high-volume APIs | Inside the issuer's own perimeter; browser-facing tokens (phantom-token/BFF) |

Authorisation model:

| Model | Reach for it when |
|---|---|
| RBAC | Permissions are stable per job function; a small, nameable role set |
| ABAC | Decisions hinge on attributes/context — tenant, classification, time, ownership |
| ReBAC | Permissions follow relationships — sharing, folder hierarchies, org structures (Zanzibar lineage) |

Start with RBAC plus explicit ownership checks; adopt ReBAC when sharing *is*
the product (`references/authorisation-models.md`).

## High-frequency pitfalls

- **Trusting the token's `alg` header** — `none` and RS256→HS256 confusion;
  pin an allow-list.
- **No `aud` check** — any token from the issuer works on any of its APIs.
- **`redirect_uri` matched by prefix or wildcard** — exact string match only;
  one open subpath is token theft.
- **Missing `state`/`nonce`** — login CSRF and code/ID-token replay.
- **Refresh tokens in localStorage, unrotated** — one XSS is a permanent
  session.
- **Role checked, ownership not** — classic IDOR: any authenticated user
  reads any record.
- **Tenant taken from the request instead of the token** — cross-tenant
  access with a one-line body edit.
- **Logout that only clears the cookie** — the server session and refresh
  tokens live on.
- **Reset/invite/magic-link tokens that are long-lived or reusable** — they
  are credentials: single-use, short expiry, hashed at rest.

## Workflow (designing or reviewing an auth system)

1. Inventory the actors (humans, services, tenants) and the client types.
2. Decide build vs federate: existing IdP first; document what forced
   anything custom.
3. Pick the flow per client from the table; write redirect URIs down exactly.
4. Set the token policy: format (JWT/opaque), lifetimes, rotation, revocation
   path, sender-constraining if the risk warrants it
   (`references/tokens-and-validation.md`).
5. Choose the session strategy per surface; specify cookie attributes and the
   CSRF defence.
6. Model authorisation: roles/attributes/relationships, where checks execute
   (middleware + service layer), tenant-isolation strategy.
7. Design MFA and recovery together; passkeys as the headline path where the
   audience allows.
8. Plan federation: which IdPs, SAML or OIDC, JIT vs SCIM provisioning, the
   account-linking rule.
9. Instrument (non-negotiable 10) and review against
   `references/auth-vulnerabilities.md`; threat-model the flows per
   `secure-development`.

## Reference index

Load on demand:

- `references/oauth-oidc-flows.md` — roles, grant walkthroughs, PKCE mechanics, the OIDC layer (ID token, discovery, userinfo), client authentication, native-app rules
- `references/tokens-and-validation.md` — JWT vs opaque, the validation checklist, JWKS/key rotation, lifetimes, refresh rotation, revocation/introspection, DPoP/mTLS
- `references/sessions-and-browser-auth.md` — cookie sessions done right, SPA token-storage reality, the BFF pattern, CSRF, logout that actually logs out
- `references/mfa-and-passkeys.md` — factor selection, WebAuthn ceremonies, passkey rollout, TOTP, step-up auth, recovery design
- `references/sso-saml-scim.md` — SAML vs OIDC federation, assertion validation, multi-IdP, account linking, JIT vs SCIM provisioning
- `references/authorisation-models.md` — RBAC/ABAC/ReBAC in practice, policy engines, enforcement placement, multi-tenant isolation
- `references/auth-vulnerabilities.md` — the attack catalogue (token, flow, session, credential, MFA) and the review checklist

## Boundaries

- **The broader security frame** — OWASP Top 10/ASVS review method,
  input/output handling, password *hashing* and crypto hygiene depth, threat
  modelling, supply chain → `secure-development`. This skill owns the
  auth-specific engineering inside that frame.
- **API-surface presentation of auth** — 401 vs 403 semantics, scopes per
  endpoint, API keys, rate limiting, CORS → `api-development`.
- **Entra ID specifics** — app registrations, managed identities, conditional
  access, Key Vault plumbing → `azure-development`; Microsoft Graph auth
  flows → `m365-development`.
- **CI/CD identity** — OIDC federated credentials in pipelines →
  `devops-development`. **Cluster identity** — Kubernetes RBAC, workload
  identity → `kubernetes-development`.
- **Framework middleware wiring** (ASP.NET Core handlers, FastAPI
  dependencies, Express middleware) → the language skills; this skill owns
  what the middleware must enforce.
- **Database-level enforcement** (row-level security) → `sql-development`.
- **Compromise response** (leaked secret, takeover in progress) →
  `incident-response`.
