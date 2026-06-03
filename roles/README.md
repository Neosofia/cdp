# CDP clinical role catalog

[`user-catalog.overlay.json`](user-catalog.overlay.json) is the **clinical platform vocabulary**: human-readable org-role labels, tenant types, Tier-1 assigner prefixes, and job-function ids for pickers.

## Authority by consumer

| Consumer | How it uses this file |
|----------|------------------------|
| **CDP UI** | Bundled at build time (`ui/src/lib/clinicalRoleCatalog.ts`). Session menu and admin pickers always show CDP labels; no runtime dependency on User for display names. |
| **User service** | Optional deploy overlay via `ROLE_CATALOG_OVERLAY` so registry APIs and Cedar assignment stay aligned with CDP (see [user OPERATIONS](https://github.com/Neosofia/user/blob/main/OPERATIONS.md)). |
| **Other services** | Mount the same JSON when a service needs matching labels or prefixes; CDP remains the authoring repo. |

- **Base vocabulary (tables and `default.json`):** [user/roles/README.md](https://github.com/Neosofia/user/blob/main/roles/README.md)
- **Architecture:** [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)
- **Registry behavior:** [spec 018](../specs/018-user-service.md)

Edit labels here first; copy or reference this path from service overlays. Job-function entries extend pickers only — they do not replace Tier-2 Cedar roles.
