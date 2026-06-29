import { lazy } from 'react';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';

const ClinicianDashboard = lazy(() => import('@/features/clinician/components/ClinicianDashboard'));
const OperatorDashboard = lazy(() => import('@/features/admin/components/OperatorDashboard'));
const PatientDashboard = lazy(() => import('@/features/patient/components/PatientDashboard'));
const StudyDashboard = lazy(() => import('@/shared/dashboard/StudyDashboard'));
const NoRoleDashboard = lazy(() => import('@/shared/dashboard/NoRoleDashboard'));

export default function DashboardPage() {
  const {
    session,
    navigation,
  } = useAuthenticatedSession();

  const { tokenInfo, profile, activeActor, demoBootstrapRunning, patientDemoSeedVersion, sessionTenantUuid } = session;
  if (!tokenInfo || !profile) {
    return null;
  }

  const role = activeActor.toLowerCase();

  if (role === 'clinician') {
    return (
      <ClinicianDashboard
        token={tokenInfo.raw}
        activeActor={activeActor}
        tenantUuid={sessionTenantUuid}
        tenantName={profile.tenant_name}
        onOpenPatients={navigation.goToClinicianPatients}
      />
    );
  }

  if (role === 'operator') {
    return (
      <OperatorDashboard
        operatorToken={tokenInfo.raw}
        activeActor={activeActor}
        onOpenUsers={navigation.goToAdminUsers}
        onOpenServices={navigation.goToAdminServices}
      />
    );
  }

  if (role === 'study') {
    return <StudyDashboard />;
  }

  if (role === 'patient') {
    return (
      <PatientDashboard
        firstName={profile.first_name}
        token={tokenInfo.raw}
        activeActor={activeActor}
        patientUuid={profile.uuid}
        demoSeedVersion={patientDemoSeedVersion}
        demoSeeding={demoBootstrapRunning}
        onGoToProfile={() => navigation.goToPatient('Profile')}
      />
    );
  }

  return <NoRoleDashboard />;
}
