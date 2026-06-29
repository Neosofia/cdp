import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  adminActionLabelFromPath,
  clinicianPatientUuidFromPath,
  dashboardTitleForActor,
  isClinicianPatientsPath,
  isDebugApiPath,
  isHomePath,
  isPatientPath,
  patientActionFromPath,
} from '@/shared/app/appRoutes';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';

interface UseAppPageMetaOptions {
  activeActor: string;
  clinicianPatient: ActivePatientRecovery | null | undefined;
}

export function useAppPageMeta({ activeActor, clinicianPatient }: UseAppPageMetaOptions) {
  const { pathname } = useLocation();

  const clinicianPatientUuid = clinicianPatientUuidFromPath(pathname);
  const patientAction = patientActionFromPath(pathname);
  const adminActionLabel = adminActionLabelFromPath(pathname);

  const isDashboard = isHomePath(pathname);
  const isClinicianPatientList = isClinicianPatientsPath(pathname) && !clinicianPatientUuid;
  const isClinicianPatientDetail =
    Boolean(clinicianPatient) && isClinicianPatientsPath(pathname) && Boolean(clinicianPatientUuid);
  const isPatientChat = isPatientPath(pathname) && patientAction === 'Chat';

  const pageTitle = useMemo(() => {
    if (clinicianPatient && isClinicianPatientsPath(pathname)) {
      return clinicianPatient.displayName;
    }
    if (patientAction) {
      return patientAction;
    }
    if (adminActionLabel) {
      return adminActionLabel;
    }
    if (isDebugApiPath(pathname)) {
      return 'Test API endpoints';
    }
    if (isDashboard) {
      return dashboardTitleForActor(activeActor);
    }
    return 'Dashboard';
  }, [activeActor, adminActionLabel, clinicianPatient, isDashboard, pathname, patientAction]);

  const pageSubtitle =
    clinicianPatient && isClinicianPatientsPath(pathname)
      ? `${clinicianPatient.displayCode} · ${clinicianPatient.surgery} · Day ${clinicianPatient.daysPostOp} post-op · Recovery ${clinicianPatient.recoveryId}`
      : null;

  const showPageHeading =
    !isClinicianPatientList && !isClinicianPatientDetail && !isDashboard && !isPatientChat;

  const adminSectionCrumbIsLink = Boolean(adminActionLabel);

  const fillViewport =
    isPatientChat || (isClinicianPatientsPath(pathname) && Boolean(clinicianPatientUuid));

  return {
    isDashboard,
    isClinicianPatientList,
    isClinicianPatientDetail,
    pageTitle,
    pageSubtitle,
    showPageHeading,
    adminSectionCrumbIsLink,
    fillViewport,
  };
}
