const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';

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
