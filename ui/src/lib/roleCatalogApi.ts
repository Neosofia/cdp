const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';

export interface RoleDefinition {
  id: string;
  label: string;
}

/** Snapshot from GET /api/v1/roles (User service role catalog). */
export interface RoleCatalogSnapshot {
  actor_classes: string[];
  roles: string[];
  role_definitions: RoleDefinition[];
  tenant_types: Record<string, string[]>;
}

export async function fetchRoleCatalog(
  token: string,
  activeActor: string,
): Promise<RoleCatalogSnapshot | null> {
  const res = await fetch(`${USER_API}/api/v1/roles`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
    },
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as RoleCatalogSnapshot;
}

export function roleLabelMap(catalog: RoleCatalogSnapshot | null): Map<string, string> {
  if (!catalog?.role_definitions?.length) {
    return new Map();
  }
  return new Map(catalog.role_definitions.map((def) => [def.id, def.label]));
}

/** Pretty tier-2 label for the site org role on a registry user (e.g. site.research → Site Research). */
export function clinicianRoleLabelForUserRoles(
  roles: string[],
  catalog: RoleCatalogSnapshot,
): string {
  const labels = roleLabelMap(catalog);
  const orderIndex = new Map(catalog.role_definitions.map((def, index) => [def.id, index]));
  const siteRoles = roles
    .filter((role) => role.startsWith('site.'))
    .sort((a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999));
  const roleId = siteRoles[0];
  return roleId ? (labels.get(roleId) ?? '') : '';
}

export { cdpClinicalRoleCatalog, defaultRoleForActor, defaultRolesByActor, roleCatalogForUi } from '@/lib/clinicalRoleCatalog';
