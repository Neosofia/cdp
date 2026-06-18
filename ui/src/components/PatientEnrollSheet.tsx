import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProcedurePicker from '@/components/ProcedurePicker';
import SpawnDatePicker from '@/components/SpawnDatePicker';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUserFormStyles } from '@/components/userFormStyles';
import { cn } from '@/lib/utils';
import { procedureById } from '@/lib/procedureCatalog';
import type { PostCareEnrollmentInput } from '@/lib/postCareEnrollment';
import { displayNameForUser, type RegistryPatientUser } from '@/lib/demoPatients';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPatients: RegistryPatientUser[];
  tenantUuid?: string | null;
  onEnroll: (input: PostCareEnrollmentInput) => Promise<void>;
}

const EMPTY_NEW_PATIENT = {
  first_name: '',
  last_name: '',
  email: '',
  display_code: '',
};

export default function PatientEnrollSheet({
  open,
  onOpenChange,
  existingPatients,
  tenantUuid,
  onEnroll,
}: Props) {
  const formStyles = useUserFormStyles();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingPatientUuid, setExistingPatientUuid] = useState('');
  const [newPatient, setNewPatient] = useState(EMPTY_NEW_PATIENT);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [careWindowDays, setCareWindowDays] = useState('30');
  const [procedureDate, setProcedureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingPatients.length === 0) {
      setMode('new');
      setExistingPatientUuid('');
      return;
    }
    const stillValid = existingPatients.some((patient) => patient.uuid === existingPatientUuid);
    if (!stillValid) {
      setExistingPatientUuid(existingPatients[0].uuid);
    }
  }, [open, existingPatients, existingPatientUuid]);

  const reset = () => {
    setMode(existingPatients.length > 0 ? 'existing' : 'new');
    setExistingPatientUuid(existingPatients[0]?.uuid ?? '');
    setNewPatient(EMPTY_NEW_PATIENT);
    setSelectedProcedureId(null);
    setCareWindowDays('30');
    setProcedureDate(new Date().toISOString().slice(0, 10));
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

    const procedureEntry = selectedProcedureId ? procedureById(selectedProcedureId) : undefined;
    if (!procedureEntry) {
      setError('Select a procedure from the catalog.');
      setSaving(false);
      return;
    }

    const careDays = Number.parseInt(careWindowDays, 10);
    if (!Number.isFinite(careDays) || careDays <= 0) {
      setError('Care window must be a positive number of days.');
      setSaving(false);
      return;
    }

    if (!procedureDate.trim()) {
      setError('Procedure date is required.');
      setSaving(false);
      return;
    }

    const input: PostCareEnrollmentInput = {
      procedure: procedureEntry.name,
      procedure_type: procedureEntry.procedureType,
      care_window_days: careDays,
      procedure_date: procedureDate.trim(),
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

  const canSubmit = Boolean(selectedProcedureId) && Boolean(procedureDate.trim()) && (
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

          <ProcedurePicker
            selectedId={selectedProcedureId}
            onChange={setSelectedProcedureId}
          />

          <div>
            <label className={formStyles.fieldLabelClass} htmlFor="enroll-procedure-date">
              Procedure date
            </label>
            <SpawnDatePicker
              id="enroll-procedure-date"
              value={procedureDate}
              onChange={setProcedureDate}
            />
          </div>

          <div>
            <label className={formStyles.fieldLabelClass} htmlFor="enroll-care-window">
              Care window (days)
            </label>
            <Input
              id="enroll-care-window"
              type="number"
              min={1}
              className={formStyles.inputClass}
              value={careWindowDays}
              onChange={(e) => setCareWindowDays(e.target.value)}
            />
          </div>

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
