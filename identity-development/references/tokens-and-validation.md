# Tokens: formats, validation, rotation, revocation

## JWT anatomy, briefly

Header (`alg`, `kid`, `typ`) · payload (claims) · signature, each
base64url-encoded. Signed, **not encrypted** — anyone holding a JWT can read
it. Never put secrets or gratuitous PII in claims; keep tokens small (they
travel on every request, and cookie-carried tokens hit the ~4 KB cookie
ceiling). RFC 9068 profiles JWT access tokens (`typ: at+jwt`) — prefer it so
access and ID tokens can't be confused for each other.

## The validation checklist (resource server)

Run all of it, in this order, on every request:

1. Parse without trusting — treat header and payload as attacker input until
   the signature verifies.
2. **Algorithm allow-list** pinned in *your* config (e.g. `RS256`/`ES256`).
   Never dispatch on the token's `alg`; reject `none` and any HMAC alg for
   keys published as public JWKS.
3. **Key by `kid`** from the issuer's JWKS (`jwks_uri` in discovery). Cache
   keys; on an unknown `kid`, refresh the JWKS once — with backoff, so a
   forged `kid` can't stampede the IdP.
4. **`iss`** exact-match against the expected issuer.
5. **`aud`** contains this API's identifier — the check that stops a token
   minted for one API being replayed against another.
6. **`exp` / `nbf`** with bounded clock skew (≤ 60 s).
7. `typ` is what you expect (`at+jwt` where the AS supports RFC 9068).
8. Only then read business claims: `scope`, roles, `sub`, tenant.

```js
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(
  new URL("https://idp.example.com/.well-known/jwks.json"),
);

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "https://idp.example.com",
    audience: "https://api.example.com",
    algorithms: ["RS256", "ES256"],
    clockTolerance: 60, // seconds
  });
  return payload; // scope/role/tenant checks happen after this, never instead of it
}
```

(`jose` is the widely used, maintained JS implementation; every mainstream
stack has an equivalent — use it rather than assembling checks by hand.)

## Lifetimes

| Token | Lifetime | Rationale |
|---|---|---|
| Access token | 5–60 min | Blast radius of a stolen token; revocation latency for JWTs |
| ID token | Minutes — consume at login, don't store | It proves *an authentication event*, not a session |
| Refresh token | Hours–days (public clients, rotating) to ~90 days (confidential, with revocation) | Balance re-auth friction against exposure |
| Reset / invite / magic-link | 10–60 min, single-use | They are passwords with a countdown |

## Refresh rotation and reuse detection

Public clients: every refresh issues a **new** refresh token and invalidates
the old one. If a supposedly spent token is presented again, both parties may
hold it — a theft signal: **revoke the entire token family** and force
re-authentication. Confidential clients should still rotate; they just have a
second factor (client auth) softening the risk. Handle the failure mode:
serialise concurrent refreshes per session, or a network retry will trip your
own reuse detector.

## Revocation and introspection

- **Revocation** (RFC 7009): clients hand back refresh/access tokens on
  logout. JWT access tokens can't be un-issued — short expiry *is* the
  revocation story, plus a server-side denylist keyed by `jti` for the
  break-glass case (account compromise, employee offboarding).
- **Introspection** (RFC 7662): the RS asks the AS whether an opaque token is
  active and for its claims. RS-side only — never expose introspection to
  public clients. The **phantom token** pattern: opaque token outside, a
  gateway introspects and forwards a JWT inside — browser-safe outside,
  local validation inside.

## Sender-constrained tokens

Bearer means *whoever holds it wins*. When the risk profile warrants more
(payments, admin APIs, long-lived public-client sessions):

- **DPoP** (RFC 9449) — the client proves possession of a key pair on every
  request via a signed header; works for SPAs and native apps.
- **mTLS binding** (RFC 8705) — the token is bound to the client certificate;
  the fit for service-to-service and regulated APIs (FAPI profiles).

Adopt where supported end to end (AS + RS + client); don't half-deploy.

## Signing-key management

- Asymmetric signing for anything crossing a party boundary; HMAC only within
  a single trust domain, with high-entropy keys (a guessable HS256 secret is
  offline-brute-forceable from any one token).
- Rotate via **JWKS overlap**: publish the incoming key, start signing with
  it, keep the outgoing key published until every token it signed has
  expired. Consumers that cache JWKS handle rotation automatically; pinned
  single keys break it.
- Key material lives in a KMS/vault; signing happens where the key lives —
  the key never ships to the app tier. Storage hygiene depth →
  `secure-development`.
