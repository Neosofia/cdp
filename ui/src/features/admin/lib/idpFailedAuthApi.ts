import type {
  IdpFailedAuthenticationItem,
  IdpFailedAuthenticationListResponse,
} from '@/shared/api/authTypes';
import type { components } from '@/shared/api/generated/authentication.schema';
import { authenticationApiClient } from '@/shared/api/serviceApiClients';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

export type { IdpFailedAuthenticationItem, IdpFailedAuthenticationListResponse };

function normalizeFailedAuthItem(
  item: components['schemas']['FailedAuthenticationEvent'],
): IdpFailedAuthenticationItem {
  return {
    id: item.id ?? '',
    occurred_at: item.occurred_at ?? '',
    method: item.method ?? '',
    status: item.status ?? 'failed',
    idp_user_id: item.idp_user_id ?? null,
    email: item.email ?? null,
    error_code: item.error_code ?? null,
    error_message: item.error_message ?? null,
    ip_address: item.ip_address ?? null,
  };
}

export async function fetchIdpFailedAuthentications(
  token: string,
  activeActor: string,
  limit = 25,
  after?: string | null,
): Promise<IdpFailedAuthenticationListResponse> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/idp/failed-authentications', {
      params: {
        query: {
          limit,
          ...(after ? { after } : {}),
        },
      },
    }),
  );
  return {
    items: (body.items ?? []).map(normalizeFailedAuthItem),
    limit: body.limit ?? limit,
    before: body.before ?? null,
    after: body.after ?? null,
  };
}
