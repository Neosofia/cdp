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

function userServiceHeaders(
  token: string,
  activeActor: string,
  activeOrgRole?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-Active-Actor': activeActor,
  };
  if (activeOrgRole) {
    headers['X-Active-Org-Role'] = activeOrgRole;
  }
  return headers;
}

/** Registry total from GET /api/v1/users (minimal page; uses response total). */
export async function fetchUserRegistryTotal(
  token: string,
  activeActor: string,
  activeOrgRole?: string,
): Promise<UserListSummary> {
  const res = await fetch(`${USER_API}/api/v1/users?page=1&page_size=1`, {
    headers: userServiceHeaders(token, activeActor, activeOrgRole),
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
  tenant_uuid?: string;
}

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
  activeOrgRole?: string,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    headers: userServiceHeaders(token, activeActor, activeOrgRole),
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
  activeOrgRole?: string,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    method: 'PATCH',
    headers: {
      ...userServiceHeaders(token, activeActor, activeOrgRole),
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

export interface UpsertPatientUserInput {
  uuid: string;
  tenant_uuid: string;
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
  roles?: string[];
}

export async function createPatientUser(
  token: string,
  activeActor: string,
  input: CreatePatientUserInput,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      roles: ['patient.self'],
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
  input: Pick<UpsertPatientUserInput, 'display_code' | 'first_name' | 'last_name' | 'email'>,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users/${userUuid}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_code: input.display_code,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as RegistryUser;
}

export async function upsertPatientUser(
  token: string,
  activeActor: string,
  input: UpsertPatientUserInput,
): Promise<RegistryUser> {
  const res = await fetch(`${USER_API}/api/v1/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uuid: input.uuid,
      tenant_uuid: input.tenant_uuid,
      display_code: input.display_code,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      roles: input.roles ?? ['patient.self'],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as RegistryUser;
}
