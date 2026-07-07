# Sessions and browser auth security

The browser is the most hostile client you have: it runs third-party code
(XSS), follows cross-site requests (CSRF), and leaks state through caches and
history. Session design is mostly about deciding what a stolen browser
context can and cannot do.

## Cookie sessions done right

The default for first-party web apps. Server holds the session; the browser
holds only an identifier.

```http
Set-Cookie: __Host-session=8f0a…; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800
```

- **`HttpOnly`** — script can't read it; XSS can *use* the session while the
  tab is open but can't exfiltrate a reusable credential.
- **`Secure` + `__Host-` prefix** — HTTPS-only, no `Domain` attribute,
  `Path=/`: immune to being overridden by a compromised subdomain ("cookie
  tossing").
- **`SameSite=Lax`** as the floor (`Strict` for admin surfaces): blocks
  cross-site POSTs. It is defence-in-depth, **not** the whole CSRF story.
- Session ID: ≥ 128 bits from a CSPRNG, meaningless (no encoded user data).
- **Regenerate the ID on login and on privilege change** — otherwise a
  pre-login ID fixed on the victim (session fixation) survives into the
  authenticated session.
- Idle timeout **and** absolute timeout, enforced server-side; server-side
  store so revocation ("sign out everywhere", admin kill) is immediate.

## CSRF — the layered defence

1. `SameSite=Lax/Strict` cookies.
2. **Anti-CSRF token** (synchroniser pattern) or signed double-submit for any
   state-changing request in cookie-authenticated apps — framework built-ins,
   not hand-rolled.
3. For JSON APIs: require a custom header (e.g. `X-Requested-With`) — a
   cross-site form can't set one without a CORS preflight the API refuses.
4. No state changes on GET, ever (also what makes `Lax` safe).
5. Verify `Origin` on sensitive endpoints as a backstop.

Login and logout are CSRF targets too: an attacker logging the victim into
the *attacker's* account (login CSRF — the `state` parameter and pre-session
tokens defeat it), or logging them out as harassment.

## SPA token storage — the honest ranking

Where an XSS payload can reach determines everything:

| Storage | Verdict |
|---|---|
| `localStorage` / `sessionStorage` | Readable by any injected script — tokens exfiltrate silently. Avoid for refresh tokens outright; avoid for access tokens unless short-lived and the threat model accepts it |
| In-memory (module variable) | Best pure-SPA option: gone on reload, not enumerable from storage. Pair with a rotating refresh token in an `HttpOnly` cookie scoped to the token endpoint |
| `HttpOnly` cookie via a BFF | Strongest: no token ever reaches JS |

**The BFF (backend-for-frontend) pattern** — current IETF browser-based-apps
guidance ranks it first (draft as of July 2026 — re-verify): a small
server-side component does the authorization-code + PKCE dance, keeps access
and refresh tokens server-side, and gives the browser a plain `__Host-`
session cookie. API calls proxy through the BFF, which attaches the token.
XSS on the SPA is reduced to *using* the session (bad) rather than *stealing
durable credentials* (worse) — and CSP plus output encoding
(→ `secure-development`) attack the XSS itself.

## Logout that actually logs out

A logout button that deletes the cookie and redirects has done a third of
the job:

1. Destroy the server-side session (or denylist the JWT `jti`).
2. Revoke the refresh token (RFC 7009) — and its family.
3. Clear the cookie (expire it with the same attributes it was set with).
4. Federated logins: decide the SSO story deliberately. OIDC RP-initiated
   logout ends the IdP session too; front-/back-channel logout propagates
   IdP-initiated logout to your app. "Logged out locally, still logged in at
   the IdP" surprises users — pick and document.

## Handling failure states

- Session-expired responses must be distinguishable (401 + a machine-readable
  reason) so SPAs can silently re-auth or redirect rather than corrupting
  in-flight state.
- Remember-me: a separate long-lived, rotating, single-use token series —
  never "just make the session cookie last a year".
- Concurrent session policy (allow, cap, or evict-oldest) is a product
  decision — but make it, and surface active sessions to the user.
