import DatePicker from '@/shared/forms/DatePicker';
import ProcedurePicker from '@/features/clinician/components/ProcedurePicker';
import { Input } from '@/components/ui/input';
import { useUserFormStyles } from '@/components/userFormStyles';
import type { ProcedureEpisodeFormValues } from '@/shared/forms/procedureEpisodeForm';

interface Props {
  token: string;
  activeActor: string;
  values: ProcedureEpisodeFormValues;
  onChange: (patch: Partial<ProcedureEpisodeFormValues>) => void;
  procedureDateId?: string;
  careWindowId?: string;
}

export default function ProcedureEpisodeFormFields({
  token,
  activeActor,
  values,
  onChange,
  procedureDateId,
  careWindowId,
}: Props) {
  const formStyles = useUserFormStyles();

  return (
    <>
      <ProcedurePicker
        token={token}
        activeActor={activeActor}
        selectedId={values.selectedProcedureId}
        onChange={(selectedProcedureId) => onChange({ selectedProcedureId })}
      />

      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={procedureDateId}>
          Procedure date
        </label>
        <DatePicker
          id={procedureDateId}
          value={values.procedureDate}
          onChange={(procedureDate) => onChange({ procedureDate })}
        />
      </div>

      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={careWindowId}>
          Care window (days)
        </label>
        <Input
          id={careWindowId}
          type="number"
          min={1}
          className={formStyles.inputClass}
          value={values.careWindowDays}
          onChange={(event) => onChange({ careWindowDays: event.target.value })}
        />
      </div>
    </>
  );
}
