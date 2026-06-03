/**
 * CDP clinical role vocabulary — bundled from the repo overlay (source of truth for UI labels).
 * User and other services may mount the same JSON via ROLE_CATALOG_OVERLAY at deploy time;
 * the clinical platform UI does not depend on the network for display names.
 */
import type { RoleCatalogSnapshot, RoleDefinition } from '@/lib/roleCatalogApi';
import cdpRoleCatalogOverlay from '@/data/user-catalog.overlay.json';

interface CdpRoleCatalogOverlay {
  tenant_types: Record<string, { roles: string[] }>;
  roles: Array<{ id: string; label: string }>;
  assigner_actors: Record<string, string[]>;
  job_functions?: string[];
}

const overlay = cdpRoleCatalogOverlay as CdpRoleCatalogOverlay;

function roleDefinitionsFromOverlay(): RoleDefinition[] {
  return overlay.roles.map((entry) => ({
    id: entry.id,
    label: entry.label.trim() || entry.id,
  }));
}

/** Full catalog snapshot for session menu labels, assigner prefixes, and admin pickers. */
export function cdpClinicalRoleCatalog(): RoleCatalogSnapshot {
  const role_definitions = roleDefinitionsFromOverlay();
  const assigner_actor_prefixes = overlay.assigner_actors;
  const actor_classes = Object.keys(assigner_actor_prefixes).sort();
  return {
    actor_classes,
    roles: role_definitions.map((def) => def.id),
    role_definitions,
    tenant_types: Object.fromEntries(
      Object.entries(overlay.tenant_types).map(([tenantType, spec]) => [tenantType, [...spec.roles]]),
    ),
    assigner_actor_prefixes,
    assigner_actors: actor_classes,
  };
}

/**
 * CDP labels and taxonomy always from the bundled overlay.
 * User API (when present) only narrows `roles` to what the signed-in principal may assign.
 */
export function roleCatalogForUi(remote: RoleCatalogSnapshot | null): RoleCatalogSnapshot {
  const clinical = cdpClinicalRoleCatalog();
  if (!remote) {
    return clinical;
  }
  return {
    ...clinical,
    roles: remote.roles?.length ? remote.roles : clinical.roles,
    assigner_actors: remote.assigner_actors?.length ? remote.assigner_actors : clinical.assigner_actors,
    actor_classes: remote.actor_classes?.length ? remote.actor_classes : clinical.actor_classes,
  };
}

export const CDP_JOB_FUNCTION_IDS = overlay.job_functions ?? [];
