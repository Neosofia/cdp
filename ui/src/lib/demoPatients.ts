export interface DemoPatientClinical {
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  sessionId: string;
  featured?: boolean;
}

export interface DemoPatientCatalogEntry {
  uuid: string;
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
  idp_id: string;
  clinical: DemoPatientClinical;
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

export interface ActivePatientSession {
  patientUuid: string;
  displayCode: string;
  displayName: string;
  surgery: string;
  procedureDate: string;
  daysPostOp: number;
  sessionId: string;
  /** ISO timestamp of the latest chat message, from the chat service. */
  lastChatAt: string | null;
  featured?: boolean;
}

export type ClinicianRiskFilter = 'all' | 'high-risk' | 'medium-risk';
export type ClinicianActivityFilter = 'all' | 'active-30m' | 'chats-today' | 'this-week';

export interface ClinicianListFilters {
  risk: ClinicianRiskFilter;
  activity: ClinicianActivityFilter;
}

export const DEFAULT_CLINICIAN_LIST_FILTERS: ClinicianListFilters = {
  risk: 'all',
  activity: 'all',
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

export function clearPostCareEnrollmentOverlays(): void {
  postCareEnrollmentOverlays.clear();
}

const DEFAULT_ENROLLED_CLINICAL: DemoPatientClinical = {
  surgery: 'Enrollment — clinical data pending',
  procedureDate: new Date().toISOString().slice(0, 10),
  daysPostOp: 0,
  sessionId: 'NEW',
};

function defaultClinicalForUser(user: RegistryPatientUser): DemoPatientClinical {
  const code = user.display_code?.trim() || user.uuid.slice(0, 8).toUpperCase();
  return {
    ...DEFAULT_ENROLLED_CLINICAL,
    sessionId: `S-${code}`,
  };
}

export function displayNameForUser(user: Pick<RegistryPatientUser, 'first_name' | 'last_name' | 'email'>): string {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || 'Unknown patient';
}

export function mergePatientSession(user: RegistryPatientUser): ActivePatientSession | null {
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
    sessionId: clinical.sessionId,
    lastChatAt: null,
    featured: clinical.featured,
  };
}

export function mergePatientSessions(users: RegistryPatientUser[]): ActivePatientSession[] {
  return users
    .map(mergePatientSession)
    .filter((session): session is ActivePatientSession => session !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function activePatientBySessionId(
  sessions: ActivePatientSession[],
  sessionId: string,
): ActivePatientSession | undefined {
  return sessions.find(p => p.sessionId === sessionId);
}

export function activePatientByUuid(
  sessions: ActivePatientSession[],
  patientUuid: string,
): ActivePatientSession | undefined {
  return sessions.find(p => p.patientUuid === patientUuid);
}

export function activePatientByDisplayCode(
  sessions: ActivePatientSession[],
  displayCode: string,
): ActivePatientSession | undefined {
  return sessions.find(p => p.displayCode === displayCode);
}

/** Sessions with open chats — prioritize featured then recency. */
export function featuredDashboardSessions(all: ActivePatientSession[]): ActivePatientSession[] {
  return [...all]
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) {
        return a.featured ? -1 : 1;
      }
      return parseActivityMs(b.lastChatAt) - parseActivityMs(a.lastChatAt);
    })
    .slice(0, 4);
}

export const PATIENT_UUID_BY_DISPLAY_NAME: Record<string, string> = {};

export const PATIENT_LIST_PAGE_SIZE = 10;

export function filterPatientSessions(
  sessions: ActivePatientSession[],
  query: string,
): ActivePatientSession[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return sessions;
  }
  return sessions.filter(session =>
    session.displayName.toLowerCase().includes(q)
    || session.displayCode.toLowerCase().includes(q)
    || session.surgery.toLowerCase().includes(q)
    || session.sessionId.toLowerCase().includes(q),
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

export function riskForSession(session: ActivePatientSession): 'High' | 'Medium' | 'Low' {
  if (session.featured || session.daysPostOp <= 2) return 'High';
  if (session.daysPostOp <= 5) return 'Medium';
  return 'Low';
}

function riskRank(risk: ReturnType<typeof riskForSession>): number {
  if (risk === 'High') return 0;
  if (risk === 'Medium') return 1;
  return 2;
}

/** Default roster order: highest risk first, then most recent chat. */
export function sortPatientSessionsByRiskAndRecency(
  sessions: ActivePatientSession[],
): ActivePatientSession[] {
  return [...sessions].sort((a, b) => {
    const riskDiff = riskRank(riskForSession(a)) - riskRank(riskForSession(b));
    if (riskDiff !== 0) return riskDiff;
    const activityDiff = parseActivityMs(b.lastChatAt) - parseActivityMs(a.lastChatAt);
    if (activityDiff !== 0) return activityDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function hasRecentChat(
  session: ActivePatientSession,
  nowMs: number,
  windowMs: number,
): boolean {
  const ts = parseActivityMs(session.lastChatAt);
  return ts > 0 && nowMs - ts <= windowMs;
}

export function applyClinicianListFilters(
  sessions: ActivePatientSession[],
  filters: ClinicianListFilters,
  nowMs: number,
): ActivePatientSession[] {
  let result = sessions;
  if (filters.risk === 'high-risk') {
    result = result.filter((session) => riskForSession(session) === 'High');
  } else if (filters.risk === 'medium-risk') {
    result = result.filter((session) => riskForSession(session) === 'Medium');
  }

  if (filters.activity === 'active-30m') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_ACTIVE_WINDOW_MS));
  } else if (filters.activity === 'chats-today') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_TODAY_WINDOW_MS));
  } else if (filters.activity === 'this-week') {
    result = result.filter((session) => hasRecentChat(session, nowMs, CHAT_WEEK_WINDOW_MS));
  }

  return result;
}

export function clinicianListFiltersLabel(filters: ClinicianListFilters): string {
  const parts: string[] = [];
  if (filters.risk === 'high-risk') parts.push('High risk');
  else if (filters.risk === 'medium-risk') parts.push('Medium risk');
  if (filters.activity === 'active-30m') parts.push('Active (30 min)');
  else if (filters.activity === 'chats-today') parts.push('Chats today');
  else if (filters.activity === 'this-week') parts.push('This week');
  return parts.length > 0 ? parts.join(' · ') : 'All patients';
}

export function paginatePatientSessions<T>(
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
