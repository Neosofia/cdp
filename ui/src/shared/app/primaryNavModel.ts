import {
  adminActionLabelFromPath,
  isClinicianPatientsPath,
  isDebugApiPath,
  isHomePath,
  isPatientPath,
  patientActionFromPath,
  type PatientAction,
} from '@/shared/app/appRoutes';
import type { EntitlementsMap } from '@/shared/core/appTypes';
import { uiResource } from '@/shared/core/uiCapability';

export type NavAction = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

export type NavGroup =
  | { kind: 'link'; action: NavAction }
  | {
      kind: 'dropdown';
      key: string;
      label: string;
      items: NavAction[];
      contentClassName?: string;
    };

export interface BuildPrimaryNavGroupsInput {
  entitlements: EntitlementsMap;
  showPatientMenu: boolean;
  showClinicianMenu: boolean;
  showStudyUsersMenu: boolean;
  pathname: string;
  onGoHome: () => void;
  onGoToPatient: (action: PatientAction) => void;
  onGoToClinicianPatients: () => void;
  onGoToAdminServices: () => void;
  onGoToAdminUsers: () => void;
  onGoToDebugApi: () => void;
}

export function buildPrimaryNavGroups(input: BuildPrimaryNavGroupsInput): NavGroup[] {
  const {
    entitlements,
    showPatientMenu,
    showClinicianMenu,
    showStudyUsersMenu,
    pathname,
    onGoHome,
    onGoToPatient,
    onGoToClinicianPatients,
    onGoToAdminServices,
    onGoToAdminUsers,
    onGoToDebugApi,
  } = input;

  const groups: NavGroup[] = [];
  const patientAction = patientActionFromPath(pathname);
  const adminActionLabel = adminActionLabelFromPath(pathname);

  if (entitlements[uiResource('Menu', 'debug')]) {
    groups.push({
      kind: 'dropdown',
      key: 'debug',
      label: 'Debug',
      contentClassName: 'min-w-65',
      items: [
        {
          key: 'debug-api',
          label: 'Test API endpoints',
          active: isDebugApiPath(pathname),
          onClick: onGoToDebugApi,
        },
      ],
    });
  }

  if (showStudyUsersMenu) {
    groups.push({
      kind: 'link',
      action: {
        key: 'study-users',
        label: 'Users',
        active: pathname === '/admin/users',
        onClick: onGoToAdminUsers,
      },
    });
  }

  if (entitlements[uiResource('Menu', 'operator')]) {
    groups.push({
      kind: 'dropdown',
      key: 'admin',
      label: 'Admin',
      items: [
        {
          key: 'admin-services',
          label: 'Services',
          active: adminActionLabel === 'Services',
          onClick: onGoToAdminServices,
        },
        {
          key: 'admin-users',
          label: 'Users',
          active: adminActionLabel === 'Users',
          onClick: onGoToAdminUsers,
        },
      ],
    });
  }

  if (showPatientMenu) {
    groups.push(
      {
        kind: 'link',
        action: {
          key: 'patient-dashboard',
          label: 'Dashboard',
          active: isHomePath(pathname),
          onClick: onGoHome,
        },
      },
      {
        kind: 'link',
        action: {
          key: 'patient-chat',
          label: 'Chat',
          active: isPatientPath(pathname) && patientAction === 'Chat',
          onClick: () => onGoToPatient('Chat'),
        },
      },
      {
        kind: 'link',
        action: {
          key: 'patient-profile',
          label: 'Profile',
          active: isPatientPath(pathname) && patientAction === 'Profile',
          onClick: () => onGoToPatient('Profile'),
        },
      },
    );
  }

  if (showClinicianMenu) {
    groups.push(
      {
        kind: 'link',
        action: {
          key: 'clinician-dashboard',
          label: 'Dashboard',
          active: isHomePath(pathname),
          onClick: onGoHome,
        },
      },
      {
        kind: 'link',
        action: {
          key: 'clinician-patients',
          label: 'Patients',
          active: isClinicianPatientsPath(pathname),
          onClick: onGoToClinicianPatients,
        },
      },
    );
  }

  return groups;
}

export function flattenNavGroups(groups: NavGroup[]): NavAction[] {
  return groups.flatMap((group) => (group.kind === 'link' ? [group.action] : group.items));
}
