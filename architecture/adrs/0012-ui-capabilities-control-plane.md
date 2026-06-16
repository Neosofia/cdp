# 12. ADR 0012: UI Capabilities Control Plane

Date: 2026-05-26

## Context

The platform uses Cedar for authorization at two different scopes. Backend services evaluate complex, request-scoped rules — patient ownership, clinic boundaries, role-gated API actions — using service-owned policy bundles and the [`authorization-in-the-middle`](https://github.com/Neosofia/sdk/tree/main/python/authorization-middleware) SDK. The CDP UI also needs to know which menus, features, and modules to show or hide for the authenticated principal.

We need a dedicated layer that (a) defines the controllable UI surface and (b) evaluates coarse entitlement booleans for the UI, without duplicating backend authorization logic or baking product-specific policy into the generic capabilities service.

## Decision

We treat the **capabilities service** as the platform UI control plane and **CDP** as the owner of the product policy bundle.

1. **Capabilities (generic engine)** exposes `GET /api/v1/capabilities/{namespace}` and returns a flat `{ key: boolean }` map. Keys are Cedar entity ids (`ui::Menu::"clinician"`). It loads Cedar policies from an injected policy bundle and discovers entitlements from `View` permits on `ui::` resources. It does not embed CDP-specific menu names or rules in application code.

2. **CDP (product configuration)** version-controls the policy bundle under `cdp/policies/capabilities/ui/`:
   - Cedar rules for UI entities (for example, `ui::Menu`, `ui::Feature`)
   - The CDP UI references the same entity ids via `uiResource(type, uid)` (see `ui/src/lib/uiCapability.ts`)

3. **Backend services** retain complex Cedar evaluation at the API boundary. Capabilities does not replace per-service authorization.

4. **Phase 1 (now):** basic role → menu permissions via Cedar (for example, `operator` may `View` `ui::Menu::"operator"`).

5. **Phase 2 (future):** licensing and feature toggles merge into the same entitlement contract. The UI continues to consume `{ key: boolean }`; capabilities combines Cedar rules with DB-backed toggle/license state before responding.

## Rationale

- **Separation of concerns:** the capabilities service is reusable infrastructure; CDP owns what UI entities exist and how they are gated for this product.
- **Shared vocabulary:** Cedar entity ids (`ui::Menu::"patient"`, `ui::Feature::"tenant-user:list"`) are the API keys; the UI and policy authors use the same identifiers via `uiResource()`.
- **Defence in depth:** hiding a UI affordance does not authorize an API call; backend services still enforce their own Cedar policies.
- **Independent deployment:** capabilities deploys from its own repository and image (for example, Railway on `capabilities/`). CDP publishes a versioned **`cdp-policies`** image (capabilities Cedar + user role catalog). Capabilities consumes the capabilities subtree at **build time** via `COPY --from=`, the same pattern authentication uses for `sql-template`.

## Consequences

- Adding a UI entitlement requires a `View` permit in CDP `capabilities/ui/*.cedar` and a matching `uiResource()` reference in the UI. Capabilities code changes only when the engine contract evolves.
- CDP publishes `ghcr.io/neosofia/cdp-policies:vX.Y.Z` on tag `cdp-policies/vX.Y.Z`. Capabilities pins **`POLICIES_IMAGE`** at build time, copies `/policies/capabilities` → `/app/policies`, and redeploys when the bundle version changes.
- Local development may volume-mount `cdp/policies/capabilities/` over `/app/policies` without rebuilding either image.
- Feature toggles and tenant licensing will live in capabilities as an additional evaluation source, not as a replacement for backend service authorization.

## Status

Accepted
