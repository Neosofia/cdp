// Tenant-scoped user admin (Capabilities UI). Source of truth — no generated policy matrix.
// Principal: ui::User with tenantType, roles (T2 from neosofia:tenant_type + neosofia:roles), actors (T1).
// See ADR-0014: architecture/adrs/0014-tenant-types-and-org-roles.md

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:list"
) when {
    principal.roles.containsAny([
        "admin",
        "audit",
        "clinical-ops",
        "systems",
        "oversight",
        "research",
        "clinical",
        "activation",
        "readonly",
    ])
};

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:read"
) when {
    principal.roles.containsAny([
        "admin",
        "audit",
        "clinical-ops",
        "systems",
        "oversight",
        "research",
        "clinical",
        "activation",
        "readonly",
    ])
};

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:audit"
) when {
    principal.roles.containsAny(["admin", "audit", "readonly"])
};

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:update-roles"
) when {
    principal.roles.containsAny([
        "admin",
        "clinical-ops",
        "systems",
        "research",
        "clinical",
        "activation",
    ])
};
