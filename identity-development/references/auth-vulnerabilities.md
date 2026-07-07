# Auth vulnerability catalogue and review checklist

The auth-specific attack classes, organised by where they bite. The general
review method and OWASP mapping (A01 Broken Access Control, A07
Identification and Authentication Failures) live in `secure-development`;
this file is the domain depth behind it.

## Token attacks

- **`alg: none`** — header says unsigned, naive libraries oblige. Pin an
  algorithm allow-list in config; never read `alg` to decide validation.
- **RS256 → HS256 confusion** — attacker re-signs the token with HMAC using
  the *public* key as the secret; a library dispatching on the header
  verifies it. Same fix: your allow-list, per key type.
- **`kid` injection** — the key-ID header used unsanitised in a path or SQL
  lookup. Treat `kid` as attacker input: look up only within your fetched
  JWKS by exact match.
- **Missing `aud`/`iss` checks** — tokens minted for one service replayed
  against another; the single most common JWT integration bug.
- **Weak HMAC secrets** — one captured token allows offline brute force of a
  human-chosen HS256 secret; then the attacker mints tokens at will.
  High-entropy keys or asymmetric signing.
- **Token in URL** — query strings persist in logs, history, referrers.
  Headers or POST bodies only.

## OAuth/OIDC flow attacks

- **Authorization-code interception** — a leaked/observed code redeemed by
  the attacker. PKCE kills it; that's why it's mandatory everywhere.
- **Redirect URI manipulation** — prefix/wildcard matching or an open
  redirect on an allowed URI chains to token delivery at an attacker origin.
  Exact-match registration; audit every redirector on allowed hosts.
- **Missing `state`** — login CSRF: the victim's browser completes the
  *attacker's* flow, silently signing them into the attacker's account
  (anything the victim then saves lands in attacker-readable space).
- **Missing `nonce`** — replayed ID tokens accepted as fresh logins.
- **Mix-up attacks** (multiple AS configured) — a malicious/compromised AS
  induces the client to send codes/tokens for AS-A to AS-B's endpoints. Use
  the `iss` authorization-response parameter (RFC 9207) / per-AS distinct
  redirect URIs.
- **Consent phishing** — a legitimate-looking OAuth client requests broad
  scopes and the *user* grants the attacker durable API access; no password
  stolen, MFA irrelevant. Mitigate as an IdP/tenant admin: publisher
  verification, admin-consent policies (→ `azure-development` for Entra).

## Session attacks

- **Fixation** — pre-login session ID survives authentication. Regenerate on
  login.
- **Hijacking** — stolen cookie = stolen session; `HttpOnly`, `Secure`,
  short lifetimes, and server-side revocation bound the damage.
- **CSRF** — layered defence per `sessions-and-browser-auth.md`.
- **Cookie tossing** — subdomain sets a shadow cookie; `__Host-` prefix.

## Credential attacks

- **Credential stuffing** (breached pairs replayed) and **password
  spraying** (one common password across many accounts). Defences layer:
  breached-password screening on set/change (k-anonymity range API — Have I
  Been Pwned's model), per-account throttling with backoff, per-IP/ASN and
  per-identifier rate limits, MFA as the backstop.
  Lockout policy is a trade-off: hard lockout enables denial-of-service
  against known usernames — prefer escalating delays + step-up challenges.
- **Enumeration** — differing errors, timing or response sizes on
  login/registration/reset reveal which accounts exist. Uniform responses
  ("if that account exists, we've emailed it"), uniform timing (hash even
  for unknown users).
- **Reset-flow weaknesses** — guessable/long-lived/reusable tokens, token
  not invalidated on use or password change, reset link over HTTP, host
  header injection poisoning the emailed link. Single-use, short-lived,
  hashed at rest, absolute URLs from config.
- Password *storage* (Argon2id/bcrypt parameters) → `secure-development`.

## MFA bypass

- **Real-time phishing relays** (evilginx-class) forward OTPs instantly —
  only origin-bound factors (passkeys) resist.
- **Push fatigue** — bombard until the victim approves; number-matching and
  prompt rate limits.
- **SIM swap** — SMS OTP inherits telco account security.
- **Recovery downgrade** — the reset flow quietly bypasses or disables MFA;
  factor removal must itself be step-up-gated and notified
  (→ `mfa-and-passkeys.md`).
- **Remembered-device abuse** — device trust tokens that never expire or
  survive password reset.

## Review checklist (run against any auth change)

1. Token validation: allow-listed `alg`, `iss`, `aud`, `exp`/`nbf`, `kid`
   handled as untrusted input?
2. Flow: PKCE + `state` + `nonce` present; redirect URIs exact-match; codes
   single-use?
3. Sessions: regenerated on login; `__Host-`/`HttpOnly`/`Secure`/`SameSite`;
   CSRF defence beyond SameSite; logout revokes server-side?
4. Storage: no tokens in localStorage/URLs/logs; refresh rotation with reuse
   detection?
5. Authorisation: object-level ownership + tenant checks, not just role
   checks; tenant from token; deny by default?
6. Credentials: uniform enumeration-safe errors; throttling; breached-password
   screening; reset tokens single-use and short-lived?
7. MFA: phishing-resistant option available; recovery and factor-removal
   flows at login strength; push protections?
8. Logging: auth events captured (non-negotiable 10) with no
   secrets/tokens in the log stream?
