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
  /** All tier-1 actors → org-role namespace prefixes (for tier-2 → tier-1 rollup). */
  assigner_actor_prefixes: Record<string, string[]>;
  assigner_actors: string[];
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
