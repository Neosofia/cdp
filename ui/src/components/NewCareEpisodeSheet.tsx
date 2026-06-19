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
import { startNewCareEpisode } from '@/lib/careEpisodeApi';
import { registerPostCareEnrollment, DEFAULT_CARE_WINDOW_DAYS, type DemoPatientClinical } from '@/lib/demoPatients';

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
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [careWindowDays, setCareWindowDays] = useState(String(DEFAULT_CARE_WINDOW_DAYS));
  const [procedureDate, setProcedureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedProcedureId(null);
    setCareWindowDays(String(DEFAULT_CARE_WINDOW_DAYS));
    setProcedureDate(new Date().toISOString().slice(0, 10));
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

    const trimmedDate = procedureDate.trim();
    const recoveryId = recoveryIdForProcedure(displayCode, trimmedDate);
    const clinical: DemoPatientClinical = {
      surgery: procedureEntry.name,
      procedureDate: trimmedDate,
      daysPostOp: daysPostOpFromDate(trimmedDate),
      recoveryId,
      riskLevel: 'Low',
    };

    try {
      const created = await startNewCareEpisode(token, activeActor, {
        patient_uuid: patientUuid,
        tenant_uuid: tenantUuid,
        surgery: procedureEntry.name,
        procedure_date: trimmedDate,
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

  const canSubmit = Boolean(selectedProcedureId) && Boolean(procedureDate.trim()) && Boolean(tenantUuid);

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

          <ProcedurePicker
            selectedId={selectedProcedureId}
            onChange={setSelectedProcedureId}
          />

          <div>
            <span className={formStyles.fieldLabelClass}>Procedure date</span>
            <SpawnDatePicker value={procedureDate} onChange={setProcedureDate} />
          </div>

          <div>
            <label className={formStyles.fieldLabelClass} htmlFor="new-episode-care-window">
              Care window (days)
            </label>
            <Input
              id="new-episode-care-window"
              type="number"
              min={1}
              className={formStyles.inputClass}
              value={careWindowDays}
              onChange={(event) => setCareWindowDays(event.target.value)}
            />
          </div>

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
