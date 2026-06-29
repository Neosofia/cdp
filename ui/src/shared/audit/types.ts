export interface AuditBaseItem {
  history_uuid: string | null;
  changed_at: string;
  changed_by_uuid: string;
  changed_by_type: number;
  change_type: number;
  changed_by_name?: string | null;
}

export interface ServiceAuditItem extends AuditBaseItem {
  source: 'service' | 'credential';
  credential_uuid: string | null;
  name: string | null;
  slug: string | null;
  base_url: string | null;
}

export interface UserAuditItem extends AuditBaseItem {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  display_code?: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
  changed_by_name?: string | null;
}

export interface CareEpisodeRecoveryAuditItem extends AuditBaseItem {
  episode_uuid: string;
  patient_uuid: string;
  surgery: string;
  procedure_date: string;
  recovery_id: string;
  risk_level: string;
  care_window_days: number;
  status: string;
  tenant_uuid: string;
}

export interface InteractionRiskAuditItem extends AuditBaseItem {
  chat_interaction_uuid: string;
  patient_uuid: string;
  summary: string;
}

export interface PaginatedAuditResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
