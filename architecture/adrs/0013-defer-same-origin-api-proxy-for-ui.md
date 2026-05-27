# 13. ADR 0013: Defer Same-Origin API Proxy for the CDP UI

Date: 2026-05-27

## Status

Accepted — revisit when staging login latency or CORS operational cost remains unacceptable after mitigations below, or when a dedicated edge/router (not the UI deploy) is available.

## Context

The CDP UI (`staging.neosofia.tech`) calls platform APIs on **separate public origins** (for example `authentication.staging.neosofia.tech`, `capabilities-production.up.railway.app`). Browsers treat each hostname as a distinct origin, so every `fetch` with `Authorization` (and `X-Active-Role` on capabilities) may incur a **CORS preflight** (`OPTIONS`) before the real request.

During staging performance work (May 2026), preflight volume and latency were visible in DevTools. Mitigations were discussed:

1. **CORS preflight cache** — `Access-Control-Max-Age: 86400` on OPTIONS (shipped in authentication v0.26.2, capabilities v0.5.9, python-template v0.7.2).
2. **Custom API subdomains** (for example `capabilities.staging.neosofia.tech`) — cleaner URLs but **still cross-origin** from the UI; does not remove CORS or preflight.
3. **Same-origin reverse proxy** (for example `staging.neosofia.tech/api/capabilities/*` → capabilities service) — eliminates browser CORS for that traffic.

The platform’s resilience model intentionally avoids a single browser-facing choke point:

- **Short-lived JWTs** bound trust when authentication is unavailable.
- **Entitlements prefetched at login** into `entitlementsByRole` so capabilities can degrade gracefully after login; role switches hit cache (no network).
- **UI shell renders before capabilities** (profile/header first; menu when the active role’s entitlements arrive).

Routing all browser API traffic through the UI hostname (or a colocated proxy on that deploy) would widen the blast radius: if the edge fails, the browser cannot reach backends that may still be healthy.

## Decision

**Do not introduce a same-origin UI/API reverse proxy for now.** Keep the **cross-origin, multi-service** browser topology:

| Plane | Caller | Target | Config |
|-------|--------|--------|--------|
| Browser → API | CDP UI | Public HTTPS API origins | `VITE_*_API_URL`, `FRONTEND_URL` on each service |
| Service → auth (JWKS) | Downstream APIs | Private mesh / VPC URL | `JWT_JWKS_URI` (see [public-cloud OPERATIONS](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md)) |

Continue UI-side and service-side optimizations that preserve **independent failure domains**:

- Prefetch entitlements for all roles at login; show menu when the **resolved active role** completes (not when all roles complete).
- Cache JWKS per process (SDK v0.9.1+).
- Exempt `/health` and `/.well-known/jwks.json` from Talisman HTTPS redirect on internal HTTP probes.
- CORS preflight cache (`max_age=86400`).

## Rationale

- **Subdomains are not same-origin.** CORS “trust” (`Access-Control-Allow-Origin`) permits cross-origin calls; it does not eliminate preflight. Wildcard origins are incompatible with `supports_credentials=True`.
- **Same-origin proxy trades CORS pain for edge SPOF** for browser clients: one routing failure blocks all API paths on that hostname even if auth and capabilities are up.
- **Current architecture supports graceful degradation** once logged in; centralizing browser traffic works against that design goal.
- **Preflight cache and login-path optimizations** address the immediate staging pain without architectural regression.

## Alternatives considered

| Option | CORS / preflight | Resilience | Notes |
|--------|------------------|------------|-------|
| Status quo + `Max-Age` | Reduced repeat preflights | Preserved | **Chosen for now** |
| API subdomains only | Unchanged | Preserved | DNS/TLS hygiene only |
| Proxy on UI hostname | Eliminated | Edge SPOF for browser | Deferred |
| Dedicated edge/router service | Eliminated | Single edge, not UI deploy | Revisit with infra ownership |
| BFF aggregating login | Partial | New gateway SPOF | Heavier coupling; out of scope |

## Consequences

- Staging/production remain cross-origin; DevTools will still show OPTIONS on cold cache or new endpoints.
- Each browser-facing service must keep `FRONTEND_URL` aligned with the UI’s public origin.
- Login may retain ~1 s per capabilities hop (network + Railway); acceptable until revisited.
- A future proxy must **not** be implemented as logic inside the static UI bundle; prefer platform routing (Railway, Cloudflare, NetBird) owned separately from the CDP UI release.

## Revisit triggers

Re-open this decision when **any** of the following apply:

- Login-to-menu latency is still unacceptable **after** `Max-Age` is deployed and measured on warmed staging.
- Operational burden of CORS/`FRONTEND_URL` drift exceeds team tolerance.
- A **dedicated edge or API hostname** is provisioned (not coupled to the UI container deploy).
- Product requires cookie/session models that materially simplify with same-origin routing.

## References

- [infrastructure/public-cloud/OPERATIONS.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md) — two traffic planes (browser vs JWKS mesh)
- [ADR 0012: UI Capabilities Control Plane](0012-ui-capabilities-control-plane.md)
- Related releases: authentication v0.26.2, capabilities v0.5.9, CDP UI `23d09ab` (active-role entitlements)
