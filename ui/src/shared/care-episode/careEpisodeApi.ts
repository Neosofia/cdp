import type { components } from '@/shared/api/generated/care-episode.schema';
import { careEpisodeApiClient } from '@/shared/api/serviceApiClients';
import type {
  CareEpisodeRecoveryAuditItem,
  InteractionRiskAuditItem,
} from '@/shared/audit/types';
import type { ClinicianListFilters } from '@/features/clinician/lib/patientRosterTypes';
import { AUDIT_CSV_FETCH_PAGE_SIZE, AUDIT_CSV_MAX_PAGES } from '@/shared/audit/constants';
import { fetchAllAuditPages } from '@/shared/audit/fetchAllAuditPages';
import { CARE_EPISODE_API } from '@/shared/platform/apiBases';
import { unwrapOpenApiResponse } from '@/shared/platform/platformOpenApiClient';

type CareEpisode = components['schemas']['CareEpisode'];
type PatientCareEpisodeAuditListResponse =
  components['schemas']['PatientCareEpisodeAuditListResponse'];

/** UI alias: list rows expose `user_uuid` (same as `patient_uuid` on the wire). */
export type CareEpisodeRecovery = CareEpisode & {
  user_uuid: string;
};

export type CareEpisodeStatus = 'active' | 'closed';

export type StartNewCareEpisodeInput = components['schemas']['StartEpisodeRequest'] & {
  patient_uuid: string;
};

export type UpsertCareEpisodeRecoveryInput = components['schemas']['UpsertEpisodeRequest'];
export type BulkCloseCareEpisodesResult = components['schemas']['BulkCloseRecoveriesResponse'];
export type CareEpisodeHistoryEntry = components['schemas']['CareEpisodeHistoryEntry'];
export type CareEpisodeRecord = components['schemas']['CareEpisodeRecord'];
export type CareEpisodeRecordUpsertItem = components['schemas']['RecordUpsertItem'];
export type CareEpisodeAppointment = components['schemas']['CareEpisodeAppointment'];
export type CareEpisodeAppointmentUpsertItem = components['schemas']['AppointmentUpsertItem'];
export type CareEpisodeInboxMessage = components['schemas']['CareEpisodeInboxMessage'];
export type CareEpisodeInboxMessageUpsertItem = components['schemas']['InboxMessageUpsertItem'];

export { CARE_EPISODE_API };
export type { CareEpisodeRecoveryAuditItem, InteractionRiskAuditItem };

export type PatientCareEpisodeAuditSource = PatientCareEpisodeAuditListResponse['source'];

function normalizeEpisodeAuditItem(
  item: components['schemas']['CareEpisodeRecoveryAuditItem'],
): CareEpisodeRecoveryAuditItem {
  return {
    history_uuid: item.history_uuid ?? null,
    changed_at: item.changed_at,
    changed_by_uuid: item.changed_by_uuid,
    changed_by_type: item.changed_by_type,
    change_type: item.change_type,
    episode_uuid: item.episode_uuid,
    patient_uuid: item.patient_uuid,
    surgery: item.surgery,
    procedure_date: item.procedure_date,
    recovery_id: item.recovery_id,
    risk_level: item.risk_level,
    care_window_days: item.care_window_days,
    status: item.status,
    tenant_uuid: item.tenant_uuid,
  };
}

function normalizeRiskAuditItem(
  item: components['schemas']['InteractionRiskAuditItem'],
): InteractionRiskAuditItem {
  return {
    history_uuid: item.history_uuid ?? null,
    changed_at: item.changed_at,
    changed_by_uuid: item.changed_by_uuid,
    changed_by_type: item.changed_by_type,
    change_type: item.change_type,
    chat_interaction_uuid: item.chat_interaction_uuid,
    patient_uuid: item.patient_uuid,
    summary: item.summary,
  };
}

function toCareEpisodeRecovery(episode: CareEpisode): CareEpisodeRecovery {
  return {
    ...episode,
    user_uuid: episode.patient_uuid,
  };
}

