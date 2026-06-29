import UserProfileFields from '@/shared/forms/UserProfileFields';
import ProcedurePicker from '@/features/clinician/components/ProcedurePicker';
import DatePicker from '@/shared/forms/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUserFormStyles } from '@/components/userFormStyles';
import { DEFAULT_CARE_WINDOW_DAYS, type ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { cn } from '@/shared/core/utils';

export interface PatientEditFormState {
  displayCode: string;
  firstName: string;
  lastName: string;
  email: string;
  selectedProcedureId: string | null;
  procedureDate: string;
  recoveryId: string;
  careWindowDays: string;
}

interface PatientEditSheetProps {
  open: boolean;
  patient: ActivePatientRecovery | null;
  form: PatientEditFormState;
  saving: boolean;
  error: string | null;
  token: string;
  activeActor: string;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<PatientEditFormState>) => void;
  onSubmit: () => void;
}

export function emptyPatientEditForm(patient?: ActivePatientRecovery | null): PatientEditFormState {
  return {
    displayCode: patient?.displayCode ?? '',
    firstName: '',
    lastName: '',
    email: '',
    selectedProcedureId: null,
    procedureDate: patient?.procedureDate ?? new Date().toISOString().slice(0, 10),
    recoveryId: patient?.recoveryId ?? '',
    careWindowDays: String(patient?.careWindowDays ?? DEFAULT_CARE_WINDOW_DAYS),
  };
}

export default function PatientEditSheet({
  open,
  patient,
  form,
  saving,
  error,
  token,
  activeActor,
  onOpenChange,
  onChange,
  onSubmit,
}: PatientEditSheetProps) {
  const formStyles = useUserFormStyles();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={formStyles.sheetContentClass}>
        <SheetHeader className={formStyles.sheetHeaderClass}>
          <SheetTitle className={formStyles.sheetTitleClass} style={formStyles.sheetTitleStyle}>
            {patient ? (
              <span className="normal-case tracking-normal">
                <span className="block text-sm sm:text-xs sm:uppercase sm:tracking-widest">Edit patient</span>
                <span className={cn('mt-1 block font-mono text-sm sm:mt-0 sm:inline', formStyles.mutedTextClass)}>
                  <span className="sm:hidden">{form.displayCode || patient.displayCode}</span>
                  <span className="hidden sm:inline">({patient.patientUuid})</span>
                </span>
              </span>
            ) : (
              'Patient'
            )}
          </SheetTitle>
        </SheetHeader>
        <div className={formStyles.sheetBodyClass}>
          <UserProfileFields
            idPrefix="patient-edit"
            emailReadOnly
            values={{
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              displayCode: form.displayCode,
            }}
            onChange={(patch) => onChange(patch)}
          />
          <ProcedurePicker
            token={token}
            activeActor={activeActor}
            selectedId={form.selectedProcedureId}
            onChange={(selectedProcedureId) => onChange({ selectedProcedureId })}
          />
          <div>
            <label className={formStyles.fieldLabelClass}>Procedure date</label>
            <DatePicker value={form.procedureDate} onChange={(procedureDate) => onChange({ procedureDate })} />
          </div>
          <div>
            <label className={formStyles.fieldLabelClass}>Recovery ID</label>
            <Input
              value={form.recoveryId}
              onChange={(event) => onChange({ recoveryId: event.target.value })}
              className={formStyles.inputClass}
            />
          </div>
          <div>
            <label className={formStyles.fieldLabelClass} htmlFor="edit-care-window">
              Care window (days)
            </label>
            <Input
              id="edit-care-window"
              type="number"
              min={1}
              className={formStyles.inputClass}
              value={form.careWindowDays}
              onChange={(event) => onChange({ careWindowDays: event.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
        <div className={formStyles.sheetFooterActionsClass}>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onSubmit()}
            disabled={saving}
            className={cn(formStyles.primaryButtonClass, formStyles.sheetPrimaryActionClass)}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(formStyles.sheetCancelButtonClass, formStyles.sheetPrimaryActionClass)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
