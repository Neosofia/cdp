/**
 * CDP clinical role vocabulary — bundled from policies/user/role-catalog.json.
 */
import type { RoleCatalogSnapshot, RoleDefinition } from '@/lib/roleCatalogApi';
import cdpRoleCatalog from '@policies/user/role-catalog.json';

interface CdpRoleCatalog {
  tenant_types: Record<string, { roles: string[] }>;
  roles: Array<{ id: string; label: string }>;
  default_roles_by_actor?: Record<string, string>;
  job_functions?: string[];
}

const catalog = cdpRoleCatalog as CdpRoleCatalog;

function roleDefinitionsFromCatalog(): RoleDefinition[] {
  return catalog.roles.map((entry) => ({
    id: entry.id,
    label: entry.label.trim() || entry.id,
  }));
}

/** Full catalog snapshot for session menu labels and admin pickers. */
export function cdpClinicalRoleCatalog(): RoleCatalogSnapshot {
  const role_definitions = roleDefinitionsFromCatalog();
  return {
    actor_classes: ['operator', 'study', 'clinician', 'patient', 'demo'],
    roles: role_definitions.map((def) => def.id),
    role_definitions,
    tenant_types: Object.fromEntries(
      Object.entries(catalog.tenant_types).map(([tenantType, spec]) => [tenantType, [...spec.roles]]),
    ),
  };
}

/**
 * CDP labels always from the bundled role catalog.
 * User API (when present) may narrow `roles`; assignment authz is Cedar.
 */
export function roleCatalogForUi(remote: RoleCatalogSnapshot | null): RoleCatalogSnapshot {
  const clinical = cdpClinicalRoleCatalog();
  if (!remote) {
    return clinical;
  }
  return {
    ...clinical,
    roles: remote.roles?.length ? remote.roles : clinical.roles,
    actor_classes: remote.actor_classes?.length ? remote.actor_classes : clinical.actor_classes,
    tenant_types: Object.keys(remote.tenant_types ?? {}).length
      ? remote.tenant_types
      : clinical.tenant_types,
  };
}

export const CDP_JOB_FUNCTION_IDS = catalog.job_functions ?? [];

/** UI-only tier-1 → default tier-2 slug (enroll forms, demo seeds). Not sent on login provision. */
export function defaultRoleForActor(actor: string): string | undefined {
  const defaults = catalog.default_roles_by_actor;
  if (!defaults) {
    return undefined;
  }
  return defaults[actor];
}

export function defaultRolesByActor(): Record<string, string> {
  return { ...(catalog.default_roles_by_actor ?? {}) };
}
