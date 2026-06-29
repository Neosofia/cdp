import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianActivityFilter,
  type ClinicianEpisodeStatusFilter,
  type ClinicianListFilters,
  type ClinicianRiskFilter,
} from '@/features/clinician/lib/patientRoster';

export const HOME_PATH = '/';
export const DEBUG_API_PATH = '/debug/api';
export const ADMIN_SERVICES_PATH = '/admin/services';
export const ADMIN_USERS_PATH = '/admin/users';
export const CLINICIAN_PATIENTS_PATH = '/clinician/patients';

export type PatientAction = 'Chat' | 'Profile' | 'Review records';

const PATIENT_ACTION_SLUG: Record<PatientAction, string> = {
  Chat: 'chat',
  Profile: 'profile',
  'Review records': 'records',
};

export const PATIENT_SLUG_ACTION: Record<string, PatientAction> = {
  chat: 'Chat',
  profile: 'Profile',
  records: 'Review records',
};

const RISK_FILTERS = new Set<ClinicianRiskFilter>(['all', 'high-risk', 'medium-risk']);
const ACTIVITY_FILTERS = new Set<ClinicianActivityFilter>(['all', 'active-30m', 'chats-today', 'this-week']);
const EPISODE_STATUS_FILTERS = new Set<ClinicianEpisodeStatusFilter>(['active', 'closed', 'all']);

/** Legacy single `filter` query values from dashboard deep links. */
const LEGACY_FILTER_MAP: Record<string, ClinicianListFilters> = {
  'high-risk': { ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'high-risk' },
  'pending-reviews': { ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'medium-risk' },
  'active-sessions': { ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'chats-today' },
  'active-patients': { ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'active-30m' },
};

export interface ClinicianPatientsPathOptions {
  patientUuid?: string | null;
  filters?: ClinicianListFilters;
  episodeUuid?: string | null;
}

export function homePath(): string {
  return HOME_PATH;
}

export function patientPath(action: PatientAction): string {
  return `/patient/${PATIENT_ACTION_SLUG[action]}`;
}

export function adminServicesPath(): string {
  return ADMIN_SERVICES_PATH;
}

export function adminUsersPath(): string {
  return ADMIN_USERS_PATH;
}

export function debugApiPath(): string {
  return DEBUG_API_PATH;
}

export function parseClinicianListFilters(search: URLSearchParams | string): ClinicianListFilters {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const riskParam = params.get('risk');
  const activityParam = params.get('activity');
  const episodeStatusParam = params.get('episode');
  const minDaysPostOpParam = params.get('min_days_post_op');
  const minDaysSinceChatParam = params.get('min_days_since_chat');
  const legacyParam = params.get('filter');

  if (legacyParam && LEGACY_FILTER_MAP[legacyParam] && !riskParam && !activityParam) {
    return LEGACY_FILTER_MAP[legacyParam];
  }

  const minDaysPostOp = minDaysPostOpParam ? Number.parseInt(minDaysPostOpParam, 10) : null;
  const minDaysSinceChat = minDaysSinceChatParam ? Number.parseInt(minDaysSinceChatParam, 10) : null;

  return {
    risk: RISK_FILTERS.has(riskParam as ClinicianRiskFilter)
      ? (riskParam as ClinicianRiskFilter)
      : DEFAULT_CLINICIAN_LIST_FILTERS.risk,
    activity: ACTIVITY_FILTERS.has(activityParam as ClinicianActivityFilter)
      ? (activityParam as ClinicianActivityFilter)
      : DEFAULT_CLINICIAN_LIST_FILTERS.activity,
    episodeStatus: EPISODE_STATUS_FILTERS.has(episodeStatusParam as ClinicianEpisodeStatusFilter)
      ? (episodeStatusParam as ClinicianEpisodeStatusFilter)
      : DEFAULT_CLINICIAN_LIST_FILTERS.episodeStatus,
    minDaysPostOp: Number.isFinite(minDaysPostOp) && minDaysPostOp! > 0 ? minDaysPostOp : null,
    minDaysSinceChat: Number.isFinite(minDaysSinceChat) && minDaysSinceChat! > 0 ? minDaysSinceChat : null,
  };
}

