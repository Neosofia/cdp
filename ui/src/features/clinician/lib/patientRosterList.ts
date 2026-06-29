import { parseActivityMs } from '@/shared/core/formatRelativeActivity';
import {
  CHAT_ACTIVE_WINDOW_MS,
  CHAT_TODAY_WINDOW_MS,
  CHAT_WEEK_WINDOW_MS,
  type ActivePatientRecovery,
  type ClinicianListFilters,
  type PatientRiskLevel,
  type RegistryPatientUser,
} from '@/features/clinician/lib/patientRosterTypes';

export function displayNameForUser(user: Pick<RegistryPatientUser, 'first_name' | 'last_name' | 'email'>): string {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || 'Unknown patient';
}

/** Registry patients not yet on the clinician active roster (post-care enroll pick list). */
export function registryUsersNotYetEnrolled(
  registryUsers: RegistryPatientUser[],
  enrolledRecoveries: ActivePatientRecovery[],
): RegistryPatientUser[] {
  const enrolledUuids = new Set(enrolledRecoveries.map((session) => session.patientUuid));
  return registryUsers.filter((user) => !enrolledUuids.has(user.uuid));
}

/** Map care-episode API risk_level (lowercase) to roster display level. */
export function riskLevelFromApi(value: string | null | undefined): PatientRiskLevel {
  const level = (value ?? 'low').trim().toLowerCase();
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  return 'Low';
}

export function activePatientByRecoveryId(
  sessions: ActivePatientRecovery[],
  recoveryId: string,
): ActivePatientRecovery | undefined {
  return sessions.find((patient) => patient.recoveryId === recoveryId);
}

export function activePatientByUuid(
  sessions: ActivePatientRecovery[],
  patientUuid: string,
): ActivePatientRecovery | undefined {
  return sessions.find((patient) => patient.patientUuid === patientUuid);
}

export function filterPatientRecoveries(
  sessions: ActivePatientRecovery[],
  query: string,
): ActivePatientRecovery[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return sessions;
  }
  return sessions.filter((session) =>
    session.displayName.toLowerCase().includes(q)
    || session.displayCode.toLowerCase().includes(q)
    || session.surgery.toLowerCase().includes(q)
    || session.recoveryId.toLowerCase().includes(q),
  );
}

export function riskForRecovery(session: ActivePatientRecovery): PatientRiskLevel {
  return session.riskLevel;
}

function riskRank(risk: PatientRiskLevel): number {
  if (risk === 'High') return 0;
  if (risk === 'Medium') return 1;
  return 2;
}

/** Top dashboard patients — highest risk first, then recent chat activity. */
export function highlightDashboardRecoveries(all: ActivePatientRecovery[]): ActivePatientRecovery[] {
  return [...all]
    .sort((a, b) => {
      const riskDiff = riskRank(riskForRecovery(a)) - riskRank(riskForRecovery(b));
      if (riskDiff !== 0) return riskDiff;
      return parseActivityMs(b.lastChatAt) - parseActivityMs(a.lastChatAt);
    })
    .slice(0, 4);
}

/** Default roster order: highest risk first, then most recent chat. */
export function sortPatientRecoveriesByRiskAndRecency(
  sessions: ActivePatientRecovery[],
): ActivePatientRecovery[] {
  return [...sessions].sort((a, b) => {
    const riskDiff = riskRank(riskForRecovery(a)) - riskRank(riskForRecovery(b));
    if (riskDiff !== 0) return riskDiff;
    const activityDiff = parseActivityMs(b.lastChatAt) - parseActivityMs(a.lastChatAt);
    if (activityDiff !== 0) return activityDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function hasRecentChat(
  session: ActivePatientRecovery,
  nowMs: number,
  windowMs: number,
): boolean {
  const ts = parseActivityMs(session.lastChatAt);
  return ts > 0 && nowMs - ts <= windowMs;
}

export function daysSinceLastChat(session: ActivePatientRecovery, nowMs: number): number | null {
  const ts = parseActivityMs(session.lastChatAt);
  if (!ts) return null;
  return Math.floor(Math.max(0, nowMs - ts) / (24 * 60 * 60 * 1000));
}

export function applyClinicianListFilters(
  sessions: ActivePatientRecovery[],
  filters: ClinicianListFilters,
  nowMs: number,
): ActivePatientRecovery[] {
  let result = sessions;
  if (filters.episodeStatus !== 'all') {
    result = result.filter((session) => session.episodeStatus === filters.episodeStatus);
  }
  if (filters.risk === 'high-risk') {
    result = result.filter((session) => riskForRecovery(session) === 'High');
  } else if (filters.risk === 'medium-risk') {
    result = result.filter((session) => riskForRecovery(session) === 'Medium');
  }

  if (filters.activity === 'active-30m') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_ACTIVE_WINDOW_MS));
  } else if (filters.activity === 'chats-today') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_TODAY_WINDOW_MS));
  } else if (filters.activity === 'this-week') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_WEEK_WINDOW_MS));
  }

  if (filters.minDaysPostOp !== null && filters.minDaysPostOp > 0) {
    result = result.filter((session) => session.daysPostOp >= filters.minDaysPostOp!);
  }

  if (filters.minDaysSinceChat !== null && filters.minDaysSinceChat > 0) {
    result = result.filter((session) => {
      const days = daysSinceLastChat(session, nowMs);
      return days === null || days >= filters.minDaysSinceChat!;
    });
  }

  return result;
}
