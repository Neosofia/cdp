// Tenant-scoped user admin (Capabilities UI). Source of truth — no generated policy matrix.
// Principal: ui::User with tenantType, roles (T2 from neosofia:tenant_type + neosofia:roles), actors (T1).
// See ADR-0014: architecture/adrs/0014-tenant-types-and-org-roles.md

// Directory roles — list and read share the same tenant org role set.
permit (
    principal is ui::User,
    action == Action::"View",
    resource is ui::Feature
) when {
    (resource == ui::Feature::"tenant-user:list" || resource == ui::Feature::"tenant-user:read") &&
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

// Audit — admin, audit, and readonly only.
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:audit"
) when {
    principal.roles.containsAny(["admin", "audit", "readonly"])
};

// Role updates — privileged tenant org roles (no audit, oversight, or readonly).
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
