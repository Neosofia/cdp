import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminServicesPath,
  adminUsersPath,
  clinicianPatientsPath,
  debugApiPath,
  homePath,
  patientPath,
  type PatientAction,
} from '@/shared/app/appRoutes';
import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianListFilters,
} from '@/features/clinician/lib/patientRoster';

interface UseAppNavigationOptions {
  onBeforeNavigate?: () => void;
}

export function useAppNavigation(options: UseAppNavigationOptions = {}) {
  const { onBeforeNavigate } = options;
  const navigate = useNavigate();

  const goTo = useCallback(
    (path: string, mode: 'push' | 'replace' = 'push') => {
      onBeforeNavigate?.();
      navigate(path, { replace: mode === 'replace' });
    },
    [navigate, onBeforeNavigate],
  );

  const goHome = useCallback(() => {
    goTo(homePath());
  }, [goTo]);

  const goToClinicianPatients = useCallback(
    (
      patientUuid: string | null = null,
      filters: ClinicianListFilters = DEFAULT_CLINICIAN_LIST_FILTERS,
    ) => {
      goTo(
        clinicianPatientsPath({
          patientUuid,
          filters,
          episodeUuid: null,
        }),
      );
    },
    [goTo],
  );

  const goToPatient = useCallback(
    (action: PatientAction) => {
      goTo(patientPath(action));
    },
    [goTo],
  );

  const goToAdminServices = useCallback(() => {
    goTo(adminServicesPath());
  }, [goTo]);

  const goToAdminUsers = useCallback(() => {
    goTo(adminUsersPath());
  }, [goTo]);

  const goToDebugApi = useCallback(() => {
    goTo(debugApiPath());
  }, [goTo]);

  return {
    goTo,
    goHome,
    goToClinicianPatients,
    goToPatient,
    goToAdminServices,
    goToAdminUsers,
    goToDebugApi,
  };
}
