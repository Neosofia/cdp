import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ProcedureEpisodeFormFields from '@/shared/forms/ProcedureEpisodeFormFields';
import { useUserFormStyles } from '@/components/userFormStyles';
import { cn } from '@/shared/core/utils';
import type { PostCareEnrollmentInput } from '@/features/clinician/lib/postCareEnrollment';
import {
  defaultProcedureDate,
  parseProcedureEpisodeForm,
  type ProcedureEpisodeFormValues,
} from '@/shared/forms/procedureEpisodeForm';
import { useProcedureCatalog } from '@/shared/procedures/useProcedureCatalog';
import { displayNameForUser, type RegistryPatientUser } from '@/features/clinician/lib/patientRoster';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPatients: RegistryPatientUser[];
  existingPatientsLoading?: boolean;
  tenantUuid?: string | null;
  token: string;
  activeActor: string;
  onEnroll: (input: PostCareEnrollmentInput) => Promise<void>;
}

const EMPTY_NEW_PATIENT = {
  first_name: '',
  last_name: '',
  email: '',
  display_code: '',
};

function emptyEpisodeFields(): ProcedureEpisodeFormValues {
  return {
    selectedProcedureId: null,
    procedureDate: defaultProcedureDate(),
    careWindowDays: '30',
  };
}

