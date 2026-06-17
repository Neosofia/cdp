export type PatientRiskLevel = 'High' | 'Medium' | 'Low';

export interface DemoPatientClinical {
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  recoveryId: string;
  riskLevel: PatientRiskLevel;
}

export interface RegistryPatientUser {
  uuid: string;
  tenant_uuid: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
}

export type CareEpisodeStatus = 'active' | 'closed';

/** Platform default post-discharge monitoring window (spec 015 FR-003). */
export const DEFAULT_CARE_WINDOW_DAYS = 30;

export interface ActivePatientRecovery {
  patientUuid: string;
  displayCode: string;
  displayName: string;
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  recoveryId: string;
  /** ISO timestamp of the latest chat message, from the chat service. */
  lastChatAt: string | null;
  riskLevel: PatientRiskLevel;
  /** Rolling clinical risk summary from the care-episode risk agent, when available. */
  riskSummary?: string | null;
  episodeStatus: CareEpisodeStatus;
  tenantUuid?: string | null;
  tenantName?: string | null;
  /** Post-discharge monitoring window length in days (spec 015). */
  careWindowDays: number;
}

export type ClinicianEpisodeStatusFilter = 'active' | 'closed' | 'all';

export type ClinicianRiskFilter = 'all' | 'high-risk' | 'medium-risk';
export type ClinicianActivityFilter = 'all' | 'active-30m' | 'chats-today' | 'this-week';

export interface ClinicianListFilters {
  risk: ClinicianRiskFilter;
  activity: ClinicianActivityFilter;
  episodeStatus: ClinicianEpisodeStatusFilter;
  minDaysPostOp: number | null;
  minDaysSinceChat: number | null;
}

export const DEFAULT_CLINICIAN_LIST_FILTERS: ClinicianListFilters = {
  risk: 'all',
  activity: 'all',
  episodeStatus: 'active',
  minDaysPostOp: null,
  minDaysSinceChat: null,
};

/** Live / in-session chat activity (right panel, cyan pod). */
export const CHAT_ACTIVE_WINDOW_MS = 30 * 60 * 1000;

/** Chats today pod and filtered patient list from purple stat card. */
export const CHAT_TODAY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const CHAT_WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

/** Map care-episode API risk_level (lowercase) to roster display level. */
export function riskLevelFromApi(value: string | null | undefined): PatientRiskLevel {
  const level = (value ?? 'low').trim().toLowerCase();
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  return 'Low';
}

export function mergePatientRecoveries(users: RegistryPatientUser[]): ActivePatientRecovery[] {
  return users
    .map(mergePatientRecovery)
    .filter((session): session is ActivePatientRecovery => session !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function activePatientByRecoveryId(
  sessions: ActivePatientRecovery[],
  recoveryId: string,
): ActivePatientRecovery | undefined {
  return sessions.find(p => p.recoveryId === recoveryId);
}

export function activePatientByUuid(
  sessions: ActivePatientRecovery[],
  patientUuid: string,
): ActivePatientRecovery | undefined {
  return sessions.find(p => p.patientUuid === patientUuid);
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

export const PATIENT_LIST_PAGE_SIZE = 8;

export function filterPatientRecoveries(
  sessions: ActivePatientRecovery[],
  query: string,
): ActivePatientRecovery[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return sessions;
  }
  return sessions.filter(session =>
    session.displayName.toLowerCase().includes(q)
    || session.displayCode.toLowerCase().includes(q)
    || session.surgery.toLowerCase().includes(q)
    || session.recoveryId.toLowerCase().includes(q),
  );
}

export function parseActivityMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatRelativeActivity(value: string | null | undefined, nowMs: number): string {
  const ts = parseActivityMs(value);
  if (!ts) return 'No messages yet';
  const diffMs = Math.max(0, nowMs - ts);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function riskForRecovery(session: ActivePatientRecovery): PatientRiskLevel {
  return session.riskLevel;
}

function riskRank(risk: PatientRiskLevel): number {
  if (risk === 'High') return 0;
  if (risk === 'Medium') return 1;
  return 2;
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

export function paginatePatientRecoveries<T>(
  sessions: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; totalPages: number; page: number } {
  const total = sessions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: sessions.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}
