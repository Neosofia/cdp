import { useEffect, useState } from 'react';

import ClinicianPatientList from '@/features/clinician/components/ClinicianPatientList';
import ClinicianPatientSession from '@/features/clinician/components/ClinicianPatientSession';
import PatientEditSheet, {
  emptyPatientEditForm,
  type PatientEditFormState,
} from '@/features/clinician/components/PatientEditSheet';
import PatientEnrollSheet from '@/features/clinician/components/PatientEnrollSheet';
import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ActivePatientRecovery,
  type ClinicianListFilters,
} from '@/features/clinician/lib/patientRoster';
import { useClinicianPatientDetail } from '@/features/clinician/lib/useClinicianPatientDetail';
import { useEnrollableRegistryUsers } from '@/features/clinician/lib/useEnrollableRegistryUsers';
import { procedureById, procedureIdForSurgeryName } from '@/shared/procedures/procedureCatalog';
import { useProcedureCatalog } from '@/shared/procedures/useProcedureCatalog';
import type { PostCareEnrollmentInput } from '@/features/clinician/lib/postCareEnrollment';
import { fetchRegistryUser } from '@/shared/user-registry/userRegistryApi';
import { cn } from '@/shared/core/utils';

interface Props {
  token: string;
  activeActor: string;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  clinicianUuid?: string | null;
  selfUuid?: string | null;
  rosterRevision?: number;
  listFilters?: ClinicianListFilters;
  onListFiltersChange?: (filters: ClinicianListFilters) => void;
  selectedPatientUuid?: string | null;
  selectedEpisodeUuid?: string | null;
  onSelectPatient: (patientUuid: string | null) => void;
  tenantUuid?: string | null;
  tenantName?: string | null;
  onEnrollInPostCare: (input: PostCareEnrollmentInput) => Promise<void>;
  onEditEnrollment: (input: EditEnrollmentInput) => Promise<void>;
  onRosterChanged?: () => void;
}

export interface EditEnrollmentInput {
  patient_uuid: string;
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
  surgery: string;
  procedure_date: string;
  recovery_id: string;
  risk_level: string;
  tenant_uuid: string;
  care_window_days: number;
}