export default function PatientEnrollSheet({
  open,
  onOpenChange,
  existingPatients,
  existingPatientsLoading = false,
  tenantUuid,
  token,
  activeActor,
  onEnroll,
}: Props) {
  const formStyles = useUserFormStyles();
  const { entries: catalogEntries } = useProcedureCatalog(token, activeActor);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingPatientUuid, setExistingPatientUuid] = useState('');
  const [newPatient, setNewPatient] = useState(EMPTY_NEW_PATIENT);
  const [episodeFields, setEpisodeFields] = useState<ProcedureEpisodeFormValues>(emptyEpisodeFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || existingPatientsLoading) return;
    if (existingPatients.length === 0) {
      setMode('new');
      setExistingPatientUuid('');
      return;
    }
    const stillValid = existingPatients.some((patient) => patient.uuid === existingPatientUuid);
    if (!stillValid) {
      setExistingPatientUuid(existingPatients[0].uuid);
    }
  }, [open, existingPatients, existingPatientUuid, existingPatientsLoading]);

  const reset = () => {
    setMode(existingPatients.length > 0 ? 'existing' : 'new');
    setExistingPatientUuid(existingPatients[0]?.uuid ?? '');
    setNewPatient(EMPTY_NEW_PATIENT);
    setEpisodeFields(emptyEpisodeFields());
    setError(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);

    const parsed = parseProcedureEpisodeForm(catalogEntries, episodeFields);
    if ('error' in parsed) {
      setError(parsed.error);
      setSaving(false);
      return;
    }
    const { procedureEntry, careDays, procedureDate } = parsed;

    const input: PostCareEnrollmentInput = {
      procedure: procedureEntry.name,
      procedure_type: procedureEntry.procedureType,
      care_window_days: careDays,
      procedure_date: procedureDate,
      emr_procedure_ref: procedureEntry.emrRef,
      ...(tenantUuid ? { tenant_uuid: tenantUuid } : {}),
    };

    if (mode === 'new') {
      if (!tenantUuid) {
        setError('Tenant context is required to enroll a new patient.');
        setSaving(false);
        return;
      }
      input.newPatient = {
        ...newPatient,
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        email: newPatient.email.trim(),
        display_code: newPatient.display_code.trim(),
        tenant_uuid: tenantUuid,
        roles: ['patient.self'],
      };
    } else {
      const selected = existingPatients.find((patient) => patient.uuid === existingPatientUuid);
      input.existingPatientUuid = existingPatientUuid;
      if (selected) {
        input.existingPatientProfile = {
          display_code: selected.display_code,
          first_name: selected.first_name,
          last_name: selected.last_name,
          tenant_uuid: selected.tenant_uuid,
        };
      }
    }

    try {
      await onEnroll(input);
      handleClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = Boolean(episodeFields.selectedProcedureId)
    && Boolean(episodeFields.procedureDate.trim()) && (
    mode === 'existing'
      ? Boolean(existingPatientUuid)
      : Boolean(
        tenantUuid
          && newPatient.first_name.trim()
          && newPatient.last_name.trim()
          && newPatient.email.trim()
          && newPatient.display_code.trim(),
      )
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className={formStyles.sheetContentClass}>
        <SheetHeader className={cn('min-w-0', formStyles.sheetHeaderClass)}>
          <SheetTitle className={cn('min-w-0', formStyles.sheetTitleClass)} style={formStyles.sheetTitleStyle}>
            Enroll in post-care monitoring
          </SheetTitle>
        </SheetHeader>
        <div className={cn('min-w-0', formStyles.sheetBodyClass)}>
          <p className={cn('text-xs hidden sm:block', formStyles.mutedTextClass)}>
            Enroll a patient in post-discharge monitoring for a procedure. This creates their
            platform account (when new) and opens the first care episode with a monitoring window.
          </p>

          <div>
            <span className={formStyles.fieldLabelClass}>Patient</span>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={existingPatients.length === 0}
                onClick={() => setMode('existing')}
                className={cn(
                  'w-full',
                  mode === 'existing' ? formStyles.sheetToggleSelectedClass : formStyles.sheetToggleIdleClass,
                )}
              >
                Existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode('new')}
                className={cn(
                  'w-full',
                  mode === 'new' ? formStyles.sheetToggleSelectedClass : formStyles.sheetToggleIdleClass,
                )}
              >
                New patient
              </Button>
            </div>
            {mode === 'existing' && existingPatients.length === 0 ? (
              <p className={cn('text-xs', formStyles.mutedTextClass)}>
                All registry patients are already on the active roster. Use New patient to enroll someone else.
              </p>
            ) : null}
            {mode === 'existing' ? (
              <select
                className={formStyles.selectClass}
                value={existingPatientUuid}
                onChange={(e) => setExistingPatientUuid(e.target.value)}
              >
                {existingPatients.map(patient => (
                  <option key={patient.uuid} value={patient.uuid}>
                    {displayNameForUser(patient)}
                    {patient.display_code ? ` · ${patient.display_code}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input type="hidden" name="tenant_uuid" value={tenantUuid ?? ''} readOnly />
                <input type="hidden" name="roles" value="patient.self" readOnly />
                <Input
                  className={formStyles.inputClass}
                  placeholder="Display code (e.g. PAT-4821)"
                  value={newPatient.display_code}
                  onChange={(e) => setNewPatient(f => ({ ...f, display_code: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    className={formStyles.inputClass}
                    placeholder="First name"
                    value={newPatient.first_name}
                    onChange={(e) => setNewPatient(f => ({ ...f, first_name: e.target.value }))}
                  />
                  <Input
                    className={formStyles.inputClass}
                    placeholder="Last name"
                    value={newPatient.last_name}
                    onChange={(e) => setNewPatient(f => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
                <Input
                  type="email"
                  className={formStyles.inputClass}
                  placeholder="Email address"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            )}
          </div>

          <ProcedureEpisodeFormFields
            token={token}
            activeActor={activeActor}
            values={episodeFields}
            onChange={(patch) => setEpisodeFields((current) => ({ ...current, ...patch }))}
            procedureDateId="enroll-procedure-date"
            careWindowId="enroll-care-window"
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
        <div className={formStyles.sheetFooterActionsClass}>
          <Button
            type="button"
            variant="outline"
            className={cn(formStyles.primaryButtonClass, formStyles.sheetPrimaryActionClass)}
            disabled={saving || !canSubmit}
            onClick={() => void submit()}
          >
            {saving ? 'Enrolling…' : 'Start post-care monitoring'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(formStyles.sheetCancelButtonClass, formStyles.sheetPrimaryActionClass)}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
