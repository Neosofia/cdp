import {
  auditBaseCsvCells,
  csvEscape,
  downloadCsv,
} from '@/shared/audit/csvExport';
import type {
  CareEpisodeRecoveryAuditItem,
  InteractionRiskAuditItem,
  ServiceAuditItem,
  UserAuditItem,
} from '@/shared/audit/types';

export function downloadServiceAuditCsv(
  rows: ServiceAuditItem[],
  source: 'service' | 'credential',
  slug: string,
): void {
  const headers =
    source === 'service'
      ? ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Name', 'Slug', 'Base URL']
      : ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Secret'];

  const lines = [
    headers.join(','),
    ...rows.map((row) => {
      const base = auditBaseCsvCells(row);
      return source === 'service'
        ? [...base, csvEscape(row.name), csvEscape(row.slug), csvEscape(row.base_url)].join(',')
        : [...base, '"***"'].join(',');
    }),
  ];

  downloadCsv(`${slug}-${source}-audit.csv`, lines);
}

export function downloadUserAuditCsv(rows: UserAuditItem[], userLabel: string): void {
  const lines = [
    ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'First name', 'Last name', 'Email', 'Roles'].join(','),
    ...rows.map((row) =>
      [
        ...auditBaseCsvCells(row),
        csvEscape(row.first_name),
        csvEscape(row.last_name),
        csvEscape(row.email),
        csvEscape(row.roles.join('; ')),
      ].join(','),
    ),
  ];
  downloadCsv(`${userLabel}-user-audit.csv`, lines);
}

export function downloadPatientEpisodeAuditCsv(
  rows: CareEpisodeRecoveryAuditItem[],
  patientLabel: string,
): void {
  const lines = [
    [
      'Changed at (UTC)',
      'Event',
      'Actor Type',
      'Actor UUID',
      'Episode UUID',
      'Risk',
      'Status',
      'Procedure',
      'Recovery ID',
    ].join(','),
    ...rows.map((row) =>
      [
        ...auditBaseCsvCells(row),
        csvEscape(row.episode_uuid),
        csvEscape(row.risk_level),
        csvEscape(row.status),
        csvEscape(row.surgery),
        csvEscape(row.recovery_id),
      ].join(','),
    ),
  ];
  downloadCsv(`${patientLabel}-episode-audit.csv`, lines);
}

export function downloadPatientRiskAuditCsv(
  rows: InteractionRiskAuditItem[],
  patientLabel: string,
): void {
  const lines = [
    ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Thread UUID', 'Rolling summary'].join(','),
    ...rows.map((row) =>
      [
        ...auditBaseCsvCells(row),
        csvEscape(row.chat_interaction_uuid),
        csvEscape(row.summary),
      ].join(','),
    ),
  ];
  downloadCsv(`${patientLabel}-risk-audit.csv`, lines);
}
