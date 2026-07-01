import type { AuthTenantSummary } from '@/shared/api/authTypes';
import { authenticationApiClient } from '@/shared/api/serviceApiClients';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

export async function fetchAuthTenant(
  token: string,
  activeActor: string,
  tenantUuid: string,
): Promise<AuthTenantSummary> {
  const client = authenticationApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.GET('/api/v1/tenants/{tenant_uuid}', {
      params: { path: { tenant_uuid: tenantUuid } },
    }),
  );
}
