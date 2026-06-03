import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  USER_SHEET_CONTENT_CLASS,
  USER_SHEET_HEADER_CLASS,
  USER_SHEET_TITLE_CLASS,
  USER_SHEET_TITLE_STYLE,
  USER_SHEET_TOGGLE_IDLE_CLASS,
  USER_SHEET_TOGGLE_SELECTED_CLASS,
} from '@/components/userFormStyles';
import { cn } from '@/lib/utils';
import type { PostCareEnrollmentInput } from '@/lib/postCareEnrollment';
import { displayNameForUser, type RegistryPatientUser } from '@/lib/demoPatients';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPatients: RegistryPatientUser[];
  tenantUuid?: string | null;
  onEnroll: (input: PostCareEnrollmentInput) => Promise<void>;
}

const PROCEDURE_TYPES = [
  { value: 'general-surgery', label: 'General surgery' },
  { value: 'orthopedic', label: 'Orthopedic' },
  { value: 'cardiac', label: 'Cardiac' },
  { value: 'other', label: 'Other' },
];

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
  const [procedure, setProcedure] = useState('');
  const [procedureType, setProcedureType] = useState(PROCEDURE_TYPES[0].value);
  const [careWindowDays, setCareWindowDays] = useState('30');
  const [emrProcedureRef, setEmrProcedureRef] = useState('');
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
    setProcedure('');
    setProcedureType(PROCEDURE_TYPES[0].value);
    setCareWindowDays('30');
    setEmrProcedureRef('');
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

    const careDays = Number.parseInt(careWindowDays, 10);
    if (!Number.isFinite(careDays) || careDays <= 0) {
      setError('Care window must be a positive number of days.');
      setSaving(false);
      return;
    }

    const input: PostCareEnrollmentInput = {
      procedure: procedure.trim(),
      procedure_type: procedureType,
      care_window_days: careDays,
      emr_procedure_ref: emrProcedureRef.trim() || undefined,
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
      input.existingPatientUuid = existingPatientUuid;
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

  const canSubmit = procedure.trim() && (
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
            monitoring window and invite path for the patient — one action, not separate
            provisioning steps.
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

          <div>
            <label className={USER_FIELD_LABEL_CLASS} htmlFor="enroll-procedure">
              Procedure
            </label>
            <Input
              id="enroll-procedure"
              className={USER_INPUT_CLASS}
              placeholder="e.g. Laparoscopic cholecystectomy"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
            />
          </div>
          <div>
            <label className={USER_FIELD_LABEL_CLASS} htmlFor="enroll-procedure-type">
              Procedure type
            </label>
            <select
              id="enroll-procedure-type"
              className={USER_SELECT_CLASS}
              value={procedureType}
              onChange={(e) => setProcedureType(e.target.value)}
            >
              {PROCEDURE_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <div>
            <label className={USER_FIELD_LABEL_CLASS} htmlFor="enroll-emr-ref">
              EMR procedure reference (optional)
            </label>
            <Input
              id="enroll-emr-ref"
              className={USER_INPUT_CLASS}
              placeholder="e.g. PROC-2026-0142"
              value={emrProcedureRef}
              onChange={(e) => setEmrProcedureRef(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className={USER_PRIMARY_BUTTON_CLASS}
              disabled={saving || !canSubmit}
              onClick={() => void submit()}
            >
              {saving ? 'Enrolling…' : 'Start post-care monitoring'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={USER_SHEET_TOGGLE_IDLE_CLASS}
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
