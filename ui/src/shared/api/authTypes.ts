export interface AuthServiceItem {
  uuid: string;
  name: string;
  slug: string;
  base_url: string;
  credential_uuid: string | null;
  credential_changed_at: string | null;
  days_since_rotation: number | null;
}

export type AuthServiceListResponse = {
  items: AuthServiceItem[];
  total: number;
  page: number;
  page_size: number;
};

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

export type IdpFailedAuthenticationListResponse = {
  items: IdpFailedAuthenticationItem[];
  limit: number;
  before: string | null;
  after: string | null;
};

export type AuthTenantSummary = {
  uuid: string;
  name: string;
  display_code?: string | null;
  idp_id: string;
  type?: string | null;
};
