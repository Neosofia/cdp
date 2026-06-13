const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';

export interface UserListSummary {
  total: number;
}

function apiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as { message?: unknown; error?: unknown };
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
  }
  return `HTTP ${status}`;
}

function userServiceHeaders(token: string, activeActor: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-Active-Actor': activeActor,
  };
}

export function tenantUsersListPath(tenantUuid: string, query = ''): string {
  const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  return `${USER_API}/api/v1/tenants/${tenantUuid}/users${suffix}`;
}

/** Platform catalog (`GET /api/v1/users`) vs tenant catalog (`GET /api/v1/tenants/{id}/users`). */
export function usesPlatformUserCatalog(activeActor: string): boolean {
  return activeActor.toLowerCase() === 'operator';
}

export function usersListPath(
  activeActor: string,
  tenantUuid: string | null | undefined,
  query = '',
): string {
  if (usesPlatformUserCatalog(activeActor)) {
    const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return `${USER_API}/api/v1/users${suffix}`;
  }
  const tenant = tenantUuid?.trim();
  if (!tenant) {
    throw new Error('tenant_uuid is required for tenant-scoped user list.');
  }
  return tenantUsersListPath(tenant, query);
}

/** Registry total from user list (minimal page; uses response total). */
export async function fetchUserRegistryTotal(
  token: string,
  activeActor: string,
  tenantUuid?: string | null,
): Promise<UserListSummary> {
  const listUrl = tenantUuid
    ? tenantUsersListPath(tenantUuid, 'page=1&page_size=1')
    : `${USER_API}/api/v1/users?page=1&page_size=1`;
  const res = await fetch(listUrl, {
    headers: userServiceHeaders(token, activeActor),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(body, res.status));
  }
  const total = typeof body.total === 'number' ? body.total : 0;
  return { total };
}

export interface CreatePatientUserInput {
  first_name: string;
  last_name: string;
  email: string;
  display_code: string;
  tenant_uuid: string;
}

const PATIENT_ENROLL_ROLE = 'patient.self';

export interface RegistryUser {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
  tos_accepted: boolean;
}

export function registryUserDisplayName(user: Pick<RegistryUser, 'first_name' | 'last_name'>): string {
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
}

export async function fetchRegistryUser(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    headers: userServiceHeaders(token, activeActor),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(body, res.status));
  }
  return body as RegistryUser;
}

/** Record Terms of Service acceptance on the caller's user record (self-service PATCH). */
export async function acceptTermsOfService(
  token: string,
  activeActor: string,
  userUuid: string,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    method: 'PATCH',
    headers: {
      ...userServiceHeaders(token, activeActor),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tos_accepted: true }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(apiErrorMessage(body, res.status));
  }
  const user = body as RegistryUser;
  if (user.tos_accepted !== true) {
    throw new Error('Acceptance was not saved. Try again or contact support.');
  }
  return user;
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

/** User PATCH rejects JSON null for optional strings; empty string clears the field server-side. */
function patchOptionalString(value: string | null | undefined): string {
  return value ?? '';
}

export function buildUserUpdatePayload(input: UserUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
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

  const res = await fetch(`${USER_API}/api/v1/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_uuid: tenantUuid,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      display_code: input.display_code,
      roles: [PATIENT_ENROLL_ROLE],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as RegistryUser;
}

export async function updatePatientUser(
  token: string,
  activeActor: string,
  userUuid: string,
  input: PatientProfileInput,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildUserUpdatePayload(input)),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as RegistryUser;
}
