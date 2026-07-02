import { upsertCareEpisodeRecovery } from '@/shared/care-episode/careEpisodeApi';
import {
  type RegistryPatientUser,
} from '@/features/clinician/lib/patientRoster';
import { createPatientUser, type RegistryUser } from '@/shared/user-registry/userRegistryApi';

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

function resolveTenantUuid(input: PostCareEnrollmentInput, patient: RegistryPatientUser): string | undefined {
  return input.tenant_uuid?.trim()
    || patient.tenant_uuid?.trim()
    || input.newPatient?.tenant_uuid?.trim()
    || input.existingPatientProfile?.tenant_uuid?.trim()
    || undefined;
}

function registryUserAsPatient(user: RegistryUser): RegistryPatientUser {
  return {
    uuid: user.uuid,
    tenant_uuid: user.tenant_uuid,
    display_code: user.display_code ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    email: user.email ?? null,
    roles: user.roles,
  };
}

export async function enrollPatientInPostCare(
  token: string,
  activeActor: string,
  input: PostCareEnrollmentInput,
): Promise<PostCareEnrollmentResult> {
  let patient: RegistryPatientUser;

  if (input.newPatient) {
    patient = registryUserAsPatient(await createPatientUser(token, activeActor, input.newPatient));
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

  if (!tenantUuid) {
    throw new Error('Tenant context is required to enroll a patient in post-care monitoring.');
  }

  try {
    const created = await upsertCareEpisodeRecovery(token, activeActor, {
      patient_uuid: patient.uuid,
      tenant_uuid: tenantUuid,
      surgery: input.procedure.trim(),
      procedure_date: input.procedure_date.trim(),
      recovery_id: recoveryId,
      risk_level: 'low',
      care_window_days: input.care_window_days,
    });
    if (created?.episode_uuid) {
      episodeUuid = created.episode_uuid;
      demoOnlyEpisode = false;
    }
  } catch (err) {
    if (import.meta.env.VITE_CARE_EPISODE_API_URL) {
      throw err;
    }
  }

  return {
    patientUuid: patient.uuid,
    episodeUuid,
    demoOnlyEpisode,
  };
}
