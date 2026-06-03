// CDP product policy — clinician supervised patient roster (enroll + profile edit).
// Packed with the User service base bundle via scripts/repack_user_service_policies.sh.
// See cdp/OPERATIONS.md and ADR-0014.

permit (
    principal is users::User,
    action == Action::"user:list",
    resource is users::UserCatalog
) when {
    principal.isClinician
};

permit (
    principal is users::User,
    action == Action::"user:read",
    resource is users::User
) when {
    principal.isClinician &&
    principal.tenantId == resource.tenantId
};

permit (
    principal is users::User,
    action == Action::"user:update",
    resource is users::User
) when {
    principal.isClinician &&
    principal.tenantId == resource.tenantId &&
    resource.roles.contains("self")
};

permit (
    principal is users::User,
    action == Action::"user:create",
    resource is users::UserCatalog
) when {
    principal.isClinician
};
