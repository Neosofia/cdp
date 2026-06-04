import type { ServiceAuditItem } from '@/components/AuditHistorySheet';

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';

export interface AuthServiceItem {
  uuid: string;
  name: string;
  slug: string;
  base_url: string;
  credential_uuid: string | null;
  credential_changed_at: string | null;
  days_since_rotation: number | null;
}

export interface AuthServiceListResponse {
  items: AuthServiceItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuthServiceAuditResponse {
  service_uuid: string;
  slug: string;
  total: number;
  page: number;
  page_size: number;
  items: ServiceAuditItem[];
}

export function authApiHeaders(token: string, activeActor: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-Active-Actor': activeActor,
  };
}

export async function fetchAuthServices(
  token: string,
  activeActor: string,
  page = 1,
  pageSize = 100,
): Promise<AuthServiceListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await fetch(`${AUTH_API}/api/services?${params}`, {
    headers: authApiHeaders(token, activeActor),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as AuthServiceListResponse;
}

export async function fetchAuthServiceAudits(
  token: string,
  activeActor: string,
  slug: string,
  source: 'service' | 'credential',
  page = 1,
  pageSize = 5,
): Promise<AuthServiceAuditResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    source,
  });
  const res = await fetch(
    `${AUTH_API}/api/services/${encodeURIComponent(slug)}/audits?${params}`,
    { headers: authApiHeaders(token, activeActor) },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as AuthServiceAuditResponse;
}
