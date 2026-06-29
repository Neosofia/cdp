import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PATIENT_SLUG_ACTION } from '@/shared/app/appRoutes';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';

const PatientChat = lazy(() => import('@/features/patient/components/PatientChat'));
const PatientRecords = lazy(() => import('@/features/patient/components/PatientRecords'));
const PatientProfile = lazy(() => import('@/features/patient/components/PatientProfile'));

export default function PatientPage() {
  const { patientAction = '' } = useParams();
  const { session, navigation } = useAuthenticatedSession();
  const { tokenInfo, profile, activeActor } = session;

  const action = PATIENT_SLUG_ACTION[patientAction];
  if (!action || !tokenInfo || !profile) {
    return <Navigate to="/" replace />;
  }

  const patientName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || undefined;

  if (action === 'Chat') {
    return (
      <PatientChat
        token={tokenInfo.raw}
        activeActor={activeActor}
        patientName={patientName}
        patientUuid={profile.uuid}
        tenantName={profile.tenant_name}
      />
    );
  }

  if (action === 'Profile') {
    return (
      <PatientProfile
        firstName={profile.first_name}
        lastName={profile.last_name}
        email={profile.email}
        tenantName={profile.tenant_name}
        displayCode={profile.display_code}
        token={tokenInfo.raw}
        activeActor={activeActor}
        patientUuid={profile.uuid}
        onViewAllRecords={() => navigation.goToPatient('Review records')}
      />
    );
  }

  if (action === 'Review records') {
    return (
      <PatientRecords
        token={tokenInfo.raw}
        activeActor={activeActor}
        patientUuid={profile.uuid}
      />
    );
  }

  return null;
}
