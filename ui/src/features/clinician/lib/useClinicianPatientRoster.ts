import { useCallback } from 'react';
import {
  PATIENT_LIST_PAGE_SIZE,
  type ActivePatientRecovery,
  type ClinicianListFilters,
} from '@/features/clinician/lib/patientRoster';
import { recoveryFromEpisodeRow } from '@/features/clinician/lib/rosterFromEpisode';
import { fetchCareEpisodeListPage } from '@/shared/care-episode/careEpisodeApi';
import { usePaginatedRemoteList } from '@/shared/pagination/usePaginatedRemoteList';

interface UseClinicianPatientRosterOptions {
  token: string;
  activeActor: string;
  tenantUuid: string | null | undefined;
  tenantName?: string | null;
  listFilters: ClinicianListFilters;
  rosterRevision?: number;
  enabled?: boolean;
}

export function useClinicianPatientRoster({
  token,
  activeActor,
  tenantUuid,
  tenantName,
  listFilters,
  rosterRevision = 0,
  enabled = true,
}: UseClinicianPatientRosterOptions) {
  const fetchPage = useCallback(
    async (page: number, pageSize: number, search: string): Promise<{
      items: ActivePatientRecovery[];
      total: number;
    }> => {
      void rosterRevision;
      if (!tenantUuid) {
        return { items: [], total: 0 };
      }
      const response = await fetchCareEpisodeListPage(token, activeActor, tenantUuid, {
        page,
        pageSize,
        search,
        filters: listFilters,
      });
      return {
        items: response.items.map((care) => recoveryFromEpisodeRow(care, tenantName)),
        total: response.total,
      };
    },
    [token, activeActor, tenantUuid, tenantName, listFilters, rosterRevision],
  );

  const roster = usePaginatedRemoteList<ActivePatientRecovery>({
    pageSize: PATIENT_LIST_PAGE_SIZE,
    fetchPage,
    enabled: enabled && Boolean(tenantUuid),
  });

  if (!enabled || !tenantUuid) {
    return {
      ...roster,
      items: [],
      total: 0,
      loading: false,
      error: tenantUuid ? roster.error : 'Tenant context is required to load the patient registry.',
    };
  }

  return roster;
}
