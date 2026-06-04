import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_ROUTE,
  dashboardTitleForActor,
  pathForAppRoute,
  readAppRoute,
} from '@/lib/appNavigation';
import { DEFAULT_CLINICIAN_LIST_FILTERS } from '@/lib/demoPatients';

function location(pathname: string, search = ''): Location {
  return { pathname, search, hash: '' } as Location;
}

describe('dashboardTitleForActor', () => {
  it('returns role-specific home titles', () => {
    expect(dashboardTitleForActor('operator')).toBe('Platform Admin Dashboard');
    expect(dashboardTitleForActor('clinician')).toBe('Clinician Dashboard');
    expect(dashboardTitleForActor('patient')).toBe('Patient Dashboard');
    expect(dashboardTitleForActor('study')).toBe('Study Dashboard');
    expect(dashboardTitleForActor('')).toBe('Dashboard');
  });
});

describe('pathForAppRoute', () => {
  it('maps dashboard to root', () => {
    expect(pathForAppRoute(DEFAULT_APP_ROUTE)).toBe('/');
  });

  it('maps patient views', () => {
    expect(
      pathForAppRoute({
        section: 'Patient',
        action: 'Chat',
        clinicianPatientUuid: null,
        clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
      }),
    ).toBe('/patient/chat');
  });

  it('maps clinician list and patient detail with filters', () => {
    expect(
      pathForAppRoute({
        section: 'Clinician',
        action: 'Patients',
        clinicianPatientUuid: 'uuid-1',
        clinicianListFilters: { risk: 'high-risk', activity: 'chats-today' },
      }),
    ).toBe('/clinician/patients/uuid-1?risk=high-risk&activity=chats-today');
  });
});

describe('readAppRoute', () => {
  it('round-trips patient chat', () => {
    const route = readAppRoute(location('/patient/chat'));
    expect(route.section).toBe('Patient');
    expect(route.action).toBe('Chat');
  });

  it('parses clinician filters and legacy filter query', () => {
    const modern = readAppRoute(location('/clinician/patients', '?risk=high-risk'));
    expect(modern.clinicianListFilters.risk).toBe('high-risk');

    const legacy = readAppRoute(location('/clinician/patients', '?filter=high-risk'));
    expect(legacy.clinicianListFilters.risk).toBe('high-risk');
  });

  it('falls back to dashboard for unknown paths', () => {
    expect(readAppRoute(location('/unknown'))).toEqual(DEFAULT_APP_ROUTE);
  });
});
