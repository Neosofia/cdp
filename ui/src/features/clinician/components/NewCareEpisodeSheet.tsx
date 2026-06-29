import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ProcedureEpisodeFormFields from '@/shared/forms/ProcedureEpisodeFormFields';
import { useUserFormStyles } from '@/components/userFormStyles';
import { cn } from '@/shared/core/utils';
import { useProcedureCatalog } from '@/shared/procedures/useProcedureCatalog';
import {
  defaultProcedureDate,
  parseProcedureEpisodeForm,
  type ProcedureEpisodeFormValues,
} from '@/shared/forms/procedureEpisodeForm';
import { startNewCareEpisode } from '@/shared/care-episode/careEpisodeApi';
import { registerPostCareEnrollment, DEFAULT_CARE_WINDOW_DAYS, type DemoPatientClinical } from '@/features/clinician/lib/patientRoster';

export interface NewCareEpisodeInput {
  patientUuid: string;
  displayCode: string;
  displayName: string;
  tenantUuid: string;
  procedure: string;
  procedure_type: string;
  care_window_days: number;
  procedure_date: string;
  emr_procedure_ref?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientUuid: string;
  displayCode: string;
  displayName: string;
  tenantUuid: string;
  token: string;
  activeActor: string;
  onStarted: (episodeUuid: string) => void;
}

function recoveryIdForProcedure(displayCode: string, procedureDate: string): string {
  const code = displayCode.trim() || 'PATIENT';
  const compactDate = procedureDate.replace(/-/g, '');
  return `EP-${code}-${compactDate}`;
}

function daysPostOpFromDate(procedureDate: string): number {
  const procedureMs = Date.parse(`${procedureDate.trim()}T12:00:00`);
  if (!Number.isFinite(procedureMs)) {
    return 0;
  }
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((todayMs - procedureMs) / (24 * 60 * 60 * 1000)));
}

function emptyEpisodeFields(): ProcedureEpisodeFormValues {
  return {
    selectedProcedureId: null,
    procedureDate: defaultProcedureDate(),
    careWindowDays: String(DEFAULT_CARE_WINDOW_DAYS),
  };
}

export default function NewCareEpisodeSheet({
  open,
  onOpenChange,
  patientUuid,
  displayCode,
  displayName,
  tenantUuid,
  token,
  activeActor,
  onStarted,
}: Props) {
  const formStyles = useUserFormStyles();
  const { entries: catalogEntries } = useProcedureCatalog(token, activeActor);
  const [episodeFields, setEpisodeFields] = useState<ProcedureEpisodeFormValues>(emptyEpisodeFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEpisodeFields(emptyEpisodeFields());
    setError(null);
  }, [open, patientUuid]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
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

    const recoveryId = recoveryIdForProcedure(displayCode, procedureDate);
    const clinical: DemoPatientClinical = {
      surgery: procedureEntry.name,
      procedureDate,
      daysPostOp: daysPostOpFromDate(procedureDate),
      recoveryId,
      riskLevel: 'Low',
    };

    try {
      const created = await startNewCareEpisode(token, activeActor, {
        patient_uuid: patientUuid,
        tenant_uuid: tenantUuid,
        surgery: procedureEntry.name,
        procedure_date: procedureDate,
        recovery_id: recoveryId,
        risk_level: 'low',
        care_window_days: careDays,
      });

      registerPostCareEnrollment(patientUuid, clinical);
      onStarted(created.episode_uuid ?? '');
      handleClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new episode');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = Boolean(episodeFields.selectedProcedureId)
    && Boolean(episodeFields.procedureDate.trim())
    && Boolean(tenantUuid);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className={formStyles.sheetContentClass}>
        <SheetHeader className={formStyles.sheetHeaderClass}>
          <SheetTitle className={formStyles.sheetTitleClass} style={formStyles.sheetTitleStyle}>
            Start new episode
          </SheetTitle>
        </SheetHeader>
        <div className={formStyles.sheetBodyClass}>
          <p className={cn('text-xs hidden sm:block', formStyles.mutedTextClass)}>
            Open a new care episode for {displayName}. The prior discharge stays in episode
            history for review.
          </p>

          <ProcedureEpisodeFormFields
            token={token}
            activeActor={activeActor}
            values={episodeFields}
            onChange={(patch) => setEpisodeFields((current) => ({ ...current, ...patch }))}
            careWindowId="new-episode-care-window"
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
        <div className={formStyles.sheetFooterActionsClass}>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit || saving}
            className={cn(formStyles.primaryButtonClass, formStyles.sheetPrimaryActionClass)}
          >
            {saving ? 'Starting…' : 'Start episode'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
            className={cn(formStyles.sheetCancelButtonClass, formStyles.sheetPrimaryActionClass)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