export interface CareEpisodeListPage {
  items: CareEpisodeRecovery[];
  total: number;
  page: number;
  page_size: number;
}

export interface FetchCareEpisodeListPageOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: ClinicianListFilters;
  includeTenantFilter?: boolean;
}

export async function fetchCareEpisodeListPage(
  token: string,
  activeActor: string,
  tenantUuid: string,
  options: FetchCareEpisodeListPageOptions = {},
): Promise<CareEpisodeListPage> {
  const client = careEpisodeApiClient(token, activeActor);
  const filters = options.filters;
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes', {
      params: {
        query: {
          ...(options.includeTenantFilter !== false ? { tenant_uuid: tenantUuid } : {}),
          page: options.page ?? 1,
          page_size: options.pageSize ?? 20,
          ...(options.search?.trim() ? { q: options.search.trim() } : {}),
          ...(filters?.episodeStatus && filters.episodeStatus !== 'all'
            ? { status: filters.episodeStatus }
            : {}),
          ...(filters?.risk && filters.risk !== 'all' ? { risk: filters.risk } : {}),
          ...(filters?.activity && filters.activity !== 'all' ? { activity: filters.activity } : {}),
          ...(filters && filters.minDaysPostOp !== null
            ? { min_days_post_op: filters.minDaysPostOp }
            : {}),
          ...(filters && filters.minDaysSinceChat !== null
            ? { min_days_since_chat: filters.minDaysSinceChat }
            : {}),
        },
      },
    }),
  );
  return {
    items: (body.items ?? []).map(toCareEpisodeRecovery),
    total: body.total ?? 0,
    page: body.page ?? options.page ?? 1,
    page_size: body.page_size ?? options.pageSize ?? 20,
  };
}

export interface CareEpisodeRosterSummary {
  high_risk_count: number;
  medium_risk_count: number;
  chats_today_count: number;
  active_patients_30m_count: number;
  preview: CareEpisodeListPage;
  active_chats: CareEpisodeListPage;
}

export async function fetchCareEpisodeRosterSummary(
  token: string,
  activeActor: string,
  tenantUuid: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<CareEpisodeRosterSummary> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/roster-summary', {
      params: {
        query: {
          tenant_uuid: tenantUuid,
          page: options.page ?? 1,
          page_size: options.pageSize ?? 4,
        },
      },
    }),
  );
  return {
    high_risk_count: body.high_risk_count ?? 0,
    medium_risk_count: body.medium_risk_count ?? 0,
    chats_today_count: body.chats_today_count ?? 0,
    active_patients_30m_count: body.active_patients_30m_count ?? 0,
    preview: {
      items: (body.preview?.items ?? []).map(toCareEpisodeRecovery),
      total: body.preview?.total ?? 0,
      page: body.preview?.page ?? options.page ?? 1,
      page_size: body.preview?.page_size ?? options.pageSize ?? 4,
    },
    active_chats: {
      items: (body.active_chats?.items ?? []).map(toCareEpisodeRecovery),
      total: body.active_chats?.total ?? 0,
      page: body.active_chats?.page ?? 1,
      page_size: body.active_chats?.page_size ?? 10,
    },
  };
}

export async function fetchEnrollablePatients(
  token: string,
  activeActor: string,
  tenantUuid: string,
  search?: string,
): Promise<Array<{
  uuid: string;
  tenant_uuid: string;
  display_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  roles: string[];
}>> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/enrollable-patients', {
      params: {
        query: {
          tenant_uuid: tenantUuid,
          ...(search?.trim() ? { q: search.trim() } : {}),
        },
      },
    }),
  );
  return (body.items ?? []) as Array<{
    uuid: string;
    tenant_uuid: string;
    display_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    roles: string[];
  }>;
}

