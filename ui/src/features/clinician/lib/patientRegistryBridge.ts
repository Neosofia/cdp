import {
  DEFAULT_CARE_WINDOW_DAYS,
  type ActivePatientRecovery,
  type DemoPatientClinical,
  type RegistryPatientUser,
} from '@/features/clinician/lib/patientRosterTypes';
import { displayNameForUser } from '@/features/clinician/lib/patientRosterList';

/** Runtime post-care enrollments (until Care Episode Service backs the roster). */
const postCareEnrollmentOverlays = new Map<string, DemoPatientClinical>();

export function registerPostCareEnrollment(patientUuid: string, clinical: DemoPatientClinical): void {
  postCareEnrollmentOverlays.set(patientUuid, clinical);
}

const DEFAULT_ENROLLED_CLINICAL: DemoPatientClinical = {
  surgery: 'Enrollment — clinical data pending',
  procedureDate: new Date().toISOString().slice(0, 10),
  daysPostOp: 0,
  recoveryId: 'NEW',
  riskLevel: 'Low',
};

function defaultClinicalForUser(user: RegistryPatientUser): DemoPatientClinical {
  const code = user.display_code?.trim() || user.uuid.slice(0, 8).toUpperCase();
  return {
    ...DEFAULT_ENROLLED_CLINICAL,
    recoveryId: `S-${code}`,
  };
}

function mergePatientRecovery(user: RegistryPatientUser): ActivePatientRecovery | null {
  if (!user.roles.includes('patient.self')) {
    return null;
  }

  const displayCode = user.display_code?.trim() || user.uuid.slice(0, 8).toUpperCase();
  const clinical = postCareEnrollmentOverlays.get(user.uuid)
    ?? defaultClinicalForUser(user);

  return {
    patientUuid: user.uuid,
    displayCode,
    displayName: displayNameForUser(user),
    surgery: clinical.surgery,
    procedureDate: clinical.procedureDate,
    daysPostOp: clinical.daysPostOp,
    recoveryId: clinical.recoveryId,
    lastChatAt: null,
    riskLevel: clinical.riskLevel ?? 'Low',
    episodeStatus: 'active',
    careWindowDays: DEFAULT_CARE_WINDOW_DAYS,
  };
}

/** Placeholder roster rows for tenant users before care-episode recoveries are merged in. */
export function mergePatientRecoveries(users: RegistryPatientUser[]): ActivePatientRecovery[] {
  return users
    .map(mergePatientRecovery)
    .filter((session): session is ActivePatientRecovery => session !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
