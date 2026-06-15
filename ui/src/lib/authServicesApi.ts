import type { ServiceAuditItem } from '@/components/AuditHistorySheet';

import { AUTH_API } from '@/lib/apiBases';

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

export interface CatalogAuditsResponse {
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

export async function fetchCatalogAudits(
  token: string,
  activeActor: string,
  limit = 50,
): Promise<CatalogAuditsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  const res = await fetch(`${AUTH_API}/api/services/audits?${params}`, {
    headers: authApiHeaders(token, activeActor),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as CatalogAuditsResponse;
}
