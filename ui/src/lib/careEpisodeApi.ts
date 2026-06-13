export const CARE_EPISODE_API =
  (import.meta.env.VITE_CARE_EPISODE_API_URL as string | undefined) ?? 'http://localhost:8015';

export interface CareEpisodeInviteInput {
  patient_uuid: string;
  emr_procedure_ref?: string;
  procedure_type: string;
  care_window_days: number;
}

export interface CareEpisodeInviteResult {
  episode_uuid: string;
  invite_token?: string;
}

export interface CareEpisodeRecovery {
  user_uuid: string;
  display_code: string;
  display_name: string;
  surgery: string;
  procedure_date: string;
  days_post_op: number;
  recovery_id: string;
  risk_level: string | null;
  risk_summary?: string | null;
}

export interface UpsertCareEpisodeRecoveryInput {
  patient_uuid: string;
  tenant_uuid: string;
  display_code: string;
  display_name: string;
  surgery: string;
  procedure_date: string;
  recovery_id: string;
  risk_level: string;
}

export interface CareEpisodeRecord {
  id: string;
  title: string;
  date: string;
  type: string;
  provider: string;
  summary: string;
  imageKey?: string;
}

export interface CareEpisodeRecordUpsertItem {
  title: string;
  date: string;
  type: string;
  provider: string;
  summary: string;
  imageKey?: string;
}

/** Opens a post-care monitoring episode (spec 015 FR-001). */
export async function createCareEpisodeInvite(
  token: string,
  activeActor: string,
  input: CareEpisodeInviteInput,
): Promise<CareEpisodeInviteResult | null> {
  if (!CARE_EPISODE_API) {
    return null;
  }

  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return body as CareEpisodeInviteResult;
}

export function isCareEpisodeServiceConfigured(): boolean {
  return Boolean(CARE_EPISODE_API);
}

export async function listCareEpisodeRecoveries(
  token: string,
  activeActor: string,
  tenantUuid?: string | null,
  options?: { includeTenantFilter?: boolean },
): Promise<CareEpisodeRecovery[]> {
  if (!CARE_EPISODE_API) return [];
  const params = new URLSearchParams();
  const includeTenantFilter = options?.includeTenantFilter ?? true;
  if (tenantUuid && includeTenantFilter) params.set('tenant_uuid', tenantUuid);
  const query = params.toString();
  let res: Response;
  try {
    res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/recoveries${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const body = (await res.json()) as {
    items?: Array<CareEpisodeRecovery & { patient_uuid?: string }>;
  };
  return (body.items ?? []).map(item => ({
    user_uuid: item.user_uuid ?? item.patient_uuid ?? '',
    display_code: item.display_code,
    display_name: item.display_name,
    surgery: item.surgery,
    procedure_date: item.procedure_date,
    days_post_op: item.days_post_op,
    recovery_id: item.recovery_id,
    risk_level: item.risk_level,
    risk_summary: item.risk_summary ?? null,
  }));
}

export async function listCareEpisodeRecords(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeRecord[]> {
  if (!CARE_EPISODE_API) return [];
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/records`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: CareEpisodeRecord[] };
  return body.items ?? [];
}

export interface CareEpisodeAppointment {
  id: string;
  patient_uuid: string;
  clinician_user_uuid: string;
  clinician_display_name: string;
  specialty: string;
  scheduled_at: string;
  status: string;
}

export interface CareEpisodeInboxMessage {
  id: string;
  patient_uuid: string;
  sender_user_uuid: string | null;
  sender_display_name: string;
  body: string;
  read_at: string | null;
  sent_at: string;
}

export async function listCareEpisodeAppointments(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeAppointment[]> {
  if (!CARE_EPISODE_API) return [];
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/appointments`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: CareEpisodeAppointment[] };
  return body.items ?? [];
}

export async function listCareEpisodeInboxMessages(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeInboxMessage[]> {
  if (!CARE_EPISODE_API) return [];
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/messages`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Active-Actor': activeActor },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: CareEpisodeInboxMessage[] };
  return body.items ?? [];
}

export async function markCareEpisodeInboxMessageRead(
  token: string,
  activeActor: string,
  patientUuid: string,
  messageId: string,
): Promise<CareEpisodeInboxMessage | null> {
  if (!CARE_EPISODE_API) return null;
  const res = await fetch(
    `${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/messages/${messageId}/read`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Active-Actor': activeActor,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ changed_by_uuid: patientUuid }),
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as CareEpisodeInboxMessage;
}

export async function upsertCareEpisodeRecovery(
  token: string,
  activeActor: string,
  input: UpsertCareEpisodeRecoveryInput,
): Promise<void> {
  if (!CARE_EPISODE_API) return;
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/recoveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to upsert care episode recovery: HTTP ${res.status}${body ? ` ${body}` : ''}`);
  }
}

export async function upsertCareEpisodeRecords(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeRecordUpsertItem[],
): Promise<void> {
  if (!CARE_EPISODE_API) return;
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items, changed_by_uuid: patientUuid }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to upsert care episode records: HTTP ${res.status}${body ? ` ${body}` : ''}`);
  }
}

export interface CareEpisodeAppointmentUpsertItem {
  clinician_user_uuid: string;
  clinician_display_name: string;
  specialty: string;
  scheduled_at: string;
  status: string;
}

export interface CareEpisodeInboxMessageUpsertItem {
  sender_user_uuid: string | null;
  sender_display_name: string;
  body: string;
  sent_at: string;
  read_at?: string | null;
}

export async function upsertCareEpisodeAppointments(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeAppointmentUpsertItem[],
): Promise<void> {
  if (!CARE_EPISODE_API) return;
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/appointments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items, changed_by_uuid: patientUuid }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to upsert care episode appointments: HTTP ${res.status}${body ? ` ${body}` : ''}`);
  }
}

export async function upsertCareEpisodeInboxMessages(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeInboxMessageUpsertItem[],
): Promise<void> {
  if (!CARE_EPISODE_API) return;
  const res = await fetch(`${CARE_EPISODE_API}/api/v1/care-episodes/${patientUuid}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Actor': activeActor,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items, changed_by_uuid: patientUuid }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to upsert care episode messages: HTTP ${res.status}${body ? ` ${body}` : ''}`);
  }
}
