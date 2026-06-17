import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianActivityFilter,
  type ClinicianEpisodeStatusFilter,
  type ClinicianListFilters,
  type ClinicianRiskFilter,
} from '@/lib/demoPatients';

export type AppSection = '' | 'Patient' | 'Clinician' | 'Admin' | 'Debug';

export type PatientAction = 'Chat' | 'Profile' | 'Review records';

export interface AppRoute {
  section: AppSection;
  action: string | null;
  clinicianPatientUuid: string | null;
  clinicianListFilters: ClinicianListFilters;
}

const PATIENT_ACTION_SLUG: Record<PatientAction, string> = {
  Chat: 'chat',
  Profile: 'profile',
  'Review records': 'records',
};

const PATIENT_SLUG_ACTION: Record<string, PatientAction> = {
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

export const DEFAULT_APP_ROUTE: AppRoute = {
  section: '',
  action: null,
  clinicianPatientUuid: null,
  clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
};

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

type LocationListener = () => void;

const locationListeners = new Set<LocationListener>();

function notifyLocationListeners(): void {
  for (const listener of locationListeners) {
    listener();
  }
}

/** Subscribe to URL changes (push/replace/popstate and auth query cleanup). */
export function subscribeToAppLocation(listener: LocationListener): () => void {
  const onPopState = () => listener();
  locationListeners.add(listener);
  window.addEventListener('popstate', onPopState);
  return () => {
    locationListeners.delete(listener);
    window.removeEventListener('popstate', onPopState);
  };
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function parseClinicianListFilters(search: URLSearchParams): ClinicianListFilters {
  const riskParam = search.get('risk');
  const activityParam = search.get('activity');
  const episodeStatusParam = search.get('episode');
  const minDaysPostOpParam = search.get('min_days_post_op');
  const minDaysSinceChatParam = search.get('min_days_since_chat');
  const legacyParam = search.get('filter');

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

export function pathForAppRoute(route: AppRoute): string {
  if (!route.section) {
    return '/';
  }

  if (route.section === 'Patient' && route.action) {
    const slug = PATIENT_ACTION_SLUG[route.action as PatientAction];
    if (slug) {
      return `/patient/${slug}`;
    }
  }

  if (route.section === 'Clinician' && route.action === 'Patients') {
    const query = clinicianFilterQuery(route.clinicianListFilters);
    const suffix = query ? `?${query}` : '';
    if (route.clinicianPatientUuid) {
      return `/clinician/patients/${route.clinicianPatientUuid}${suffix}`;
    }
    return `/clinician/patients${suffix}`;
  }

  if (route.section === 'Admin' && route.action === 'Services') {
    return '/admin/services';
  }
  if (route.section === 'Admin' && route.action === 'Users') {
    return '/admin/users';
  }

  if (route.section === 'Debug' && route.action === 'Test API endpoints') {
    return '/debug/api';
  }

  return '/';
}

export function readAppRoute(location: Location = window.location): AppRoute {
  const segments = location.pathname.split('/').filter(Boolean);
  const search = new URLSearchParams(location.search);
  const clinicianListFilters = parseClinicianListFilters(search);

  if (segments.length === 0) {
    return { ...DEFAULT_APP_ROUTE };
  }

  if (segments[0] === 'patient' && segments[1]) {
    const action = PATIENT_SLUG_ACTION[segments[1]];
    if (action) {
      return {
        section: 'Patient',
        action,
        clinicianPatientUuid: null,
        clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
      };
    }
  }

  if (segments[0] === 'clinician' && segments[1] === 'patients') {
    const patientUuid = segments[2] ?? null;
    return {
      section: 'Clinician',
      action: 'Patients',
      clinicianPatientUuid: patientUuid,
      clinicianListFilters,
    };
  }

  if (segments[0] === 'admin' && segments[1] === 'services') {
    return {
      section: 'Admin',
      action: 'Services',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    };
  }
  if (segments[0] === 'admin' && segments[1] === 'users') {
    return {
      section: 'Admin',
      action: 'Users',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    };
  }

  if (segments[0] === 'debug' && segments[1] === 'api') {
    return {
      section: 'Debug',
      action: 'Test API endpoints',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    };
  }

  return { ...DEFAULT_APP_ROUTE };
}

export function pushAppRoute(route: AppRoute): void {
  const nextPath = pathForAppRoute(route);
  if (nextPath !== currentPath()) {
    window.history.pushState(null, '', nextPath);
    notifyLocationListeners();
  }
}

export function replaceAppRoute(route: AppRoute): void {
  const nextPath = pathForAppRoute(route);
  if (nextPath !== currentPath()) {
    window.history.replaceState(null, '', nextPath);
    notifyLocationListeners();
  }
}

/** Called when the address bar changes outside push/replace (e.g. auth callback cleanup). */
export function notifyAppLocationChanged(): void {
  notifyLocationListeners();
}
