// Tenant-scoped user admin (Capabilities UI). Source of truth — no generated policy matrix.
// Principal: ui::User with tenantType, roles (T2 from neosofia:tenant_type + neosofia:roles), actors (T1).
// See ADR-0014: architecture/adrs/0014-tenant-types-and-org-roles.md

// --- tenant.user.list ---

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:list"
) when {
    principal.roles.contains("admin") ||
    principal.roles.contains("audit") ||
    principal.roles.contains("clinical-ops") ||
    principal.roles.contains("systems") ||
    principal.roles.contains("oversight") ||
    principal.roles.contains("research") ||
    principal.roles.contains("clinical") ||
    principal.roles.contains("activation") ||
    principal.roles.contains("readonly")
};

// --- tenant.user.read ---

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:read"
) when {
    principal.roles.contains("admin") ||
    principal.roles.contains("audit") ||
    principal.roles.contains("clinical-ops") ||
    principal.roles.contains("systems") ||
    principal.roles.contains("oversight") ||
    principal.roles.contains("research") ||
    principal.roles.contains("clinical") ||
    principal.roles.contains("activation") ||
    principal.roles.contains("readonly")
};

// --- tenant.user.audit ---

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:audit"
) when {
    principal.roles.contains("admin") ||
    principal.roles.contains("audit") ||
    principal.roles.contains("readonly")
};

// --- tenant.user.update-roles (mutation) ---

permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Feature::"tenant-user:update-roles"
) when {
    principal.roles.contains("admin") ||
    principal.roles.contains("clinical-ops") ||
    principal.roles.contains("systems") ||
    principal.roles.contains("research") ||
    principal.roles.contains("clinical") ||
    principal.roles.contains("activation")
};
