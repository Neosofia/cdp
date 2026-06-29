import { useCallback, useEffect, useState } from 'react';
import {
  PATIENT_LIST_PAGE_SIZE,
  type ActivePatientRecovery,
} from '@/features/clinician/lib/patientRoster';
import { recoveryFromEpisodeRow } from '@/features/clinician/lib/rosterFromEpisode';
import { fetchCareEpisodeRosterSummary } from '@/shared/care-episode/careEpisodeApi';

interface UseClinicianDashboardSummaryOptions {
  token: string;
  activeActor: string;
  tenantUuid: string | null | undefined;
  tenantName?: string | null;
  enabled?: boolean;
}

const EMPTY_SUMMARY = {
  highRiskCount: 0,
  mediumRiskCount: 0,
  chatsTodayCount: 0,
  activePatients30MinCount: 0,
  previewPatients: [] as ActivePatientRecovery[],
  activeChatPatients: [] as ActivePatientRecovery[],
  previewTotal: 0,
  previewPage: 1,
  previewTotalPages: 1,
  previewRangeStart: 0,
  previewRangeEnd: 0,
};

export function useClinicianDashboardSummary({
  token,
  activeActor,
  tenantUuid,
  tenantName,
  enabled = true,
}: UseClinicianDashboardSummaryOptions) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [previewPage, setPreviewPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !tenantUuid || activeActor !== 'clinician') {
      setSummary(EMPTY_SUMMARY);
      setError(tenantUuid ? null : 'Tenant context is required to load clinician dashboard data.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const body = await fetchCareEpisodeRosterSummary(token, activeActor, tenantUuid, {
        page: previewPage,
        pageSize: PATIENT_LIST_PAGE_SIZE,
      });
      const previewTotalPages = Math.max(1, Math.ceil(body.preview.total / PATIENT_LIST_PAGE_SIZE));
      const previewRangeStart = body.preview.total === 0
        ? 0
        : (previewPage - 1) * PATIENT_LIST_PAGE_SIZE + 1;
      const previewRangeEnd = Math.min(previewPage * PATIENT_LIST_PAGE_SIZE, body.preview.total);

      setSummary({
        highRiskCount: body.high_risk_count,
        mediumRiskCount: body.medium_risk_count,
        chatsTodayCount: body.chats_today_count,
        activePatients30MinCount: body.active_patients_30m_count,
        previewPatients: body.preview.items.map((care) => recoveryFromEpisodeRow(care, tenantName)),
        activeChatPatients: body.active_chats.items.map((care) => recoveryFromEpisodeRow(care, tenantName)),
        previewTotal: body.preview.total,
        previewPage,
        previewTotalPages,
        previewRangeStart,
        previewRangeEnd,
      });
    } catch (err) {
      setSummary(EMPTY_SUMMARY);
      setError(err instanceof Error ? err.message : 'Failed to load clinician dashboard');
    } finally {
      setLoading(false);
    }
  }, [token, activeActor, tenantUuid, tenantName, enabled, previewPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ...summary,
    loading,
    error,
    reload,
    setPreviewPage,
  };
}