export default function ClinicianActivePatients({
  token,
  activeActor,
  clinicianDisplayName,
  clinicianRoleLabel,
  clinicianUuid,
  selfUuid,
  rosterRevision = 0,
  listFilters,
  onListFiltersChange,
  selectedPatientUuid,
  selectedEpisodeUuid,
  onSelectPatient,
  tenantUuid,
  tenantName,
  onEnrollInPostCare,
  onEditEnrollment,
  onRosterChanged,
}: Props) {
  const { entries: catalogEntries } = useProcedureCatalog(token, activeActor);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [editSheet, setEditSheet] = useState<{
    patient: ActivePatientRecovery;
    form: PatientEditFormState;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const {
    patient,
    loading: patientLoading,
    error: patientError,
    reload: reloadPatient,
  } = useClinicianPatientDetail(
    token,
    activeActor,
    tenantUuid,
    selectedPatientUuid,
    tenantName,
  );

  const { users: enrollableRegistryUsers, loading: enrollableLoading } = useEnrollableRegistryUsers(
    token,
    activeActor,
    tenantUuid,
    enrollOpen,
  );

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const openEditSheet = async (patientToEdit: ActivePatientRecovery) => {
    let matchedUser;
    try {
      matchedUser = await fetchRegistryUser(token, activeActor, patientToEdit.patientUuid);
    } catch {
      matchedUser = undefined;
    }
    const [fallbackFirstName = '', ...rest] = patientToEdit.displayName.trim().split(/\s+/);
    const fallbackLastName = rest.join(' ');
    setEditSheet({
      patient: patientToEdit,
      form: {
        ...emptyPatientEditForm(patientToEdit),
        firstName: (matchedUser?.first_name ?? fallbackFirstName).trim(),
        lastName: (matchedUser?.last_name ?? fallbackLastName).trim(),
        email: (matchedUser?.email ?? '').trim(),
        selectedProcedureId: procedureIdForSurgeryName(catalogEntries, patientToEdit.surgery ?? ''),
      },
    });
    setEditError(null);
  };

  const closeEditSheet = () => {
    setEditSheet(null);
    setEditError(null);
    setEditSaving(false);
  };

  const submitEdit = async () => {
    if (!editSheet) return;
    const { patient: editingPatient, form: editForm } = editSheet;
    const procedureEntry = editForm.selectedProcedureId
      ? procedureById(catalogEntries, editForm.selectedProcedureId)
      : undefined;
    if (
      !editForm.displayCode.trim()
      || !editForm.firstName.trim()
      || !editForm.lastName.trim()
      || !editForm.recoveryId.trim()
      || !editForm.procedureDate.trim()
    ) {
      setEditError('First name, last name, display code, procedure date, and recovery ID are required.');
      return;
    }
    if (!procedureEntry) {
      setEditError('Select a procedure from the catalog.');
      return;
    }
    if (!editForm.email.trim()) {
      setEditError('Patient email is required to save name updates.');
      return;
    }
    const careDays = Number.parseInt(editForm.careWindowDays, 10);
    if (!Number.isFinite(careDays) || careDays <= 0) {
      setEditError('Care window must be a positive number of days.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      let tenantUuidForSave = tenantUuid ?? '';
      try {
        const matchedUser = await fetchRegistryUser(token, activeActor, editingPatient.patientUuid);
        tenantUuidForSave = matchedUser.tenant_uuid ?? tenantUuidForSave;
      } catch {
        // keep session tenant fallback
      }
      await onEditEnrollment({
        patient_uuid: editingPatient.patientUuid,
        display_code: editForm.displayCode.trim(),
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        email: editForm.email.trim(),
        surgery: procedureEntry.name,
        procedure_date: editForm.procedureDate.trim(),
        recovery_id: editForm.recoveryId.trim(),
        risk_level: editingPatient.riskLevel.toLowerCase(),
        tenant_uuid: tenantUuidForSave,
        care_window_days: careDays,
      });
      setSaveNotice('Patient profile saved.');
      closeEditSheet();
      onRosterChanged?.();
      void reloadPatient();
    } catch (submitError) {
      setEditError(submitError instanceof Error ? submitError.message : 'Failed to save patient profile');
      setEditSaving(false);
    }
  };

  useEffect(() => {
    setRecordsOpen(false);
  }, [patient?.patientUuid]);

  const handleEnroll = async (input: PostCareEnrollmentInput) => {
    await onEnrollInPostCare(input);
    onRosterChanged?.();
  };

  return (
    <div className={cn('flex flex-col gap-3', patient && 'min-h-0 flex-1 overflow-hidden')}>
      {selectedPatientUuid ? (
        patientLoading ? (
          <p className="text-sm text-slate-400 px-1">Loading patient…</p>
        ) : patientError ? (
          <div className="rounded-xl px-4 py-3 text-sm text-red-300 flex items-center justify-between gap-3">
            <span>{patientError}</span>
            <button
              type="button"
              onClick={() => void reloadPatient()}
              className="text-xs font-semibold uppercase tracking-wide text-cyan-300 hover:text-cyan-200"
            >
              Retry
            </button>
          </div>
        ) : patient ? (
          <ClinicianPatientSession
            patient={patient}
            token={token}
            activeActor={activeActor}
            clinicianDisplayName={clinicianDisplayName}
            clinicianRoleLabel={clinicianRoleLabel}
            clinicianUuid={clinicianUuid}
            preferredEpisodeUuid={selectedEpisodeUuid}
            onEpisodeChanged={() => {
              onRosterChanged?.();
              void reloadPatient();
            }}
            saveNotice={saveNotice}
            recordsOpen={recordsOpen}
            onRecordsOpenChange={setRecordsOpen}
            onEditPatient={() => void openEditSheet(patient)}
          />
        ) : null
      ) : (
        <ClinicianPatientList
          selfUuid={selfUuid}
          listFilters={listFilters ?? DEFAULT_CLINICIAN_LIST_FILTERS}
          onListFiltersChange={onListFiltersChange ?? (() => {})}
          onSelect={onSelectPatient}
          onEdit={(row) => void openEditSheet(row)}
          onEnroll={() => setEnrollOpen(true)}
          token={token}
          activeActor={activeActor}
          tenantUuid={tenantUuid}
          tenantName={tenantName}
          rosterRevision={rosterRevision}
          onBulkClosed={onRosterChanged ?? (() => {})}
        />
      )}
      <PatientEditSheet
        open={editSheet !== null}
        patient={editSheet?.patient ?? null}
        form={editSheet?.form ?? emptyPatientEditForm()}
        saving={editSaving}
        error={editError}
        token={token}
        activeActor={activeActor}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeEditSheet();
          }
        }}
        onChange={(patch) =>
          setEditSheet((current) =>
            current ? { ...current, form: { ...current.form, ...patch } } : current,
          )
        }
        onSubmit={() => void submitEdit()}
      />
      <PatientEnrollSheet
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        existingPatients={enrollableRegistryUsers}
        existingPatientsLoading={enrollableLoading}
        tenantUuid={tenantUuid}
        token={token}
        activeActor={activeActor}
        onEnroll={handleEnroll}
      />
    </div>
  );
}
