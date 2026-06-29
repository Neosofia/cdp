import type { components } from '@/shared/api/generated/capabilities.schema';

type EntitlementsResponse = components['schemas']['EntitlementsResponse'];
import { capabilitiesApiClient } from '@/shared/api/serviceApiClients';
import type { EntitlementsMap } from '@/shared/core/appTypes';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

const UI_CAPABILITIES_NAMESPACE = 'ui';

export async function fetchRoleEntitlements(
  token: string,
  role: string,
): Promise<EntitlementsMap | null> {
  try {
    const client = capabilitiesApiClient(token, role);
    return unwrapOpenApiResponse(
      await client.GET('/api/v1/capabilities/{namespace}', {
        params: { path: { namespace: UI_CAPABILITIES_NAMESPACE } },
      }),
    ) as EntitlementsResponse;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`capabilities/ui failed for role ${role}:`, detail);
    return null;
  }
}

export function prefetchEntitlementsInBackground(
  token: string,
  roles: string[],
  onRoleReady: (role: string, data: EntitlementsMap) => void,
): void {
  for (const role of roles) {
    void fetchRoleEntitlements(token, role).then((data) => {
      if (data !== null) {
        onRoleReady(role, data);
      }
    });
  }
}