export async function listCareEpisodeRecoveries(
  token: string,
  activeActor: string,
  tenantUuid?: string | null,
  options?: { includeTenantFilter?: boolean; status?: CareEpisodeStatus | 'all' },
): Promise<CareEpisodeRecovery[]> {
  if (!tenantUuid) {
    return [];
  }
  return fetchAllAuditPages(
    async (page, pageSize) => {
      const body = await fetchCareEpisodeListPage(token, activeActor, tenantUuid, {
        page,
        pageSize,
        includeTenantFilter: options?.includeTenantFilter,
        filters: {
          risk: 'all',
          activity: 'all',
          episodeStatus: options?.status ?? 'all',
          minDaysPostOp: null,
          minDaysSinceChat: null,
        },
      });
      return {
        items: body.items,
        total: body.total,
        page: body.page,
        page_size: body.page_size,
      };
    },
    AUDIT_CSV_FETCH_PAGE_SIZE,
    AUDIT_CSV_MAX_PAGES,
  );
}

export async function listCareEpisodeRecords(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeRecord[]> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{patient_uuid}/records', {
      params: { path: { patient_uuid: patientUuid } },
    }),
  );
  return body.items ?? [];
}

export async function listCareEpisodeAppointments(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeAppointment[]> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{patient_uuid}/appointments', {
      params: { path: { patient_uuid: patientUuid } },
    }),
  );
  return body.items ?? [];
}

export async function listCareEpisodeInboxMessages(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeInboxMessage[]> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{patient_uuid}/messages', {
      params: { path: { patient_uuid: patientUuid } },
    }),
  );
  return body.items ?? [];
}

export async function markCareEpisodeInboxMessageRead(
  token: string,
  activeActor: string,
  patientUuid: string,
  messageId: string,
): Promise<CareEpisodeInboxMessage> {
  const client = careEpisodeApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.PATCH('/api/v1/care-episodes/{patient_uuid}/messages/{message_uuid}/read', {
      params: {
        path: { patient_uuid: patientUuid, message_uuid: messageId },
      },
    }),
  );
}

/** Creates or updates the active care episode for a patient (`POST /api/v1/care-episodes`). */
export async function upsertCareEpisodeRecovery(
  token: string,
  activeActor: string,
  input: UpsertCareEpisodeRecoveryInput,
): Promise<CareEpisodeRecovery | null> {
  try {
    const client = careEpisodeApiClient(token, activeActor);
    return toCareEpisodeRecovery(
      unwrapOpenApiResponse(
        await client.POST('/api/v1/care-episodes', { body: input }),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    throw new Error(`Failed to upsert care episode recovery: ${message}`, { cause: error });
  }
}

export interface PatchCareEpisodeInput {
  status?: CareEpisodeStatus;
  care_window_days?: number;
}

export async function patchCareEpisode(
  token: string,
  activeActor: string,
  episodeUuid: string,
  input: PatchCareEpisodeInput,
): Promise<CareEpisodeRecovery> {
  const client = careEpisodeApiClient(token, activeActor);
  return toCareEpisodeRecovery(
    unwrapOpenApiResponse(
      await client.PATCH('/api/v1/care-episodes/{episode_uuid}', {
        params: { path: { episode_uuid: episodeUuid } },
        body: input,
      }),
    ),
  );
}

export async function getCareEpisode(
  token: string,
  activeActor: string,
  episodeUuid: string,
): Promise<CareEpisodeHistoryEntry> {
  const client = careEpisodeApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{episode_uuid}', {
      params: { path: { episode_uuid: episodeUuid } },
    }),
  );
}

export async function listCareEpisodes(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeHistoryEntry[]> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{patient_uuid}/episodes', {
      params: { path: { patient_uuid: patientUuid } },
    }),
  );
  return body.items ?? [];
}

/** @deprecated Use listCareEpisodes */
export async function listCareEpisodeHistory(
  token: string,
  activeActor: string,
  patientUuid: string,
): Promise<CareEpisodeHistoryEntry[]> {
  return listCareEpisodes(token, activeActor, patientUuid);
}

