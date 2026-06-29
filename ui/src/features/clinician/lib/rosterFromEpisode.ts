import type { components } from '@/shared/api/generated/care-episode.schema';
import type { CareEpisodeRecovery } from '@/shared/care-episode/careEpisodeApi';
import {
  DEFAULT_CARE_WINDOW_DAYS,
  riskLevelFromApi,
  type ActivePatientRecovery,
} from '@/features/clinician/lib/patientRoster';
import { displayNameForUser } from '@/features/clinician/lib/patientRosterList';

type PatientProfile = components['schemas']['PatientProfile'];

export function recoveryFromCareEpisode(
  care: CareEpisodeRecovery,
  user?: PatientProfile | null,
  tenantName?: string | null,
): ActivePatientRecovery {
  const fallbackCode = care.user_uuid.slice(0, 8).toUpperCase();
  return {
    patientUuid: care.user_uuid,
    displayCode: user?.display_code?.trim() || fallbackCode,
    displayName: user
      ? displayNameForUser({
          first_name: user.first_name ?? null,
          last_name: user.last_name ?? null,
          email: user.email ?? null,
        })
      : fallbackCode,
    surgery: care.surgery,
    procedureDate: care.procedure_date,
    daysPostOp: care.days_post_op,
    recoveryId: care.recovery_id,
    lastChatAt: care.last_activity ?? null,
    riskLevel: riskLevelFromApi(care.risk_level),
    riskSummary: care.risk_summary ?? null,
    episodeStatus: care.status ?? 'active',
    tenantUuid: care.tenant_uuid ?? null,
    tenantName: tenantName ?? null,
    careWindowDays: care.care_window_days ?? DEFAULT_CARE_WINDOW_DAYS,
  };
}

export function recoveryFromEpisodeRow(
  care: CareEpisodeRecovery,
  tenantName?: string | null,
): ActivePatientRecovery {
  return recoveryFromCareEpisode(care, care.patient, tenantName);
}
