import { useCallback, useEffect, useState } from 'react';
import {
  closeCareEpisodeRecovery,
  reopenCareEpisodeRecovery,
  type CareEpisodeHistoryEntry,
} from '@/shared/care-episode/careEpisodeApi';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';

export function useCareEpisodeLifecycle({
  token,
  activeActor,
  patient,
  managingEpisode,
  onEpisodeChanged,
  reloadEpisodeHistory,
}: {
  token: string;
  activeActor: string;
  patient: ActivePatientRecovery;
  managingEpisode: CareEpisodeHistoryEntry | null;
  onEpisodeChanged: () => void;
  reloadEpisodeHistory: (options?: { selectEpisodeUuid?: string }) => Promise<void>;
}) {
  const [episodeStatus, setEpisodeStatus] = useState(patient.episodeStatus);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [newEpisodeOpen, setNewEpisodeOpen] = useState(false);

  useEffect(() => {
    setEpisodeStatus(patient.episodeStatus);
  }, [patient.episodeStatus, patient.patientUuid]);

  const handleEpisodeClose = useCallback(async () => {
    if (!managingEpisode?.episode_uuid) {
      setLifecycleError('No care episode to close');
      return;
    }
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      const result = await closeCareEpisodeRecovery(token, activeActor, managingEpisode.episode_uuid);
      setEpisodeStatus(result.status ?? 'closed');
      onEpisodeChanged();
      void reloadEpisodeHistory();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to close episode');
    } finally {
      setLifecycleBusy(false);
    }
  }, [activeActor, managingEpisode, onEpisodeChanged, reloadEpisodeHistory, token]);

  const handleEpisodeReopen = useCallback(async () => {
    if (!managingEpisode?.episode_uuid) {
      setLifecycleError('No care episode to reopen');
      return;
    }
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      const result = await reopenCareEpisodeRecovery(token, activeActor, managingEpisode.episode_uuid);
      setEpisodeStatus(result.status ?? 'active');
      onEpisodeChanged();
      void reloadEpisodeHistory();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to reopen episode');
    } finally {
      setLifecycleBusy(false);
    }
  }, [activeActor, managingEpisode, onEpisodeChanged, reloadEpisodeHistory, token]);

  const handleNewEpisodeStarted = useCallback(
    (episodeUuid: string) => {
      setEpisodeStatus('active');
      setLifecycleError(null);
      onEpisodeChanged();
      void reloadEpisodeHistory({ selectEpisodeUuid: episodeUuid });
    },
    [onEpisodeChanged, reloadEpisodeHistory],
  );

  return {
    episodeStatus,
    lifecycleBusy,
    lifecycleError,
    newEpisodeOpen,
    setNewEpisodeOpen,
    handleEpisodeClose,
    handleEpisodeReopen,
    handleNewEpisodeStarted,
  };
}