/** @deprecated Use patchCareEpisode with status closed */
export async function closeCareEpisodeRecovery(
  token: string,
  activeActor: string,
  episodeUuid: string,
): Promise<CareEpisodeRecovery> {
  return patchCareEpisode(token, activeActor, episodeUuid, { status: 'closed' });
}

/** @deprecated Use patchCareEpisode with status active */
export async function reopenCareEpisodeRecovery(
  token: string,
  activeActor: string,
  episodeUuid: string,
): Promise<CareEpisodeRecovery> {
  return patchCareEpisode(token, activeActor, episodeUuid, { status: 'active' });
}

export async function startNewCareEpisode(
  token: string,
  activeActor: string,
  input: StartNewCareEpisodeInput,
): Promise<CareEpisodeRecovery> {
  const { patient_uuid: patientUuid, ...body } = input;
  const client = careEpisodeApiClient(token, activeActor);
  return toCareEpisodeRecovery(
    unwrapOpenApiResponse(
      await client.POST('/api/v1/care-episodes/{patient_uuid}/episodes', {
        params: { path: { patient_uuid: patientUuid } },
        body,
      }),
    ),
  );
}

export async function bulkCloseCareEpisodeRecoveries(
  token: string,
  activeActor: string,
  patientUuids: string[],
): Promise<BulkCloseCareEpisodesResult> {
  const client = careEpisodeApiClient(token, activeActor);
  return unwrapOpenApiResponse(
    await client.POST('/api/v1/care-episodes/bulk-close', {
      body: { patient_uuids: patientUuids },
    }),
  );
}

export async function upsertCareEpisodeRecords(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeRecordUpsertItem[],
): Promise<void> {
  const client = careEpisodeApiClient(token, activeActor);
  unwrapOpenApiResponse(
    await client.POST('/api/v1/care-episodes/{patient_uuid}/records', {
      params: { path: { patient_uuid: patientUuid } },
      body: { items },
    }),
  );
}

export async function upsertCareEpisodeAppointments(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeAppointmentUpsertItem[],
): Promise<void> {
  const client = careEpisodeApiClient(token, activeActor);
  unwrapOpenApiResponse(
    await client.POST('/api/v1/care-episodes/{patient_uuid}/appointments', {
      params: { path: { patient_uuid: patientUuid } },
      body: { items },
    }),
  );
}

export async function upsertCareEpisodeInboxMessages(
  token: string,
  activeActor: string,
  patientUuid: string,
  items: CareEpisodeInboxMessageUpsertItem[],
): Promise<void> {
  const client = careEpisodeApiClient(token, activeActor);
  unwrapOpenApiResponse(
    await client.POST('/api/v1/care-episodes/{patient_uuid}/messages', {
      params: { path: { patient_uuid: patientUuid } },
      body: { items },
    }),
  );
}

export async function listPatientCareEpisodeAudits<
  T extends CareEpisodeRecoveryAuditItem | InteractionRiskAuditItem,
>(
  token: string,
  activeActor: string,
  patientUuid: string,
  source: PatientCareEpisodeAuditSource,
  page = 1,
  pageSize = 20,
): Promise<PatientCareEpisodeAuditListResponse & { items: T[] }> {
  const client = careEpisodeApiClient(token, activeActor);
  const body = unwrapOpenApiResponse(
    await client.GET('/api/v1/care-episodes/{patient_uuid}/audits', {
      params: {
        path: { patient_uuid: patientUuid },
        query: { source, page, page_size: pageSize },
      },
    }),
  );
  const items =
    source === 'episode'
      ? (body.items ?? [])
          .filter((item): item is components['schemas']['CareEpisodeRecoveryAuditItem'] => 'episode_uuid' in item)
          .map(normalizeEpisodeAuditItem)
      : (body.items ?? [])
          .filter((item): item is components['schemas']['InteractionRiskAuditItem'] => 'chat_interaction_uuid' in item)
          .map(normalizeRiskAuditItem);
  return {
    ...body,
    items: items as T[],
  };
}
