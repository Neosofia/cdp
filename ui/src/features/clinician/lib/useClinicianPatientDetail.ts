import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ActivePatientRecovery,
} from '@/features/clinician/lib/patientRoster';
import { recoveryFromEpisodeRow } from '@/features/clinician/lib/rosterFromEpisode';
import { fetchCareEpisodeListPage } from '@/shared/care-episode/careEpisodeApi';
import { toUserFacingError } from '@/shared/core/userFacingError';

export function useClinicianPatientDetail(
  token: string,
  activeActor: string,
  tenantUuid: string | null | undefined,
  patientUuid: string | null | undefined,
  tenantName?: string | null,
) {
  const [patient, setPatient] = useState<ActivePatientRecovery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientUuid || !tenantUuid) {
      setPatient(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCareEpisodeListPage(token, activeActor, tenantUuid, {
        page: 1,
        pageSize: 1,
        search: patientUuid,
        filters: { ...DEFAULT_CLINICIAN_LIST_FILTERS, episodeStatus: 'all' },
      });
      const care = response.items.find((row) => row.user_uuid === patientUuid);
      if (!care) {
        throw new Error('Patient not found in care episode registry.');
      }
      setPatient(recoveryFromEpisodeRow(care, tenantName));
    } catch (err) {
      setPatient(null);
      setError(toUserFacingError(err, 'Failed to load patient'));
    } finally {
      setLoading(false);
    }
  }, [token, activeActor, tenantUuid, patientUuid, tenantName]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { patient, loading, error, reload };
}
