import { useCallback, useState } from 'react';
import {
  downloadPatientEpisodeAuditCsv,
  downloadPatientRiskAuditCsv,
} from '@/shared/audit/downloadAuditCsv';
import { usePaginatedAudit } from '@/shared/audit/usePaginatedAudit';
import {
  listPatientCareEpisodeAudits,
  type CareEpisodeRecoveryAuditItem,
  type InteractionRiskAuditItem,
  type PatientCareEpisodeAuditSource,
} from '@/shared/care-episode/careEpisodeApi';

export function usePatientCareEpisodeAudits(
  token: string,
  activeActor: string,
  patientUuid: string,
  patientAuditLabel: string,
) {
  const [downloadingAuditCsv, setDownloadingAuditCsv] = useState<PatientCareEpisodeAuditSource | null>(null);

  const fetchEpisodeAuditPage = useCallback(
    async (pageNum: number, pageSize: number) => {
      const data = await listPatientCareEpisodeAudits<CareEpisodeRecoveryAuditItem>(
        token,
        activeActor,
        patientUuid,
        'episode',
        pageNum,
        pageSize,
      );
      return {
        items: data.items,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
      };
    },
    [token, activeActor, patientUuid],
  );

  const fetchRiskAuditPage = useCallback(
    async (pageNum: number, pageSize: number) => {
      const data = await listPatientCareEpisodeAudits<InteractionRiskAuditItem>(
        token,
        activeActor,
        patientUuid,
        'risk',
        pageNum,
        pageSize,
      );
      return {
        items: data.items,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
      };
    },
    [token, activeActor, patientUuid],
  );

  const episodeAudits = usePaginatedAudit<CareEpisodeRecoveryAuditItem>({
    fetchPage: fetchEpisodeAuditPage,
  });

  const riskAudits = usePaginatedAudit<InteractionRiskAuditItem>({
    fetchPage: fetchRiskAuditPage,
  });

  const handleDownloadAuditCsv = useCallback(
    async (source: PatientCareEpisodeAuditSource) => {
      const audit = source === 'episode' ? episodeAudits : riskAudits;
      if (audit.total <= 0) {
        return;
      }
      setDownloadingAuditCsv(source);
      try {
        const rows = await audit.exportAll();
        if (source === 'episode') {
          downloadPatientEpisodeAuditCsv(rows as CareEpisodeRecoveryAuditItem[], patientAuditLabel);
        } else {
          downloadPatientRiskAuditCsv(rows as InteractionRiskAuditItem[], patientAuditLabel);
        }
      } finally {
        setDownloadingAuditCsv(null);
      }
    },
    [episodeAudits, patientAuditLabel, riskAudits],
  );

  return {
    episodeAudits,
    riskAudits,
    downloadingAuditCsv,
    handleDownloadAuditCsv,
  };
}
