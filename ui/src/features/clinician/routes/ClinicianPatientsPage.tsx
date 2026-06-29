import { lazy } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { EditEnrollmentInput } from '@/features/clinician/components/ClinicianActivePatients';
import { updatePatientUser } from '@/shared/user-registry/userRegistryApi';
import { upsertCareEpisodeRecovery } from '@/shared/care-episode/careEpisodeApi';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';
import {
  clinicianPatientUuidFromPath,
  parseClinicianEpisodeUuid,
  parseClinicianListFilters,
} from '@/shared/app/appRoutes';

const ClinicianActivePatients = lazy(
  () => import('@/features/clinician/components/ClinicianActivePatients'),
);

export default function ClinicianPatientsPage() {
  const { patientUuid: routePatientUuid } = useParams();
  const { search, pathname } = useLocation();
  const {
    session,
    rosterRevision,
    bumpRoster,
    enrollInPostCare,
    navigation,
  } = useAuthenticatedSession();

  const { tokenInfo, profile, activeActor, activeSessionRole, sessionTenantUuid } = session;
  if (!tokenInfo || !profile) {
    return null;
  }

  const selectedPatientUuid =
    routePatientUuid?.trim() || clinicianPatientUuidFromPath(pathname);
  const listFilters = parseClinicianListFilters(search);
  const selectedEpisodeUuid = parseClinicianEpisodeUuid(search);

  const clinicianDisplayName =
    `${profile.first_name} ${profile.last_name}`.trim() || profile.email || undefined;

  const handleEditEnrollment = async (input: EditEnrollmentInput) => {
    const tenantUuid = input.tenant_uuid || sessionTenantUuid;
    if (!tenantUuid) {
      throw new Error('Missing tenant context for patient profile update.');
    }
    try {
      await updatePatientUser(tokenInfo.raw, activeActor, input.patient_uuid, {
        display_code: input.display_code,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`User registry: ${detail}`, { cause: err });
    }
    try {
      await upsertCareEpisodeRecovery(tokenInfo.raw, activeActor, {
        patient_uuid: input.patient_uuid,
        tenant_uuid: tenantUuid,
        surgery: input.surgery,
        procedure_date: input.procedure_date,
        recovery_id: input.recovery_id,
        risk_level: input.risk_level as 'high' | 'medium' | 'low',
        care_window_days: input.care_window_days,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Care episode: ${detail}`, { cause: err });
    }
    bumpRoster();
  };

  return (
    <ClinicianActivePatients
      token={tokenInfo.raw}
      activeActor={activeActor}
      clinicianDisplayName={clinicianDisplayName}
      clinicianRoleLabel={activeSessionRole?.label}
      clinicianUuid={profile.uuid}
      selfUuid={profile.uuid}
      rosterRevision={rosterRevision}
      selectedPatientUuid={selectedPatientUuid}
      selectedEpisodeUuid={selectedEpisodeUuid}
      listFilters={listFilters}
      onListFiltersChange={(filters) => navigation.goToClinicianPatients(null, filters)}
      onSelectPatient={(patientUuid) => navigation.goToClinicianPatients(patientUuid, listFilters)}
      tenantUuid={sessionTenantUuid}
      tenantName={profile.tenant_name}
      onEnrollInPostCare={async (input) => {
        await enrollInPostCare(input);
      }}
      onEditEnrollment={handleEditEnrollment}
      onRosterChanged={bumpRoster}
    />
  );
}
