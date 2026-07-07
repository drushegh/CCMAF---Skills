# MFA and passkeys/WebAuthn

## The factor ladder (strongest first)

| Factor | Phishing-resistant? | Notes |
|---|---|---|
| Passkey / WebAuthn (platform or security key) | **Yes** — origin-bound by construction | The default to design towards |
| TOTP authenticator app (RFC 6238) | No — codes can be relayed in real time | Solid baseline; offline; no telco dependency |
| Push approval | No — approval fatigue | Require number-matching, show request context, rate-limit prompts |
| SMS / email OTP | No — plus SIM-swap and inbox-takeover exposure | Last resort; never for high-value accounts if avoidable |

Phishing resistance is the dividing line: WebAuthn signatures include the
origin and are bound to the relying party ID, so a proxy site (evilginx-style
relay) gets a signature that verifies for the wrong origin — worthless.
OTP-anything can be relayed live. (Threat detail:
`auth-vulnerabilities.md`.)

## Passkeys — the model (July 2026 — re-verify platform specifics)

A passkey is a WebAuthn **discoverable credential**: a key pair where the
private key stays in the authenticator and the RP stores only the public key.

- **Synced passkeys** (iCloud Keychain, Google Password Manager, password
  managers): survive device loss, mainstream-consumer friendly. Assurance
  trade-off: the credential is as safe as the sync account.
- **Device-bound keys** (security keys, some platform configs): higher
  assurance, no recovery-by-sync — enterprise/admin fit.
- **Cross-device sign-in**: a QR-code + proximity (hybrid/CTAP) flow lets a
  phone-held passkey sign a laptop in — don't build your own bridging.

## WebAuthn ceremonies — server responsibilities

Registration (`navigator.credentials.create`) and authentication
(`navigator.credentials.get`) are browser-side; the security lives in your
server checks:

- Challenge: random ≥ 16 bytes, single-use, short-lived, generated
  server-side per ceremony.
- Verify the client data: `type`, your exact `origin`, your `rpId`, and that
  the returned challenge matches the one you issued.
- Registration: store credential ID, public key, and transports; enforce
  `userVerification` per policy (passkey-as-MFA vs passwordless).
- Authentication: verify the assertion signature against the stored key.
  Signature counters exist for clone detection, but **synced passkeys
  commonly report 0** — treat a counter regression as a signal to
  investigate, not an automatic hard-fail.

```js
// Browser side — shape only; generate options server-side per ceremony.
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: challengeFromServer, // Uint8Array, single-use
    rp: { id: "example.com", name: "Example" },
    user: { id: userHandle, name: "dana@example.com", displayName: "Dana" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    authenticatorSelection: {
      residentKey: "required",       // discoverable => a passkey
      userVerification: "preferred",
    },
  },
});
```

Use a maintained server library (SimpleWebAuthn for Node, `webauthn`
libraries per stack) — assembling CBOR/attestation parsing by hand is the
SAML-XML mistake with fresher syntax. Skip attestation verification unless
you genuinely allow-list authenticator models (enterprise); most RPs should
request `attestation: "none"`.

## Rollout and step-up

- Offer passkey enrolment at high-motivation moments (right after login or
  password reset), not buried in settings. Keep the password path until
  passkey coverage justifies removing it — track enrolment.
- **Step-up authentication**: gate destructive/high-value actions on a fresh
  factor (`auth_time`/`acr` claims let the API demand recency, not just
  presence, of authentication).
- Risk-based challenge (new device, new geography, credential-stuffing
  pressure) beats challenging every login — friction spends trust.

## TOTP mechanics worth enforcing

Encrypt seeds at rest (they are shared secrets — a dumped table mints valid
codes forever); accept a ±1 window (30 s steps) only; throttle and lock after
repeated failures; rate-limit enrolment QR regeneration.

## Recovery — the same bar as login

Recovery is an authentication path; attackers prefer it because it's usually
weaker.

- Recovery codes: one-time, high-entropy, hashed at rest like passwords,
  regenerable as a set.
- Never security questions. Email-based recovery inherits the inbox's
  security — acceptable for low-value accounts, explicitly insufficient
  above that.
- A recovery flow must not silently downgrade MFA (reset password → MFA
  quietly disabled = the bypass). Removing a factor is itself a step-up-gated,
  notified, audited event.
- Human support channels get social-engineered: script identity verification
  for support staff and audit resets. Active-takeover handling →
  `incident-response`.
