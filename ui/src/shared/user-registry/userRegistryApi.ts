import type { components } from '@/shared/api/generated/user.schema';
import { userApiClient } from '@/shared/api/serviceApiClients';
import { AUDIT_PAGE_SIZE } from '@/shared/audit/constants';
import { fetchAllAuditPages } from '@/shared/audit/fetchAllAuditPages';
import type { PaginatedAuditResponse, UserAuditItem } from '@/shared/audit/types';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type UserListResponse = components['schemas']['UserListResponse'];
type TenantUserListResponse = components['schemas']['TenantUserListResponse'];
type UserAuditListResponse = components['schemas']['UserAuditListResponse'];
type UserUpdateRequest = components['schemas']['UserUpdateRequest'];

/** Registry row from user service (OpenAPI `User`). */
export type RegistryUser = components['schemas']['User'];

export type { UserListResponse };

const MAX_LIST_PAGES = 500;
const DEFAULT_LIST_PAGE_SIZE = 100;

function normalizeUserAuditItem(
  row: UserAuditListResponse['items'][number],
): UserAuditItem {
  return {
    history_uuid: row.history_uuid ?? null,
    uuid: row.uuid,
    tenant_uuid: row.tenant_uuid,
    idp_id: row.idp_id,
    display_code: row.display_code ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email: row.email ?? null,
    roles: row.roles,
    changed_at: row.changed_at,
    changed_by_uuid: row.changed_by_uuid,
    changed_by_type: row.changed_by_type,
    change_type: row.change_type,
  };
}

export interface UserListSummary {
  total: number;
}

/** Platform catalog (`GET /api/v1/users`) vs tenant catalog (`GET /api/v1/tenants/{id}/users`). */
export function usesPlatformUserCatalog(activeActor: string): boolean {
  return activeActor.toLowerCase() === 'operator';
}

export async function fetchUserRegistryTotal(
  token: string,
  activeActor: string,
  tenantUuid?: string | null,
): Promise<UserListSummary> {
  const client = userApiClient(token, activeActor);
  if (tenantUuid) {
    const body = unwrapOpenApiResponse(
      await client.GET('/api/v1/tenants/{tenant_uuid}/users', {
        params: {
          path: { tenant_uuid: tenantUuid },
          query: { page: 1, page_size: 1 },
        },
      }),
    );
    return { total: body.total };
  }
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/users', {
      params: { query: { page: 1, page_size: 1 } },
    }),
  );
  return { total: body.total };
}

export async function fetchUserListPage(
  token: string,
  activeActor: string,
  options: {
    tenantUuid?: string | null;
    page: number;
    pageSize: number;
    search?: string;
  },
): Promise<UserListResponse | TenantUserListResponse> {
  const client = userApiClient(token, activeActor);
  const query = {
    page: options.page,
    page_size: options.pageSize,
    ...(options.search?.trim() ? { q: options.search.trim() } : {}),
  };
  if (usesPlatformUserCatalog(activeActor)) {
    return unwrapOpenApiResponse(
      await client.GET('/api/v1/users', { params: { query } }),
    );
  }
  const tenant = options.tenantUuid?.trim();
  if (!tenant) {
    throw new Error('tenant_uuid is required for tenant-scoped user list.');
  }
  return unwrapOpenApiResponse(
    await client.GET('/api/v1/tenants/{tenant_uuid}/users', {
      params: { path: { tenant_uuid: tenant }, query },
    }),
  );
}

export async function fetchAllTenantUsers(
  token: string,
  activeActor: string,
  tenantUuid: string,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
): Promise<RegistryUser[]> {
  return fetchAllAuditPages(
    async (page, size) => {
      const body = await fetchUserListPage(token, activeActor, {
        tenantUuid,
        page,
        pageSize: size,
      });
      return {
        items: body.items,
        total: body.total,
        page: body.page,
        page_size: body.page_size,
      };
    },
    pageSize,
    MAX_LIST_PAGES,
  );
}

export interface CreatePatientUserInput {
  first_name: string;
  last_name: string;
  email: string;
  display_code: string;
  tenant_uuid: string;
}

const PATIENT_ENROLL_ROLE = 'patient.self';

export function registryUserDisplayName(user: Pick<RegistryUser, 'first_name' | 'last_name'>): string {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
}

export async function fetchRegistryUser(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<RegistryUser> {
  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.GET('/api/v1/users/{user_uuid}', {
      params: { path: { user_uuid: userUuid } },
    }),
  );
}

export interface PatientProfileInput {
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UserUpdateInput {
  display_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  roles?: string[];
}

function patchOptionalString(value: string | null | undefined): string {
  return value ?? '';
}

export function buildUserUpdatePayload(input: UserUpdateInput): UserUpdateRequest {
  const body: UserUpdateRequest = {
    display_code: patchOptionalString(input.display_code),
    first_name: patchOptionalString(input.first_name),
    last_name: patchOptionalString(input.last_name),
    email: patchOptionalString(input.email),
  };
  if (input.roles !== undefined) {
    body.roles = input.roles;
  }
  return body;
}

export async function createPatientUser(
  token: string,
  activeActor: string,
  input: CreatePatientUserInput,
): Promise<RegistryUser> {
  const tenantUuid = input.tenant_uuid.trim();
  if (!tenantUuid) {
    throw new Error('tenant_uuid is required to create a patient user.');
  }

  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.POST('/api/v1/users', {
      body: {
        tenant_uuid: tenantUuid,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        display_code: input.display_code,
        roles: [PATIENT_ENROLL_ROLE],
      },
    }),
  );
}

export async function updatePatientUser(
  token: string,
  activeActor: string,
  userUuid: string,
  input: PatientProfileInput,
): Promise<RegistryUser> {
  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.PATCH('/api/v1/users/{user_uuid}', {
      params: { path: { user_uuid: userUuid } },
      body: buildUserUpdatePayload(input),
    }),
  );
}

export async function updateUser(
  token: string,
  activeActor: string,
  userUuid: string,
  input: UserUpdateInput,
): Promise<RegistryUser> {
  const client = userApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.PATCH('/api/v1/users/{user_uuid}', {
      params: { path: { user_uuid: userUuid } },
      body: buildUserUpdatePayload(input),
    }),
  );
}

export async function fetchUserAudits(
  token: string,
  activeActor: string,
  userUuid: string,
  page: number,
  pageSize = AUDIT_PAGE_SIZE,
): Promise<PaginatedAuditResponse<UserAuditItem>> {
  const client = userApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/users/{user_uuid}/audits', {
      params: {
        path: { user_uuid: userUuid },
        query: { page, page_size: pageSize },
      },
    }),
  );
  return {
    items: body.items.map(normalizeUserAuditItem),
    total: body.total,
    page: body.page,
    page_size: body.page_size,
  };
}
