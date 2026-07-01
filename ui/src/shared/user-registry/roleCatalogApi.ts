import type { components } from '@/shared/api/generated/user.schema';
import { userApiClient } from '@/shared/api/serviceApiClients';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type RoleCatalog = components['schemas']['RoleCatalog'];

export type RoleDefinition = RoleCatalog['role_definitions'][number];
/** Snapshot from GET /api/v1/roles (User service role catalog). */
export type RoleCatalogSnapshot = RoleCatalog;

export async function fetchRoleCatalog(
  token: string,
  activeActor: string,
): Promise<RoleCatalogSnapshot> {
  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(await client.GET('/api/v1/roles'));
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

export { cdpClinicalRoleCatalog, roleCatalogForUi } from '@/shared/user-registry/clinicalRoleCatalog';
