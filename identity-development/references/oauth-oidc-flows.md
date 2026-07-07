# OAuth 2.0/2.1 and OIDC flows

OAuth is delegation ("this client may call this API as me"); OIDC is
authentication layered on top ("and here is a signed statement of who I am").
Keep the two purposes distinct even though one round trip often serves both.

## Roles

- **Resource owner** — the user (or the owning organisation for M2M).
- **Client** — the app requesting access; *confidential* (can hold a secret:
  server-side apps, BFFs) or *public* (cannot: SPAs, native apps).
- **Authorization server (AS)** — issues tokens; the OIDC provider (OP) when
  identity is involved.
- **Resource server (RS)** — the API; validates access tokens.

## Authorization code + PKCE — the default, walked through

1. Client generates a random `code_verifier` (43–128 chars) and derives
   `code_challenge = BASE64URL(SHA-256(code_verifier))`.
2. Browser is sent to the authorization endpoint with `response_type=code`,
   `client_id`, exact `redirect_uri`, `scope`, random `state`, the
   `code_challenge` (+ `method=S256`), and `nonce` when OIDC.
3. AS authenticates the user, gets consent, redirects back with `code` and
   the echoed `state`. Client verifies `state` matches what it stored.
4. Client POSTs the token endpoint: `grant_type=authorization_code`, the
   `code`, the same `redirect_uri`, and the `code_verifier`. Confidential
   clients also authenticate (below).
5. AS re-derives the challenge from the verifier; on match it returns
   `access_token` (+ `refresh_token`, + `id_token` if `openid` scope).
6. Client validates the ID token (`iss`, `aud`, `exp`, `nonce`, signature)
   before trusting identity claims.

PKCE binds the code to the client instance that started the flow, defeating
code interception; `state` defeats login CSRF; `nonce` defeats ID-token
replay. All three, always — even for confidential clients (RFC 9700).

## Grant reference

| Grant | Use | Notes |
|---|---|---|
| Authorization code + PKCE | All user-facing flows | The only user grant in OAuth 2.1 |
| Client credentials | M2M, daemons, jobs | No user context — no ID token, no refresh token; prefer `private_key_jwt` or platform workload identity over shared secrets |
| Refresh token | Renewing access without re-auth | Rotate on use for public clients; see `tokens-and-validation.md` |
| Device authorization (RFC 8628) | TVs, CLIs, IoT — no usable browser | User enters `user_code` on a second device; client polls the token endpoint at the prescribed interval |
| Token exchange (RFC 8693) | Service calls a downstream API on the user's behalf | Swaps one token for a narrower one; Entra's on-behalf-of is the same shape |
| CIBA | Decoupled auth (agent asks, user approves on their phone) | Decision-level: confirm AS support before designing on it |
| Implicit, password (ROPC) | Never for new work | Removed in OAuth 2.1; RFC 9700 forbids them |

## What OAuth 2.1 consolidates (draft, July 2026 — re-verify status)

- PKCE required for every authorization-code flow, all client types.
- Implicit (`response_type=token`) and password grants removed.
- Exact string matching for `redirect_uri` — no wildcards, no prefixes.
- Refresh tokens for public clients must be sender-constrained or rotated.
- Bearer tokens never in query strings.

Build to these today: they are current BCP (RFC 9700), not future rules.

## The OIDC layer

- **Scopes**: `openid` switches OIDC on; `profile`, `email`, `offline_access`
  (refresh token) as needed — request the minimum.
- **ID token claims to validate**: `iss`, `aud` (= your `client_id`), `exp`,
  `iat`, `nonce`; use `auth_time`/`acr`/`amr` when you enforce session age or
  MFA method.
- **`sub` is the stable user key** — per issuer, and per client when the AS
  uses pairwise identifiers. Never key accounts on email
  (`sso-saml-scim.md`).
- **Discovery**: `/.well-known/openid-configuration` publishes endpoints,
  `jwks_uri`, and supported algorithms — configure clients from it rather
  than hardcoding endpoints.
- **UserInfo endpoint**: extra claims with the access token; prefer ID-token
  claims for anything you make security decisions on.

## Client authentication (confidential clients)

| Method | Standing |
|---|---|
| `private_key_jwt` (signed JWT assertion) | Preferred — no shared secret crosses the wire |
| mTLS (RFC 8705) | High assurance; also sender-constrains tokens |
| `client_secret_basic` / `_post` | Acceptable baseline; rotate secrets, vault them |

## Native apps (RFC 8252)

- Use the **system browser** (ASWebAuthenticationSession, Custom Tabs) —
  never an embedded webview: the app can read the password, SSO breaks, and
  IdPs increasingly block webview logins.
- Redirect via claimed HTTPS links (Universal Links / App Links) in
  preference to custom URI schemes, which any app can register.
- Store tokens in the platform keystore (Keychain, Android Keystore).
