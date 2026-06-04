import { authApiHeaders } from '@/lib/authServicesApi';

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';

export interface IdpFailedAuthenticationItem {
  id: string;
  occurred_at: string;
  method: string;
  status: string;
  idp_user_id: string | null;
  email: string | null;
  error_code: string | null;
  error_message: string | null;
  ip_address: string | null;
}

export interface IdpFailedAuthenticationListResponse {
  items: IdpFailedAuthenticationItem[];
  limit: number;
  before: string | null;
  after: string | null;
}

export async function fetchIdpFailedAuthentications(
  token: string,
  activeActor: string,
  limit = 25,
  after?: string | null,
): Promise<IdpFailedAuthenticationListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set('after', after);
  const res = await fetch(`${AUTH_API}/api/idp/failed-authentications?${params}`, {
    headers: authApiHeaders(token, activeActor),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
          ? body.error
          : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as IdpFailedAuthenticationListResponse;
}
