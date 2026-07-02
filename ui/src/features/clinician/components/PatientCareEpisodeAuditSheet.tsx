import { useEffect } from 'react';
import { AuditHistorySheet } from '@/shared/audit/AuditHistorySheet';
import AuditCsvDownloadButton from '@/shared/audit/AuditCsvDownloadButton';
import { buildAuditSection } from '@/shared/audit/buildAuditSection';
import { usePatientCareEpisodeAudits } from '@/features/clinician/lib/usePatientCareEpisodeAudits';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export default function PatientCareEpisodeAuditSheet({
  patient,
  token,
  activeActor,
  open,
  onOpenChange,
}: {
  patient: ActivePatientRecovery;
  token: string;
  activeActor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pv = usePatientViewStyles();
  const patientAuditLabel = patient.displayCode?.trim() || patient.patientUuid.slice(0, 8);
  const {
    episodeAudits,
    riskAudits,
    downloadingAuditCsv,
    handleDownloadAuditCsv,
  } = usePatientCareEpisodeAudits(token, activeActor, patient.patientUuid, patientAuditLabel);

  useEffect(() => {
    if (!open) {
      return;
    }
    void episodeAudits.reload();
    void riskAudits.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when sheet opens for this patient
  }, [open, patient.patientUuid]);

  return (
    <AuditHistorySheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          Patient audit history —{' '}
          <span className={cn('normal-case', pv.bodyText)}>{patient.displayName}</span>{' '}
          {patient.displayCode ? (
            <span className={cn('font-mono normal-case', pv.mutedText)}>({patient.displayCode})</span>
          ) : null}
        </>
      }
      sections={[
        buildAuditSection(
          {
            key: 'episode-audits',
            kind: 'episode',
            title: 'Care episode changes',
            actions: episodeAudits.total > 0 && !episodeAudits.error ? (
              <AuditCsvDownloadButton
                downloading={downloadingAuditCsv === 'episode'}
                onClick={() => void handleDownloadAuditCsv('episode')}
                className={pv.adminIconActionClass}
              />
            ) : null,
            emptyMessage: 'No care episode audit entries for this patient.',
            errorMessage: 'Failed to load episode audit history.',
          },
          episodeAudits,
        ),
        buildAuditSection(
          {
            key: 'risk-audits',
            kind: 'risk',
            title: 'Rolling risk evaluation summaries',
            actions: riskAudits.total > 0 && !riskAudits.error ? (
              <AuditCsvDownloadButton
                downloading={downloadingAuditCsv === 'risk'}
                onClick={() => void handleDownloadAuditCsv('risk')}
                className={pv.adminIconActionClass}
              />
            ) : null,
            emptyMessage: 'No risk evaluation audit entries yet — summaries appear after patient chat turns.',
            errorMessage: 'Failed to load risk evaluation audit history.',
          },
          riskAudits,
        ),
      ]}
    />
  );
}
