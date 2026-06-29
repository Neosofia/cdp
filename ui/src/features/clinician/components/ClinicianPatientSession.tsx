import { useEffect, useMemo, useState } from 'react';
import ClinicianTranscriptPanel from '@/features/clinician/components/ClinicianTranscriptPanel';
import NewCareEpisodeSheet from '@/features/clinician/components/NewCareEpisodeSheet';
import PatientCareEpisodeAuditSheet from '@/features/clinician/components/PatientCareEpisodeAuditSheet';
import PatientDischargeSummaryBanner from '@/features/clinician/components/PatientDischargeSummaryBanner';
import PatientSessionHeader from '@/features/clinician/components/PatientSessionHeader';
import PatientSessionDesktopToolbar, {
  PatientSessionMobileToolbar,
} from '@/features/clinician/components/PatientSessionToolbar';
import { useCareEpisodeLifecycle } from '@/features/clinician/lib/useCareEpisodeLifecycle';
import { useClinicianPatientChat } from '@/features/clinician/lib/useClinicianPatientChat';
import { usePatientEpisodeHistory } from '@/features/clinician/lib/usePatientEpisodeHistory';
import PatientMedicalRecordsSheet from '@/shared/care-episode/PatientMedicalRecordsSheet';
import { useAppShellTrailingContent } from '@/shared/app/AppShellTrailingContext';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export default function ClinicianPatientSession({
  patient,
  token,
  activeActor,
  clinicianDisplayName,
  clinicianRoleLabel,
  clinicianUuid,
  preferredEpisodeUuid,
  onEpisodeChanged,
  saveNotice,
  recordsOpen,
  onRecordsOpenChange,
  onEditPatient,
}: {
  patient: ActivePatientRecovery;
  token: string;
  activeActor: string;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  clinicianUuid?: string | null;
  preferredEpisodeUuid?: string | null;
  onEpisodeChanged: () => void;
  saveNotice?: string | null;
  recordsOpen: boolean;
  onRecordsOpenChange: (open: boolean) => void;
  onEditPatient: () => void;
}) {
  const pv = usePatientViewStyles();
  const [auditsOpen, setAuditsOpen] = useState(false);

  const history = usePatientEpisodeHistory(token, activeActor, patient, preferredEpisodeUuid);

  const lifecycle = useCareEpisodeLifecycle({
    token,
    activeActor,
    patient,
    managingEpisode: history.managingEpisode,
    onEpisodeChanged,
    reloadEpisodeHistory: history.reloadEpisodeHistory,
  });

  const chat = useClinicianPatientChat({
    token,
    activeActor,
    patientUuid: patient.patientUuid,
    clinicianUuid,
    episodeStatus: lifecycle.episodeStatus,
  });

  const sessionToolbarProps = {
    episodeHistory: history.episodeHistory,
    selectedHistoryUuid: history.selectedHistoryUuid,
    historyLoading: history.historyLoading,
    onSelectEpisode: history.setSelectedHistoryUuid,
    onOpenRecords: () => onRecordsOpenChange(true),
    onOpenAudits: () => setAuditsOpen(true),
    onEditPatient,
    outlineButtonClass: pv.outlineButton,
    inputClass: pv.inputClass,
  };

  const desktopToolbar = useMemo(
    () => <PatientSessionDesktopToolbar {...sessionToolbarProps} />,
    [
      history.episodeHistory,
      history.selectedHistoryUuid,
      history.historyLoading,
      onEditPatient,
      onRecordsOpenChange,
      pv.outlineButton,
      pv.inputClass,
    ],
  );

  useAppShellTrailingContent(desktopToolbar);

  useEffect(() => {
    setAuditsOpen(false);
  }, [patient.patientUuid]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {saveNotice ? (
        <p
          role="status"
          className="shrink-0 rounded-md border px-3 py-2 text-sm text-emerald-200"
          style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.1)' }}
        >
          {saveNotice}
        </p>
      ) : null}

      <PatientSessionMobileToolbar {...sessionToolbarProps} />

      <PatientSessionHeader
        patient={patient}
        headerDaysPostOp={history.headerDaysPostOp}
        headerRisk={history.headerRisk}
        headerEpisodeClosed={history.headerEpisodeClosed}
        episodeStatus={lifecycle.episodeStatus}
        showLifecycleActions={history.showLifecycleActions}
        lifecycleBusy={lifecycle.lifecycleBusy}
        onCloseEpisode={() => void lifecycle.handleEpisodeClose()}
        onReopenEpisode={() => void lifecycle.handleEpisodeReopen()}
        onNewEpisode={() => lifecycle.setNewEpisodeOpen(true)}
      />

      {lifecycle.lifecycleError ? (
        <p className="text-xs text-red-400 shrink-0">{lifecycle.lifecycleError}</p>
      ) : null}

      {history.showDischargeSummary && history.selectedHistoryEntry ? (
        <PatientDischargeSummaryBanner entry={history.selectedHistoryEntry} />
      ) : null}

      {history.showHistorySelect && !history.viewingManagingEpisode ? (
        <p className={cn('text-sm shrink-0', pv.mutedText)}>
          Viewing a prior discharge for review. Select the current episode above to
          manage the live care episode.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ClinicianTranscriptPanel
          patient={patient}
          messages={chat.transcript}
          interactions={chat.interactions}
          activeInteractionUuid={chat.activeInteractionUuid}
          onSelectInteraction={chat.setActiveInteractionUuid}
          onSendClinicianMessage={chat.handleSendClinicianMessage}
          clinicianDisplayName={clinicianDisplayName}
          clinicianRoleLabel={clinicianRoleLabel}
          interventionThreadUuids={chat.interventionThreadUuids}
          canCompose={chat.canCompose}
          loading={chat.transcriptLoading}
          error={chat.transcriptError}
          composeError={chat.composeError}
          sending={chat.sendingReply}
        />
      </div>

      <PatientCareEpisodeAuditSheet
        patient={patient}
        token={token}
        activeActor={activeActor}
        open={auditsOpen}
        onOpenChange={setAuditsOpen}
      />

      <PatientMedicalRecordsSheet
        open={recordsOpen}
        onOpenChange={onRecordsOpenChange}
        token={token}
        activeActor={activeActor}
        patientUuid={patient.patientUuid}
        defaultRiskLevel={patient.riskLevel}
      />

      {patient.tenantUuid ? (
        <NewCareEpisodeSheet
          open={lifecycle.newEpisodeOpen}
          onOpenChange={lifecycle.setNewEpisodeOpen}
          patientUuid={patient.patientUuid}
          displayCode={patient.displayCode}
          displayName={patient.displayName}
          tenantUuid={patient.tenantUuid}
          token={token}
          activeActor={activeActor}
          onStarted={lifecycle.handleNewEpisodeStarted}
        />
      ) : null}
    </div>
  );
}
