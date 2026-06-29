import type {
  AuthServiceItem,
  AuthServiceListResponse,
} from '@/shared/api/authTypes';
import type { components } from '@/shared/api/generated/authentication.schema';
import { authenticationApiClient } from '@/shared/api/serviceApiClients';
import { AUDIT_PAGE_SIZE } from '@/shared/audit/constants';
import type { PaginatedAuditResponse, ServiceAuditItem } from '@/shared/audit/types';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

export type { AuthServiceItem, AuthServiceListResponse };

function normalizeAuthServiceItem(item: components['schemas']['ServiceItem']): AuthServiceItem {
  return {
    uuid: item.uuid ?? '',
    name: item.name ?? '',
    slug: item.slug ?? '',
    base_url: item.base_url ?? '',
    credential_uuid: item.credential_uuid ?? null,
    credential_changed_at: item.credential_changed_at ?? null,
    days_since_rotation: item.days_since_rotation ?? null,
  };
}

export interface CatalogAuditsResponse {
  items: ServiceAuditItem[];
}

export async function fetchAuthServices(
  token: string,
  activeActor: string,
  page = 1,
  pageSize = 100,
  search?: string,
): Promise<AuthServiceListResponse> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/services', {
      params: {
        query: {
          page,
          page_size: pageSize,
          ...(search?.trim() ? { q: search.trim() } : {}),
        },
      },
    }),
  );
  return {
    items: (body.items ?? []).map(normalizeAuthServiceItem),
    total: body.total ?? 0,
    page: body.page ?? page,
    page_size: body.page_size ?? pageSize,
  };
}

export async function fetchCatalogAudits(
  token: string,
  activeActor: string,
  limit = 50,
): Promise<CatalogAuditsResponse> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/services/audits', {
      params: { query: { limit } },
    }),
  );
  return { items: (body.items ?? []) as ServiceAuditItem[] };
}

export interface ServiceSourceAuditResponse extends PaginatedAuditResponse<ServiceAuditItem> {
  service_uuid: string;
  slug: string;
}

export async function fetchServiceSourceAudits(
  token: string,
  activeActor: string,
  slug: string,
  source: 'service' | 'credential',
  page: number,
  pageSize = AUDIT_PAGE_SIZE,
): Promise<ServiceSourceAuditResponse> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/services/{slug}/audits', {
      params: {
        path: { slug },
        query: {
          source,
          page,
          page_size: pageSize,
        } as { page?: number; page_size?: number },
      },
    }),
  );
  return {
    service_uuid: body.service_uuid ?? '',
    slug: body.slug ?? slug,
    items: (body.items ?? []) as ServiceAuditItem[],
    total: body.total ?? 0,
    page: body.page ?? page,
    page_size: body.page_size ?? pageSize,
  };
}

export interface CreateAuthServiceInput {
  name: string;
  slug: string;
  base_url: string;
}

export interface CreateAuthServiceResult {
  client_secret: string;
}

export async function createAuthService(
  token: string,
  activeActor: string,
  input: CreateAuthServiceInput,
): Promise<CreateAuthServiceResult> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.POST('/api/services', {
      body: input,
    }),
  );
  return { client_secret: body.client_secret ?? '' };
}

export interface UpdateAuthServiceInput {
  name?: string;
  slug?: string;
  base_url?: string;
}

export async function updateAuthService(
  token: string,
  activeActor: string,
  slug: string,
  input: UpdateAuthServiceInput,
): Promise<AuthServiceItem> {
  const client = authenticationApiClient(token, activeActor);
  return normalizeAuthServiceItem(
    unwrapOpenApiResponse(
      await client.PUT('/api/services/{slug}', {
        params: { path: { slug } },
        body: input,
      }),
    ),
  );
}

export interface RotateAuthServiceCredentialResult {
  slug: string;
  client_secret: string;
}

export async function rotateAuthServiceCredential(
  token: string,
  activeActor: string,
  slug: string,
): Promise<RotateAuthServiceCredentialResult> {
  const client = authenticationApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.POST('/api/services/{slug}/rotate', {
      params: { path: { slug } },
    }),
  );
  return {
    slug: body.slug ?? slug,
    client_secret: body.client_secret ?? '',
  };
}
