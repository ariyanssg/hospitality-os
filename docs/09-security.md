# 09 — Security Design

> Hotels hold passports, payment cards, stay patterns, and minors' data. Security here is a sales feature (enterprise RFPs) and an existential risk (one breach ends a hospitality vendor). Design posture: fail closed, encrypt PII at the field level, keep card data out of scope entirely.

---

## 1. Identity & Authentication (Better Auth)

- **Better Auth** runs inside the NestJS API (single deployable), Postgres-backed sessions, cookie-based for first-party apps (HttpOnly, Secure, SameSite=Lax), short-lived session tokens with sliding refresh and absolute lifetime (12h staff / 30d guest portal, tenant-configurable).
- **Org plugin** maps to our tenancy: organizations = tenants; our own membership/role tables remain authoritative for permissions (Better Auth handles identity, not authorization).
- **MFA:** TOTP + passkeys (WebAuthn) as first-class; SMS only as fallback. Enforced by policy per tenant/role — critical-permission roles (finance, admin) can be *required* to enroll. Sudo mode: critical actions (`payment.refund`, `payroll.run`, `role.manage`, `guest.export`) require re-auth within 10 min.
- **SSO:** SAML/OIDC per tenant (enterprise tier) via Better Auth SSO plugin; SCIM provisioning later. Domain-capture onboarding for chains.
- **Workstation reality at front desk:** shared-terminal fast user switching via per-user PIN re-auth on a device-bound session (badge/PIN switch in <2s) — this is how we prevent the universal "everyone uses the manager's login" anti-pattern that destroys auditability in hotels.
- Service auth: scoped API keys (hashed, prefixed), per-integration; internal workers use short-lived IAM-issued credentials, not static secrets.

## 2. Authorization

RBAC with fine-grained permissions and scope (full design: [06-permission-engine.md](06-permission-engine.md)). Security-relevant guarantees: deny-by-default guards on every route (a route without a permission decorator fails CI), server-authoritative decisions, deny-overrides, risk-tiered permissions with sudo + reason capture, quarterly access-review report.

## 3. Tenant Isolation

Postgres RLS forced on all tenant tables, fail-closed session context, non-BYPASSRLS app role, tenant-prefixed cache/file/search scoping, audited break-glass for support access (full design: [05-multi-tenancy.md](05-multi-tenancy.md)).

## 4. Data Protection & Encryption

| Layer | Mechanism |
|---|---|
| Transport | TLS 1.2+ everywhere (external + service-to-mesh); HSTS preload |
| At rest | AES-256 volume encryption (RDS/EBS/S3, KMS CMKs) |
| **Field-level PII** | Application-layer envelope encryption for high-sensitivity fields: passport/ID numbers, date of birth, payment-adjacent metadata. Per-tenant data keys wrapped by KMS; blind indexes (HMAC) for equality search on encrypted fields |
| Display | PII masked by default in UI (`•••• 4242`, partial passport); unmasking requires `guest.pii.view` and is audit-logged |
| Backups | Encrypted, cross-region, access-logged; restore drills quarterly |

**Crypto-shredding:** deleting a guest (GDPR erasure) destroys their wrapped data key — encrypted history becomes unreadable without rewriting financial records (which must be retained); clear-text PII fields are simultaneously redacted/tombstoned.

## 5. PCI DSS Strategy: stay out of scope

We **never store, process, or transmit PANs** through our systems:

- All card entry via PCI-L1 PSP elements (Stripe/Adyen iframes or SDKs) → we hold only tokens.
- Booking-engine guarantees: PSP tokenization at capture; OTA virtual cards retrieved just-in-time via PSP, never persisted.
- POS terminals: PSP-provided P2PE devices; the POS app exchanges payment intents/refs only.
- Result: SAQ-A posture for the platform; PCI DSS v4.0 requirements (tokenization, audit logging) satisfied structurally. Embedded-payments revenue (Mews/Cloudbeds/Toast model) is a PSP partnership (Stripe Connect / Adyen for Platforms), not in-house acquiring.

## 6. GDPR & Privacy

- Lawful-basis mapping per data category; guest consent records (marketing) with timestamped proof.
- **DSAR tooling in-product:** export (all guest data, machine-readable), rectification, erasure (crypto-shred + redact, with legal-retention carve-outs for fiscal records — documented retention matrix per country), restriction flags honored by campaign engine.
- Data minimization: retention policies per entity (e.g., ID document images auto-purge N days post-checkout, configurable per jurisdiction).
- Processor posture: we are processor, tenant is controller; DPA templates, sub-processor registry, EU data residency via cell architecture (see `04-system-architecture.md §10`).
- Privacy by default: PII masking, no cross-tenant guest identity linking, analytics on aggregates.

## 7. OWASP & Application Security

| Risk | Control |
|---|---|
| Injection | Parameterized queries only (Drizzle/raw with params); CI greps for string-built SQL; Zod validation at every boundary |
| Broken access control | Route-level permission guards + RLS + object-ownership checks; automated authz test suite per endpoint (the #1 API risk gets its own CI stage) |
| SSRF | Webhook/CMS URL fetches through egress proxy with allow-listing + private-IP block |
| XSS | React escaping + CSP (nonce-based, no unsafe-inline) on staff apps; CMS-rendered sites sandboxed to their own origin with sanitized rich text |
| CSRF | SameSite cookies + origin checks (Better Auth built-in) |
| Vulnerable deps | Renovate + `pnpm audit` gate + container scanning (Trivy) in CI; SBOM published |
| Secrets | AWS Secrets Manager + External Secrets Operator → K8s; no secrets in env files/repo (gitleaks in CI); 90-day rotation, dual-key DB credential rotation |
| Supply chain | Lockfile-only installs, provenance checks, pinned base images |

- Security headers baseline (CSP, X-Content-Type-Options, frame-ancestors, Referrer-Policy) on all apps.
- Rate limiting + bot defense on auth and booking-engine endpoints (credential stuffing and card-testing are the observed attack patterns for hotel tech).
- Pen test annually + before enterprise launches; private bug bounty from GA.

## 8. Audit & Detection

- Immutable `audit_log` (07) with 7-year retention; auth events (login, MFA, failures, key usage) included.
- Detection rules: impossible travel on staff logins, refund-rate anomalies per cashier, mass guest-export attempts, permission-escalation patterns → alerts to tenant admins + our SOC channel.
- All infra API calls via CloudTrail; K8s audit logs shipped to the same SIEM pipeline (OpenSearch security tier).

## 9. Compliance Roadmap

SOC 2 Type I by GA → Type II within 12 months; ISO 27001 when enterprise pipeline demands; PCI SAQ-A maintained; GDPR/UK-GDPR day one; regional fiscal certifications (fiscal printers/e-invoicing: country-by-country in expansion plan, see `16-risks-and-future.md`).

---

Related: [05-multi-tenancy.md](05-multi-tenancy.md) · [06-permission-engine.md](06-permission-engine.md) · [11-infrastructure.md](11-infrastructure.md)
