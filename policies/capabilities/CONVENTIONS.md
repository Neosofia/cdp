# UI capabilities Cedar conventions

The capabilities service discovers UI entitlement keys from Cedar policy alone. **There is no manifest and no annotation layer.**

## Policy shape

Each exposed UI capability is one `permit` on a concrete `ui::` entity with action `View`:

```cedar
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"clinician"
) when {
    principal.actors.contains("clinician")
};
```

## API key = Cedar entity id

The capabilities response key is the **exact Cedar entity identifier** from `resource == …`:

| Cedar resource | `GET /api/v1/capabilities/ui` key |
|----------------|-----------------------------------|
| `ui::Menu::"clinician"` | `ui::Menu::"clinician"` |
| `ui::Feature::"tenant-user:list"` | `ui::Feature::"tenant-user:list"` |

The HTTP path namespace is the Cedar namespace prefix (`ui` → `/api/v1/capabilities/ui`).

## Rules

1. **One `resource == ui::…` per `permit` block** for capabilities discovery (split OR’d resources into separate permits).
2. **Action must be `View`** for menu and feature gates evaluated by the capabilities service.
3. **Files live under [`ui/`](ui/)** — all UI surface Cedar for this product.
4. **UI references the same entity ids** via `uiResource('Menu', 'clinician')` in the CDP UI (see `ui/src/lib/uiCapability.ts`).

Phase 2 licensing and toggles extend the `when` clause with helpers (for example `featureEnabled("abc")`) without changing entity ids or API keys.

## Adding a capability

1. Add a `permit` block under `ui/` with `action == Action::"View"` and `resource == ui::<Type>::"<uid>"`.
2. Reference `uiResource('<Type>', '<uid>')` in the CDP UI.
3. Publish **`cdp-policies`** and redeploy **capabilities** when the bundle pin changes.
