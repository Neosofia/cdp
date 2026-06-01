# CDP role catalog overlay

[`user-catalog.overlay.json`](user-catalog.overlay.json) is merged at deploy time by the User service (`ROLE_CATALOG_OVERLAY`) on top of the base catalog in the User repo.

- **Base vocabulary (tables and `default.json`):** [user/roles/README.md](https://github.com/Neosofia/user/blob/main/roles/README.md)
- **Architecture:** [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)
- **Registry behavior:** [spec 018](../specs/018-user-service.md)

This overlay adds CDP job-function labels for pickers; it does not replace Tier-2 roles in Cedar.