function clinicianFilterQuery(filters: ClinicianListFilters): string {
  const params = new URLSearchParams();
  if (filters.risk !== 'all') {
    params.set('risk', filters.risk);
  }
  if (filters.activity !== 'all') {
    params.set('activity', filters.activity);
  }
  if (filters.episodeStatus !== DEFAULT_CLINICIAN_LIST_FILTERS.episodeStatus) {
    params.set('episode', filters.episodeStatus);
  }
  if (filters.minDaysPostOp !== null) {
    params.set('min_days_post_op', String(filters.minDaysPostOp));
  }
  if (filters.minDaysSinceChat !== null) {
    params.set('min_days_since_chat', String(filters.minDaysSinceChat));
  }
  return params.toString();
}

export function clinicianPatientsPath(options: ClinicianPatientsPathOptions = {}): string {
  const filters = options.filters ?? DEFAULT_CLINICIAN_LIST_FILTERS;
  const params = new URLSearchParams();
  const filterQuery = clinicianFilterQuery(filters);
  if (filterQuery) {
    for (const [key, value] of new URLSearchParams(filterQuery)) {
      params.set(key, value);
    }
  }
  const episodeUuid = options.episodeUuid?.trim();
  if (episodeUuid) {
    params.set('episode_uuid', episodeUuid);
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  const patientUuid = options.patientUuid?.trim();
  if (patientUuid) {
    return `${CLINICIAN_PATIENTS_PATH}/${patientUuid}${suffix}`;
  }
  return `${CLINICIAN_PATIENTS_PATH}${suffix}`;
}

export function parseClinicianEpisodeUuid(search: URLSearchParams | string): string | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get('episode_uuid')?.trim() || null;
}

export function isHomePath(pathname: string): boolean {
  return pathname === HOME_PATH;
}

export function isPatientPath(pathname: string): boolean {
  return pathname.startsWith('/patient/');
}

export function patientActionFromPath(pathname: string): PatientAction | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'patient' || !segments[1]) {
    return null;
  }
  return PATIENT_SLUG_ACTION[segments[1]] ?? null;
}

export function isClinicianPatientsPath(pathname: string): boolean {
  return pathname === CLINICIAN_PATIENTS_PATH || pathname.startsWith(`${CLINICIAN_PATIENTS_PATH}/`);
}

export function clinicianPatientUuidFromPath(pathname: string): string | null {
  const prefix = `${CLINICIAN_PATIENTS_PATH}/`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const remainder = pathname.slice(prefix.length);
  const patientUuid = remainder.split('/')[0]?.trim();
  return patientUuid || null;
}

export function isAdminServicesPath(pathname: string): boolean {
  return pathname === ADMIN_SERVICES_PATH;
}

export function isAdminUsersPath(pathname: string): boolean {
  return pathname === ADMIN_USERS_PATH;
}

export function isAdminPath(pathname: string): boolean {
  return isAdminServicesPath(pathname) || isAdminUsersPath(pathname);
}

export function adminActionLabelFromPath(pathname: string): string | null {
  if (isAdminServicesPath(pathname)) {
    return 'Services';
  }
  if (isAdminUsersPath(pathname)) {
    return 'Users';
  }
  return null;
}

export function isDebugApiPath(pathname: string): boolean {
  return pathname === DEBUG_API_PATH;
}

/** Home-route H1 titles; breadcrumb stays "Dashboard". */
export function dashboardTitleForActor(actor: string): string {
  switch (actor.trim().toLowerCase()) {
    case 'operator':
      return 'Platform Admin Dashboard';
    case 'clinician':
      return 'Clinician Dashboard';
    case 'patient':
      return 'Patient Dashboard';
    case 'study':
      return 'Study Dashboard';
    default:
      return 'Dashboard';
  }
}

/** Notify React Router after a manual history.replaceState (e.g. auth callback cleanup). */
export function notifyRouterLocationChanged(): void {
  window.dispatchEvent(new PopStateEvent('popstate'));
}
