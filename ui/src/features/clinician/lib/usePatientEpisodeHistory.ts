import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  daysPostOpFromProcedureDate,
  historyRiskLevel,
} from '@/features/clinician/lib/clinicianEpisodeHistory';
import { riskForRecovery, type ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { listCareEpisodeHistory, type CareEpisodeHistoryEntry } from '@/shared/care-episode/careEpisodeApi';

export function usePatientEpisodeHistory(
  token: string,
  activeActor: string,
  patient: ActivePatientRecovery,
  preferredEpisodeUuid?: string | null,
) {
  const [episodeHistory, setEpisodeHistory] = useState<CareEpisodeHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryUuid, setSelectedHistoryUuid] = useState('');

  const reloadEpisodeHistory = useCallback(async (options?: { selectEpisodeUuid?: string }) => {
    setHistoryLoading(true);
    try {
      const items = await listCareEpisodeHistory(token, activeActor, patient.patientUuid);
      setEpisodeHistory(items);
      setSelectedHistoryUuid((previous) => {
        const preferred = options?.selectEpisodeUuid?.trim();
        if (preferred && items.some((item) => item.episode_uuid === preferred)) {
          return preferred;
        }
        if (options?.selectEpisodeUuid !== undefined) {
          return items.find((item) => item.is_current)?.episode_uuid ?? items[0]?.episode_uuid ?? '';
        }
        if (items.some((item) => item.episode_uuid === previous)) {
          return previous;
        }
        return items.find((item) => item.is_current)?.episode_uuid ?? items[0]?.episode_uuid ?? '';
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [token, activeActor, patient.patientUuid]);

  useEffect(() => {
    const preferred = preferredEpisodeUuid?.trim();
    void reloadEpisodeHistory(preferred ? { selectEpisodeUuid: preferred } : undefined);
  }, [reloadEpisodeHistory, preferredEpisodeUuid]);

  const selectedHistoryEntry = useMemo(
    () => episodeHistory.find((entry) => entry.episode_uuid === selectedHistoryUuid) ?? null,
    [episodeHistory, selectedHistoryUuid],
  );
  const showHistorySelect = episodeHistory.length > 1
    || episodeHistory.some((entry) => !entry.is_current);
  const liveEpisode = useMemo(
    () => episodeHistory.find((entry) => entry.is_current && entry.status === 'active') ?? null,
    [episodeHistory],
  );
  const managingEpisode = useMemo(() => {
    if (liveEpisode) {
      return liveEpisode;
    }
    return episodeHistory.find((entry) => entry.is_current) ?? episodeHistory[0] ?? null;
  }, [episodeHistory, liveEpisode]);
  const viewingManagingEpisode = Boolean(
    managingEpisode && selectedHistoryEntry?.episode_uuid === managingEpisode.episode_uuid,
  );
  const showLifecycleActions = !showHistorySelect || viewingManagingEpisode;
  const viewingLiveEpisode = Boolean(
    liveEpisode && selectedHistoryEntry?.episode_uuid === liveEpisode.episode_uuid,
  );
  const showDischargeSummary = Boolean(
    selectedHistoryEntry?.status === 'closed'
    && !viewingLiveEpisode
    && episodeHistory.length > 1,
  );
  const headerDaysPostOp = selectedHistoryEntry
    ? daysPostOpFromProcedureDate(selectedHistoryEntry.procedure_date)
    : patient.daysPostOp;
  const headerRisk = selectedHistoryEntry
    ? historyRiskLevel(selectedHistoryEntry.risk_level)
    : riskForRecovery(patient);
  const headerEpisodeClosed = selectedHistoryEntry
    ? selectedHistoryEntry.status === 'closed'
    : patient.episodeStatus === 'closed';

  return {
    episodeHistory,
    historyLoading,
    selectedHistoryUuid,
    setSelectedHistoryUuid,
    reloadEpisodeHistory,
    selectedHistoryEntry,
    showHistorySelect,
    liveEpisode,
    managingEpisode,
    viewingManagingEpisode,
    showLifecycleActions,
    viewingLiveEpisode,
    showDischargeSummary,
    headerDaysPostOp,
    headerRisk,
    headerEpisodeClosed,
  };
}
