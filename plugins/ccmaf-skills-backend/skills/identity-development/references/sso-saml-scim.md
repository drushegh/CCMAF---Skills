# SSO, SAML and provisioning (SCIM)

Enterprise SSO means your app (the service provider, SP / relying party, RP)
outsources authentication to the customer's IdP. The engineering is in
validating what the IdP asserts and keeping accounts, tenants and lifecycle
in sync.

## SAML or OIDC for federation?

| Factor | OIDC | SAML 2.0 |
|---|---|---|
| Default for new work | **Yes** — JSON/JWT, mobile-friendly, simpler to validate | Only when the counterparty demands it |
| Enterprise IdP support | Universal among modern IdPs | Universal, including legacy stacks — why it persists |
| Failure modes | JWT validation mistakes | XML canonicalisation/signature-wrapping mistakes — a harsher class |

Practical stance: implement OIDC first; add SAML because enterprise sales
will require it, and treat it as a hardened, library-driven edge — never
hand-written XML handling.

## SAML essentials

- **Metadata exchange** bootstraps trust: entity IDs, certificates, endpoint
  URLs. Consume the IdP's metadata URL (rotation-friendly) rather than
  pasting certificates.
- **SP-initiated flow** (user starts at your app → AuthnRequest → IdP →
  signed response to your ACS endpoint) is the default.
  **IdP-initiated** (unsolicited assertions from the IdP portal) is more
  exposed (no `InResponseTo` binding) — support it only on customer demand,
  with replay protection tightened.
- Assertions carry `NameID` (the subject), attributes (email, groups), and
  validity conditions.

### Assertion validation — every item, every time

1. Validate the **signature on the assertion itself** (not only the response
   envelope) with a maintained SAML library; reject unsigned assertions.
2. XML parsing hardened: external entities and DTDs disabled (XXE), the
   library's protections against **signature wrapping** current — validate
   exactly the node that was signed.
3. `Audience` restriction matches your SP entity ID exactly.
4. `NotBefore` / `NotOnOrAfter` with small clock skew (minutes, not hours).
5. `InResponseTo` matches an AuthnRequest you actually issued (SP-initiated).
6. Assertion `ID` cached until expiry and rejected on re-presentation
   (replay).
7. The certificate chains to the metadata-pinned trust for **this tenant's**
   IdP — see cross-tenant confusion below.

## Multi-IdP and account linking

- **Home-realm discovery**: map email domain → tenant → IdP config
  (per-tenant entity IDs/issuers, certificates, ACS/redirect URIs).
- **Identity key**: accounts link to `iss` + `sub` (OIDC) or IdP entity ID +
  `NameID` (SAML). **Email is a display attribute, not a key** — it changes,
  is reassignable, and some IdPs let admins set it freely, so email-based
  auto-linking lets a hostile IdP claim accounts it doesn't own.
- Linking an SSO identity to an existing local account requires the user to
  prove control of that account (fresh local login or verified-email loop
  with explicit confirmation) — never silent merge-on-matching-email.
- **Cross-tenant assertion confusion**: verify the asserting IdP is the one
  configured for the tenant the user lands in. Tenant A's IdP asserting a
  `sub`/email that collides with tenant B must never open tenant B.

## Provisioning: JIT vs SCIM

| | JIT (just-in-time) | SCIM 2.0 (RFC 7643/7644) |
|---|---|---|
| Create accounts | First SSO login, from assertion attributes | IdP pushes to your `/scim/v2` endpoint ahead of login |
| Update / group sync | Only at login — staleness between logins | Near-real-time PATCH from the IdP |
| **Deprovisioning** | **None** — the leaver's account persists until session/token expiry | The point of SCIM: deactivate on offboarding |

JIT alone is an offboarding hole; enterprise customers will (rightly) demand
SCIM. Implementation notes:

- Resources: `Users` and `Groups`; support `GET`/`POST`/`PUT`/`PATCH` with
  SCIM filter syntax at least on `userName` and `externalId`.
- `externalId` is the IdP's correlation key — store it, echo it back,
  never repurpose it.
- **Deactivate (`active: false`), don't delete** — audit trails and data
  ownership survive offboarding; also kill live sessions and refresh tokens
  on deactivation, not just the next login.
- Authenticate the SCIM endpoint itself (per-tenant long-lived bearer or
  mTLS), rate-limit it, and log every provisioning mutation.

## Session semantics under SSO

Your app session and the IdP session have independent lifetimes. Decide
explicitly: does IdP logout end your session (SAML Single Logout /
OIDC back-channel logout — both operationally fiddly), and does your
"log out" end only the local session? Enterprise security reviews ask;
"whatever the library did" is the wrong answer. General session mechanics →
`sessions-and-browser-auth.md`; Entra-specific federation →
`azure-development`.
