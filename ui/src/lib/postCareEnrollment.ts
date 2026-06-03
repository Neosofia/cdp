import { createCareEpisodeInvite } from '@/lib/careEpisodeApi';
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
  tenant_uuid?: string;
}

export interface PostCareEnrollmentInput {
  procedure: string;
  procedure_type: string;
  care_window_days: number;
  emr_procedure_ref?: string;
  newPatient?: NewPatientFields;
  existingPatientUuid?: string;
}

export interface PostCareEnrollmentResult {
  patientUuid: string;
  episodeUuid: string | null;
  demoOnlyEpisode: boolean;
}

function sessionIdForPatient(displayCode: string, patientUuid: string): string {
  const code = displayCode.trim() || patientUuid.slice(0, 8).toUpperCase();
  return `EP-${code}`;
}

function clinicalFromEnrollment(
  input: PostCareEnrollmentInput,
  displayCode: string,
  patientUuid: string,
): DemoPatientClinical {
  const procedureDate = new Date().toISOString().slice(0, 10);
  return {
    surgery: input.procedure.trim(),
    procedureDate,
    daysPostOp: 0,
    sessionId: sessionIdForPatient(displayCode, patientUuid),
    riskLevel: 'Low',
  };
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
    patient = {
      uuid: input.existingPatientUuid,
      tenant_uuid: '',
      display_code: null,
      first_name: null,
      last_name: null,
      email: null,
      roles: ['patient.self'],
    };
  } else {
    throw new Error('Select an existing patient or enter details for a new patient.');
  }

  const displayCode = patient.display_code?.trim() || patient.uuid.slice(0, 8).toUpperCase();
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
