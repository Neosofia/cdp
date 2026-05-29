# 12. ADR 0012: UI Capabilities Control Plane

Date: 2026-05-26

## Context

The platform uses Cedar for authorization at two different scopes. Backend services evaluate complex, request-scoped rules — patient ownership, clinic boundaries, role-gated API actions — using service-owned policy bundles and the [`authorization-in-the-middle`](https://github.com/Neosofia/sdk/tree/main/python/authorization-middleware) SDK. The CDP UI also needs to know which menus, features, and modules to show or hide for the authenticated principal.

We need a dedicated layer that (a) defines the controllable UI surface and (b) evaluates coarse entitlement booleans for the UI, without duplicating backend authorization logic or baking product-specific policy into the generic capabilities service.

## Decision

We treat the **capabilities service** as the platform UI control plane and **CDP** as the owner of the product policy bundle.

1. **Capabilities (generic engine)** exposes `GET /api/v1/capabilities/{namespace}` and returns a flat `{ key: boolean }` map. It loads Cedar policies and an `entitlements.json` manifest from an injected policy bundle at runtime. It does not embed CDP-specific menu names or rules in application code.

2. **CDP (product configuration)** version-controls the policy bundle under `cdp/policies/`:
   - `entitlements.json` — declares namespaces and the entitlement keys the UI may query
   - `*.cedar` — Cedar rules for UI entities (for example, `ui::Menu`)

3. **Backend services** retain complex Cedar evaluation at the API boundary. Capabilities does not replace per-service authorization.

4. **Phase 1 (now):** basic role → menu permissions via Cedar (for example, `operator` may `View` `ui::Menu::"operator"`).

5. **Phase 2 (future):** licensing and feature toggles merge into the same entitlement contract. The UI continues to consume `{ key: boolean }`; capabilities combines Cedar rules with DB-backed toggle/license state before responding.

## Rationale

- **Separation of concerns:** the capabilities service is reusable infrastructure; CDP owns what UI entities exist and how they are gated for this product.
- **Shared vocabulary:** Cedar entity types (`ui::Menu`, later `ui::Feature`, `ui::Module`) and manifest keys (`ui:menu:patient`) give the UI and policy authors a common language that extends to licensing without API churn.
- **Defence in depth:** hiding a UI affordance does not authorize an API call; backend services still enforce their own Cedar policies.
- **Independent deployment:** capabilities deploys from its own repository and image (for example, Railway on `capabilities/`). CDP publishes a versioned **`cdp-ui-policies`** image (Cedar bundle only). Capabilities consumes that artifact at **build time** via `COPY --from=`, the same pattern authentication uses for `sql-template`.

## Consequences

- Adding a UI entitlement requires changes in CDP (`entitlements.json`, Cedar policies) and in the UI (entitlement key references). Capabilities code changes only when the engine contract evolves.
- CDP publishes `ghcr.io/neosofia/cdp-ui-policies:vX.Y.Z` on tag `cdp-ui-policies/vX.Y.Z`. Capabilities pins `POLICY_IMAGE` at build time and redeploys when the policy bundle version changes.
- Local development may volume-mount `cdp/policies/` over `/app/policies` without rebuilding either image.
- Feature toggles and tenant licensing will live in capabilities as an additional evaluation source, not as a replacement for backend service authorization.

## Status

Accepted
