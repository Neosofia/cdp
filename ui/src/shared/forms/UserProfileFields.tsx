import { Input } from '@/components/ui/input';
import { useUserFormStyles } from '@/components/userFormStyles';

/** Editable user-service profile fields (operators and clinicians). */
export interface UserProfileFieldValues {
  firstName: string;
  lastName: string;
  email: string;
  displayCode: string;
}

interface Props {
  values: UserProfileFieldValues;
  onChange: (patch: Partial<UserProfileFieldValues>) => void;
  /** Clinician roster edits keep email read-only; operator directory edits allow changes. */
  emailReadOnly?: boolean;
  idPrefix?: string;
}

export default function UserProfileFields({
  values,
  onChange,
  emailReadOnly = false,
  idPrefix = 'user-profile',
}: Props) {
  const formStyles = useUserFormStyles();

  return (
    <>
      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={`${idPrefix}-first-name`}>
          First name
        </label>
        <Input
          id={`${idPrefix}-first-name`}
          className={formStyles.inputClass}
          value={values.firstName}
          onChange={(event) => onChange({ firstName: event.target.value })}
        />
      </div>
      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={`${idPrefix}-last-name`}>
          Last name
        </label>
        <Input
          id={`${idPrefix}-last-name`}
          className={formStyles.inputClass}
          value={values.lastName}
          onChange={(event) => onChange({ lastName: event.target.value })}
        />
      </div>
      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={`${idPrefix}-email`}>
          Email
        </label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          readOnly={emailReadOnly}
          className={formStyles.inputClass}
          value={values.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </div>
      <div>
        <label className={formStyles.fieldLabelClass} htmlFor={`${idPrefix}-display-code`}>
          Display code
        </label>
        <Input
          id={`${idPrefix}-display-code`}
          className={formStyles.inputClass}
          placeholder="e.g. DET-4035"
          value={values.displayCode}
          onChange={(event) => onChange({ displayCode: event.target.value })}
        />
      </div>
    </>
  );
}
