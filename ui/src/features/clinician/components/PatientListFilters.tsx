import { useEffect, useState } from 'react';

import FilterDropdown from '@/shared/filters/FilterDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  ACTIVITY_FILTER_OPTIONS,
  countActiveListFilters,
  EPISODE_STATUS_FILTER_OPTIONS,
  RISK_FILTER_OPTIONS,
} from '@/features/clinician/lib/clinicianListFilters';
import { DEFAULT_CLINICIAN_LIST_FILTERS, type ClinicianListFilters } from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

interface PatientListFiltersProps {
  filters: ClinicianListFilters;
  onChange: (filters: ClinicianListFilters) => void;
}

export default function PatientListFilters({ filters, onChange }: PatientListFiltersProps) {
  const pv = usePatientViewStyles();
  const activeFilterCount = countActiveListFilters(filters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      setDraftFilters(filters);
    }
  }, [filters, mobileFiltersOpen]);

  const filterFields = (
    fullWidth: boolean,
    current: ClinicianListFilters,
    onUpdate: (next: ClinicianListFilters) => void,
  ) => (
    <>
      <FilterDropdown
        label="Episode"
        value={current.episodeStatus}
        options={EPISODE_STATUS_FILTER_OPTIONS}
        onSelect={(episodeStatus) => onUpdate({ ...current, episodeStatus })}
        fullWidth={fullWidth}
      />
      <FilterDropdown
        label="Risk"
        value={current.risk}
        options={RISK_FILTER_OPTIONS}
        onSelect={(risk) => onUpdate({ ...current, risk })}
        fullWidth={fullWidth}
      />
      <FilterDropdown
        label="Chat"
        value={current.activity}
        options={ACTIVITY_FILTER_OPTIONS}
        onSelect={(activity) => onUpdate({ ...current, activity })}
        fullWidth={fullWidth}
      />
      <label className={cn('flex items-center gap-1.5 text-xs md:w-auto w-full justify-between', pv.subText)}>
        <span className="whitespace-nowrap">Min days post-op</span>
        <Input
          type="number"
          min={0}
          value={current.minDaysPostOp ?? ''}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            onUpdate({
              ...current,
              minDaysPostOp: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            });
          }}
          className={cn('h-8 w-20 px-2', pv.inputClass)}
        />
      </label>
      <label className={cn('flex items-center gap-1.5 text-xs md:w-auto w-full justify-between', pv.subText)}>
        <span className="whitespace-nowrap">Min days since chat</span>
        <Input
          type="number"
          min={0}
          value={current.minDaysSinceChat ?? ''}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            onUpdate({
              ...current,
              minDaysSinceChat: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            });
          }}
          className={cn('h-8 w-20 px-2', pv.inputClass)}
        />
      </label>
    </>
  );

  const handleMobileOpenChange = (open: boolean) => {
    if (open) {
      setDraftFilters(filters);
      setMobileFiltersOpen(true);
      return;
    }
    setMobileFiltersOpen(false);
  };

  const applyMobileFilters = () => {
    onChange(draftFilters);
    setMobileFiltersOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 md:contents">
      <div className="hidden md:flex shrink-0 items-center justify-end gap-2 overflow-x-auto">
        {filterFields(false, filters, onChange)}
      </div>
      <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileOpenChange}>
        <SheetTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('md:hidden w-full', pv.outlineButton)}
            aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className={cn(
            'inset-x-0 flex max-h-[85vh] w-full max-w-[100dvw] flex-col overflow-hidden rounded-t-2xl border-x-0 px-4 pb-6 pt-2 !opacity-100',
            pv.isCorporate ? '!bg-white' : '!bg-[#05050f]',
          )}
        >
          <SheetHeader className="shrink-0">
            <SheetTitle className={cn('text-left', pv.titleClass)} style={pv.titleStyle}>
              Patient filters
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {filterFields(true, draftFilters, setDraftFilters)}
          </div>
          <div
            className={cn(
              'mt-4 flex shrink-0 flex-col gap-2 border-t pt-4',
              pv.isCorporate ? 'border-slate-200' : 'border-slate-700/60',
            )}
          >
            <Button
              type="button"
              className={cn('w-full', pv.sendButtonClass)}
              style={pv.sendButtonStyle}
              onClick={applyMobileFilters}
            >
              Apply filters
            </Button>
            {countActiveListFilters(draftFilters) > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={cn('w-full', pv.outlineButton)}
                onClick={() => setDraftFilters(DEFAULT_CLINICIAN_LIST_FILTERS)}
              >
                Reset filters
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
