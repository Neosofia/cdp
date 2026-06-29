import {
  clinicianPatientUuidFromPath,
  clinicianPatientsPath,
  debugApiPath,
  homePath,
  isAdminPath,
  isClinicianPatientsPath,
  isDebugApiPath,
  isPatientPath,
  patientActionFromPath,
  adminActionLabelFromPath,
} from '@/shared/app/appRoutes';
import { type ClinicianListFilters } from '@/features/clinician/lib/patientRoster';

export interface AppBreadcrumbCrumb {
  key: string;
  label: string;
  href?: string;
  onNavigate?: () => void;
  pageClassName?: string;
}

export interface BuildAppBreadcrumbTrailInput {
  pathname: string;
  clinicianListFilters: ClinicianListFilters;
  clinicianPatientDisplayCode: string | null;
  adminSectionCrumbIsLink: boolean;
  onGoHome: () => void;
  onGoToClinicianPatients: (patientUuid: string | null, filters: ClinicianListFilters) => void;
  onGoToDebugApi: () => void;
}

function formatPatientActionLabel(action: string): string {
  if (action === 'Chat') {
    return 'Chat';
  }
  if (action === 'Profile') {
    return 'Profile';
  }
  return action;
}

export function buildAppBreadcrumbTrail(input: BuildAppBreadcrumbTrailInput): AppBreadcrumbCrumb[] {
  const { pathname } = input;

  if (pathname === homePath()) {
    return [{ key: 'dashboard', label: 'Dashboard' }];
  }

  const crumbs: AppBreadcrumbCrumb[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: homePath(),
      onNavigate: input.onGoHome,
    },
  ];

  const patientAction = patientActionFromPath(pathname);
  if (isPatientPath(pathname) && patientAction) {
    crumbs.push({
      key: 'patient-action',
      label: formatPatientActionLabel(patientAction),
    });
  }

  if (isClinicianPatientsPath(pathname)) {
    const clinicianPatientUuid = clinicianPatientUuidFromPath(pathname);
    if (clinicianPatientUuid) {
      crumbs.push({
        key: 'clinician-patients',
        label: 'Patients',
        href: clinicianPatientsPath({
          patientUuid: null,
          filters: input.clinicianListFilters,
        }),
        onNavigate: () => input.onGoToClinicianPatients(null, input.clinicianListFilters),
      });
    } else {
      crumbs.push({
        key: 'clinician-patients',
        label: 'Patients',
      });
    }
  }

  if (input.clinicianPatientDisplayCode && isClinicianPatientsPath(pathname)) {
    crumbs.push({
      key: 'clinician-patient',
      label: input.clinicianPatientDisplayCode,
      pageClassName: 'font-mono',
    });
  }

  const adminActionLabel = adminActionLabelFromPath(pathname);
  if (isAdminPath(pathname) && adminActionLabel) {
    if (input.adminSectionCrumbIsLink) {
      crumbs.push({
        key: 'admin',
        label: 'Admin',
        href: homePath(),
        onNavigate: input.onGoHome,
      });
    } else {
      crumbs.push({
        key: 'admin',
        label: 'Admin',
      });
    }
    crumbs.push({
      key: 'admin-action',
      label: adminActionLabel,
    });
  }

  if (isDebugApiPath(pathname)) {
    crumbs.push({
      key: 'debug',
      label: 'Debug',
      href: debugApiPath(),
      onNavigate: input.onGoToDebugApi,
    });
    crumbs.push({
      key: 'debug-action',
      label: 'Test API endpoints',
    });
  }

  return crumbs;
}
