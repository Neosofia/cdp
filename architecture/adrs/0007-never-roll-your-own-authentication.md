# 07. Never Implement Custom Authentication; Use a Qualified Identity Provider

Date: 2026-04-19

## Status

Accepted — WorkOS selected as the identity provider pending formal vendor qualification

## Context

Authentication is one of the highest-risk components in any system handling sensitive medical data. Common failure modes — credential stuffing, session fixation, token forgery, timing attacks on password comparison, insecure password storage, missing MFA — are well-documented, frequently exploited, and catastrophic in a HIPAA-regulated context.

The engineering temptation to "roll your own" authentication exists because the basic flow (username + password → session token) appears simple. It is not. Secure authentication requires:

- Constant-time credential comparison (to prevent timing attacks)
- Secure password hashing (bcrypt/argon2 with correct cost parameters)
- Brute-force and credential-stuffing protection
- MFA (TOTP, WebAuthn, SMS fallback)
- Enterprise SSO federation (SAML, OIDC)
- Refresh token rotation with reuse detection
- Session revocation and device management
- Compliance with NIST SP 800-63B (Digital Identity Guidelines)
- Ongoing security patching as vulnerabilities are discovered

Building and maintaining all of this correctly is a full-time security engineering function. CDP does not have that function, and should not need to.

## Decision

**CDP MUST NEVER implement a custom authentication system.** This is a non-negotiable, permanent architectural constraint.

All human authentication (patient and clinician) MUST be delegated to a qualified external identity provider. The Auth Service acts as a relying party only: it validates assertions from the identity provider and issues platform-scoped tokens. No CDP service may implement password hashing, credential storage, login flows, MFA, or session management independently.

**WorkOS** is the selected identity provider for v1, subject to successful completion of vendor qualification (see below). WorkOS provides:

- OIDC-compliant authentication flows
- Built-in MFA
- Enterprise SSO (SAML, Google Workspace, Microsoft Entra)
- Refresh token rotation with reuse detection
- HIPAA BAA availability
- Hosted AuthKit UI (reduces CDP surface area further)

## Vendor Qualification Required

WorkOS has been selected based on technical evaluation and architecture fit, but has **not yet been formally qualified** as a HIPAA vendor. Before WorkOS handles any production patient data, the following must be completed:

- [ ] Execute a signed HIPAA Business Associate Agreement (BAA) with WorkOS
- [ ] Review WorkOS SOC 2 Type II report
- [ ] Confirm WorkOS data residency is US-only for patient identity data
- [ ] Legal review of WorkOS data processing terms
- [ ] Security review of WorkOS SDK dependency chain
- [ ] Negotiate and execute a contractual SLA with defined uptime guarantee (minimum 99.9%), p99 authentication latency target, and financial penalties for breach (service credits or termination rights); SLA must be referenced in the vendor contract, not just a published status page commitment
- [ ] Evaluate WorkOS read-replica / local caching mode for fault tolerance and latency reduction — specifically, whether WorkOS supports an AWS-hosted replica or JWKS/user-data cache that CDP can operate in-region to survive WorkOS availability events; document the supported architecture and its failure modes before production launch

Until qualification is complete, WorkOS may be used in development and staging environments only.

## Replacing WorkOS

If WorkOS is ever disqualified or a superior provider is identified, the replacement MUST:

1. Be an external identity provider — not an in-house implementation
2. Support OIDC (so the Auth Service relying-party integration requires minimal changes)
3. Execute a HIPAA BAA before handling production patient data
4. Be adopted via a new ADR superseding this one

## Consequences

- No CDP engineer may implement password hashing, credential storage, or login flows. PRs containing such code MUST be rejected.
- The Auth Service is intentionally thin — its only job is to validate WorkOS assertions and issue platform tokens. All authentication complexity lives in WorkOS.
- WorkOS vendor qualification must be tracked as a hard dependency before production launch.
- If WorkOS pricing, terms, or reliability become unacceptable, the migration path is to another qualified OIDC provider — not to an in-house system.
