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
import {
  USER_FIELD_LABEL_CLASS,
  USER_INPUT_CLASS,
  USER_PRIMARY_BUTTON_CLASS,
  USER_SELECT_CLASS,
  USER_SHEET_BODY_CLASS,
  USER_SHEET_CANCEL_BUTTON_CLASS,
  USER_SHEET_CONTENT_CLASS,
  USER_SHEET_HEADER_CLASS,
  USER_SHEET_TITLE_CLASS,
  USER_SHEET_TITLE_STYLE,
  USER_SHEET_TOGGLE_IDLE_CLASS,
  USER_SHEET_TOGGLE_SELECTED_CLASS,
} from '@/components/userFormStyles';
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
      input.newPatient = {
        ...newPatient,
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        email: newPatient.email.trim(),
        display_code: newPatient.display_code.trim(),
        ...(tenantUuid ? { tenant_uuid: tenantUuid } : {}),
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
        newPatient.first_name.trim()
          && newPatient.last_name.trim()
          && newPatient.email.trim()
          && newPatient.display_code.trim(),
      )
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className={USER_SHEET_CONTENT_CLASS}>
        <SheetHeader className={USER_SHEET_HEADER_CLASS}>
          <SheetTitle className={USER_SHEET_TITLE_CLASS} style={USER_SHEET_TITLE_STYLE}>
            Enroll in post-care monitoring
          </SheetTitle>
        </SheetHeader>
        <div className={USER_SHEET_BODY_CLASS}>
          <p className="text-xs text-slate-500">
            Start post-discharge monitoring for a procedure. This opens a care episode with a
            monitoring window and invite path for the patient.
          </p>

          <div>
            <span className={USER_FIELD_LABEL_CLASS}>Patient</span>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={existingPatients.length === 0}
                onClick={() => setMode('existing')}
                className={cn(
                  mode === 'existing' ? USER_SHEET_TOGGLE_SELECTED_CLASS : USER_SHEET_TOGGLE_IDLE_CLASS,
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
                  mode === 'new' ? USER_SHEET_TOGGLE_SELECTED_CLASS : USER_SHEET_TOGGLE_IDLE_CLASS,
                )}
              >
                New patient
              </Button>
            </div>
            {mode === 'existing' && existingPatients.length === 0 ? (
              <p className="text-xs text-slate-500">
                All registry patients are already on the active roster. Use New patient to enroll someone else.
              </p>
            ) : null}
            {mode === 'existing' ? (
              <select
                className={USER_SELECT_CLASS}
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
                <Input
                  className={USER_INPUT_CLASS}
                  placeholder="Display code (e.g. PAT-4821)"
                  value={newPatient.display_code}
                  onChange={(e) => setNewPatient(f => ({ ...f, display_code: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    className={USER_INPUT_CLASS}
                    placeholder="First name"
                    value={newPatient.first_name}
                    onChange={(e) => setNewPatient(f => ({ ...f, first_name: e.target.value }))}
                  />
                  <Input
                    className={USER_INPUT_CLASS}
                    placeholder="Last name"
                    value={newPatient.last_name}
                    onChange={(e) => setNewPatient(f => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
                <Input
                  type="email"
                  className={USER_INPUT_CLASS}
                  placeholder="Email for invite"
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
            <label className={USER_FIELD_LABEL_CLASS} htmlFor="enroll-procedure-date">
              Procedure date
            </label>
            <SpawnDatePicker
              id="enroll-procedure-date"
              value={procedureDate}
              onChange={setProcedureDate}
            />
          </div>

          <div>
            <label className={USER_FIELD_LABEL_CLASS} htmlFor="enroll-care-window">
              Care window (days)
            </label>
            <Input
              id="enroll-care-window"
              type="number"
              min={1}
              className={USER_INPUT_CLASS}
              value={careWindowDays}
              onChange={(e) => setCareWindowDays(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className={USER_PRIMARY_BUTTON_CLASS}
              disabled={saving || !canSubmit}
              onClick={() => void submit()}
            >
              {saving ? 'Enrolling…' : 'Start post-care monitoring'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={USER_SHEET_CANCEL_BUTTON_CLASS}
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
