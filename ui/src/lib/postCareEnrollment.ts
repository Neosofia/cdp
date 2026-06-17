import { createCareEpisodeInvite, upsertCareEpisodeRecovery } from '@/lib/careEpisodeApi';
import {
  registerPostCareEnrollment,
  type DemoPatientClinical,
  type RegistryPatientUser,
} from '@/lib/demoPatients';
import { createPatientUser } from '@/lib/userRegistryApi';

export interface NewPatientFields {
  first_name: string;
  last_name: string;
  email: string;
  display_code: string;
  tenant_uuid: string;
  roles: string[];
}

export interface ExistingPatientProfile {
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  tenant_uuid: string;
}

export interface PostCareEnrollmentInput {
  procedure: string;
  procedure_type: string;
  care_window_days: number;
  procedure_date: string;
  tenant_uuid?: string;
  emr_procedure_ref?: string;
  newPatient?: NewPatientFields;
  existingPatientUuid?: string;
  existingPatientProfile?: ExistingPatientProfile;
}

export interface PostCareEnrollmentResult {
  patientUuid: string;
  episodeUuid: string | null;
  demoOnlyEpisode: boolean;
}

function recoveryIdForPatient(displayCode: string, patientUuid: string): string {
  const code = displayCode.trim() || patientUuid.slice(0, 8).toUpperCase();
  return `EP-${code}`;
}

function daysPostOpFromDate(procedureDate: string): number {
  const procedureMs = Date.parse(`${procedureDate.trim()}T12:00:00`);
  if (!Number.isFinite(procedureMs)) {
    return 0;
  }
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((todayMs - procedureMs) / (24 * 60 * 60 * 1000)));
}

function clinicalFromEnrollment(
  input: PostCareEnrollmentInput,
  displayCode: string,
  patientUuid: string,
): DemoPatientClinical {
  const procedureDate = input.procedure_date.trim();
  return {
    surgery: input.procedure.trim(),
    procedureDate,
    daysPostOp: daysPostOpFromDate(procedureDate),
    recoveryId: recoveryIdForPatient(displayCode, patientUuid),
    riskLevel: 'Low',
  };
}

function resolveTenantUuid(input: PostCareEnrollmentInput, patient: RegistryPatientUser): string | undefined {
  return input.tenant_uuid?.trim()
    || patient.tenant_uuid?.trim()
    || input.newPatient?.tenant_uuid?.trim()
    || input.existingPatientProfile?.tenant_uuid?.trim()
    || undefined;
}

export async function enrollPatientInPostCare(
  token: string,
  activeActor: string,
  input: PostCareEnrollmentInput,
): Promise<PostCareEnrollmentResult> {
  let patient: RegistryPatientUser;

  if (input.newPatient) {
    patient = await createPatientUser(token, activeActor, input.newPatient);
  } else if (input.existingPatientUuid) {
    const profile = input.existingPatientProfile;
    patient = {
      uuid: input.existingPatientUuid,
      tenant_uuid: profile?.tenant_uuid ?? input.tenant_uuid ?? '',
      display_code: profile?.display_code ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: null,
      roles: ['patient.self'],
    };
  } else {
    throw new Error('Select an existing patient or enter details for a new patient.');
  }

  const displayCode = patient.display_code?.trim() || patient.uuid.slice(0, 8).toUpperCase();
  const recoveryId = recoveryIdForPatient(displayCode, patient.uuid);
  const tenantUuid = resolveTenantUuid(input, patient);
  let episodeUuid: string | null = null;
  let demoOnlyEpisode = true;

  try {
    const episode = await createCareEpisodeInvite(token, activeActor, {
      patient_uuid: patient.uuid,
      procedure_type: input.procedure_type,
      care_window_days: input.care_window_days,
      emr_procedure_ref: input.emr_procedure_ref?.trim() || undefined,
    });
    if (episode) {
      episodeUuid = episode.episode_uuid;
      demoOnlyEpisode = false;
    }

    if (tenantUuid) {
      await upsertCareEpisodeRecovery(token, activeActor, {
        patient_uuid: patient.uuid,
        tenant_uuid: tenantUuid,
        surgery: input.procedure.trim(),
        procedure_date: input.procedure_date.trim(),
        recovery_id: recoveryId,
        risk_level: 'low',
        reactivate: true,
        care_window_days: input.care_window_days,
      });
      demoOnlyEpisode = false;
    }
  } catch (err) {
    if (import.meta.env.VITE_CARE_EPISODE_API_URL) {
      throw err;
    }
  }

  registerPostCareEnrollment(
    patient.uuid,
    clinicalFromEnrollment(input, displayCode, patient.uuid),
  );

  return {
    patientUuid: patient.uuid,
    episodeUuid,
    demoOnlyEpisode,
  };
}
