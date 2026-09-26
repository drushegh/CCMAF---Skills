# OWASP Frameworks: Top 10:2025, ASVS 5.0, Cheat Sheets

## OWASP Top 10:2025 (published; supersedes 2021)

| # | Category | Review focus |
|---|----------|--------------|
| A01 | Broken Access Control | Object-level authz (IDOR), deny-by-default, server-side enforcement, CORS, forced browsing |
| A02 | Security Misconfiguration | Defaults, debug surfaces, headers, cloud storage permissions, verbose errors |
| A03 | Software Supply Chain Failures | Dependencies, build pipeline, update channels — see `supply-chain.md` |
| A04 | Cryptographic Failures | Data-in-transit/at-rest, weak algorithms/modes, key management, secrets exposure |
| A05 | Injection | SQL/NoSQL/OS/LDAP + XSS (classified under injection), parameterisation, output encoding |
| A06 | Insecure Design | Missing threat modelling, absent abuse cases, design-level flaws no patch fixes |
| A07 | Authentication Failures | Credential stuffing defence, MFA, session fixation/timeout, password policy (NIST-aligned) |
| A08 | Software or Data Integrity Failures | Unsigned updates, insecure deserialisation, CI/CD artefact integrity |
| A09 | Security Logging and Alerting Failures | Auditable events captured, integrity of logs, ALERTING actually wired (renamed in 2025 to stress it) |
| A10 | Mishandling of Exceptional Conditions | NEW: fail-open errors, partial state, leaking stack traces, unhandled edge paths |

2021→2025 changes worth knowing in reviews: supply chain elevated and
broadened (was A06 vulnerable/outdated components); SSRF folded into
A01/related categories rather than standalone; exceptional-conditions
handling is new and catches what code reviews usually wave through.
Citations: cite as `A0x:2025`; legacy reports may still use 2021 IDs —
map explicitly when comparing.

## ASVS 5.0.0 (May 2025)

Application Security Verification Standard — ~350 requirements in 17
chapters; THE checklist for "is this verifiably secure", and the right
framework to cite in security assessments (Top 10 is awareness, ASVS is testable).

- **Levels**: L1 (baseline, all apps), L2 (default for apps handling
  sensitive data — the sensible default target), L3 (high
  assurance: financial/health/critical).
- Use chapter-wise during reviews. The 5.0 chapters: V1 Encoding and
  Sanitization, V2 Validation and Business Logic, V3 Web Frontend
  Security, V4 API and Web Service, V5 File Handling, V6 Authentication,
  V7 Session Management, V8 Authorization, V9 Self-contained Tokens,
  V10 OAuth and OIDC, V11 Cryptography, V12 Secure Communication,
  V13 Configuration, V14 Data Protection, V15 Secure Coding and
  Architecture, V16 Security Logging and Error Handling, V17 WebRTC.
  (4.0.3's "Malicious Code" chapter is gone — folded into V15.)
- 5.0 reorganised and renumbered substantially vs 4.0.3 — don't quote
  4.x requirement IDs against 5.0; check the published mapping.
- Practical use: pick the level per data classification, generate the
  applicable requirement list, demand evidence per item (test, config,
  code reference), and report coverage percentage honestly.

## Cheat Sheet Series

cheatsheetseries.owasp.org — implementation-grade guidance per topic.
Reach for these before inventing patterns:

Authentication; Session Management; Authorization; Input Validation;
XSS Prevention; SQL Injection Prevention; Cryptographic Storage;
Password Storage; Secrets Management; REST/API Security; File Upload;
Deserialisation; XML External Entity Prevention; SSRF Prevention;
Docker/Kubernetes Security; CI/CD Security; Logging; Error Handling;
Threat Modeling; LLM Prompt Injection Prevention.

## Other OWASP assets worth knowing

- **OWASP API Security Top 10** (2023) — API-specific list (BOLA top);
  use for API-heavy reviews.
- **OWASP Top 10 for LLM Applications (2025)** — LLM01 Prompt
  Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain,
  LLM04 Data and Model Poisoning, LLM05 Improper Output Handling,
  LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector and
  Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded
  Consumption. (The 2023 names "Insecure Output Handling" / "Training
  Data Poisoning" are superseded.) Relevant to AI feature reviews
  alongside `eu-ai-act.md`.
- **SAMM** — maturity model for programme-level conversations.
- **Dependency-Check / CycloneDX** — see `supply-chain.md`.
