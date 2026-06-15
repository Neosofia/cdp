/**
 * CDP clinical role vocabulary — bundled from policies/user/role-catalog.json.
 */
import type { RoleCatalogSnapshot, RoleDefinition } from '@/lib/roleCatalogApi';
import cdpRoleCatalog from '@policies/user/role-catalog.json';

interface CdpRoleCatalog {
  tenant_types: Record<string, { roles: string[] }>;
  roles: Array<{ id: string; label: string }>;
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
