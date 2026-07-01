import { useEffect, useMemo, useState } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  SignalIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import PatientListFilters from '@/features/clinician/components/PatientListFilters';
import {
  PATIENT_ROW_GRID_COLS,
  PATIENT_ROW_GRID_NO_SELECT_COLS,
  patientListEmptyMessage,
} from '@/features/clinician/lib/clinicianListFilters';
import RiskSummaryHint from '@/features/clinician/components/RiskSummaryHint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import RemoteListPagination from '@/shared/pagination/RemoteListPagination';
import { bulkCloseCareEpisodeRecoveries } from '@/shared/care-episode/careEpisodeApi';
import { formatRelativeActivity } from '@/shared/core/formatRelativeActivity';
import { useClinicianPatientRoster } from '@/features/clinician/lib/useClinicianPatientRoster';
import {
  riskForRecovery,
  type ClinicianListFilters,
} from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';
import { toUserFacingError } from '@/shared/core/userFacingError';

export default function ClinicianPatientList({
  selfUuid,
  listFilters,
  onListFiltersChange,
  onSelect,
  onEdit,
  onEnroll,
  token,
  activeActor,
  tenantUuid,
  tenantName,
  rosterRevision = 0,
  onBulkClosed,
}: {
  selfUuid?: string | null;
  listFilters: ClinicianListFilters;
  onListFiltersChange: (filters: ClinicianListFilters) => void;
  onSelect: (uuid: string) => void;
  onEdit: (patient: import('@/features/clinician/lib/patientRoster').ActivePatientRecovery) => void;
  onEnroll: () => void;
  token: string;
  activeActor: string;
  tenantUuid: string | null | undefined;
  tenantName?: string | null;
  rosterRevision?: number;
  onBulkClosed: () => void;
}) {
  const pv = usePatientViewStyles();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [bulkClosing, setBulkClosing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const {
    items: pagePatients,
    total,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    loading,
    error,
    search,
    setSearch,
    reload,
  } = useClinicianPatientRoster({
    token,
    activeActor,
    tenantUuid,
    tenantName,
    listFilters,
    rosterRevision,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedUuids(new Set());
  }, [listFilters, setPage]);

  useEffect(() => {
    setSelectedUuids(new Set());
  }, [page, search]);

  const selectablePatients = useMemo(
    () => pagePatients.filter((patient) => patient.episodeStatus === 'active'),
    [pagePatients],
  );

  const allVisibleSelected = selectablePatients.length > 0
    && selectablePatients.every((patient) => selectedUuids.has(patient.patientUuid));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedUuids(new Set());
      return;
    }
    setSelectedUuids(new Set(selectablePatients.map((patient) => patient.patientUuid)));
  };

  const togglePatientSelected = (patientUuid: string) => {
    setSelectedUuids((previous) => {
      const next = new Set(previous);
      if (next.has(patientUuid)) {
        next.delete(patientUuid);
      } else {
        next.add(patientUuid);
      }
      return next;
    });
  };

  const closeSelectedEpisodes = async () => {
    if (selectedUuids.size === 0) return;
    setBulkClosing(true);
    setBulkError(null);
    try {
      await bulkCloseCareEpisodeRecoveries(
        token,
        activeActor,
        [...selectedUuids],
      );
      setSelectedUuids(new Set());
      setBulkMode(false);
      onBulkClosed();
      void reload();
    } catch (closeError) {
      setBulkError(toUserFacingError(closeError, 'Failed to close episodes'));
    } finally {
      setBulkClosing(false);
    }
  };

  return (
    <Card
      className={cn('gap-0 py-0 flex flex-col overflow-hidden', pv.cardClass)}
      {...(pv.cardStyle ? { style: pv.cardStyle } : {})}
    >
      <CardHeader className={cn('py-3 md:py-4 shrink-0 px-3 md:px-6', pv.headerClass)} style={pv.headerStyle}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle
            className={cn('text-base md:text-lg font-semibold shrink-0', pv.titleClass)}
            style={pv.titleStyle}
          >
            Patients
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {bulkMode ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkClosing || selectedUuids.size === 0}
                onClick={() => void closeSelectedEpisodes()}
                className={cn(pv.outlineButton, 'sm:hidden')}
              >
                Close ({selectedUuids.size})
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={bulkMode ? 'default' : 'outline'}
              onClick={() => {
                setBulkMode((value) => !value);
                setSelectedUuids(new Set());
                setBulkError(null);
              }}
              className={bulkMode ? undefined : pv.outlineButton}
              aria-label={bulkMode ? 'Done managing patients' : 'Manage patients'}
            >
              {bulkMode ? 'Done' : 'Manage'}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onEnroll}
              className={cn(pv.outlineButton, 'sm:hidden')}
              aria-label="Enroll patient"
            >
              <UserPlusIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEnroll}
              className={cn(pv.outlineButton, 'hidden sm:inline-flex')}
            >
              <UserPlusIcon className="h-4 w-4 mr-1.5" />
              Enroll
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex flex-col">
        <div
          className={cn('px-3 md:px-6 py-3 border-b shrink-0 flex flex-col gap-3', pv.isCorporate ? 'border-slate-200' : '')}
          style={pv.isCorporate ? undefined : { borderColor: 'rgba(34,211,238,0.08)' }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center min-w-0">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className={cn('absolute left-3 top-1/2 -translate-y-1/2 size-4', pv.mutedText)} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className={cn('h-9 w-full pl-9', pv.inputClass)}
              />
            </div>
            <PatientListFilters filters={listFilters} onChange={onListFiltersChange} />
          </div>
          {bulkError ? <p className="text-xs text-red-400">{bulkError}</p> : null}
          {bulkMode && selectablePatients.length > 0 ? (
            <label className={cn('flex items-center gap-2 text-xs', pv.subText)}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="size-4 rounded border-slate-500"
              />
              Select all {selectablePatients.length} open episode{selectablePatients.length === 1 ? '' : 's'} matching filters
            </label>
          ) : null}
        </div>
        {error ? (
          <div
            className={cn('px-3 md:px-6 py-3 text-xs text-amber-400/90 border-b shrink-0 flex items-center justify-between gap-3', pv.isCorporate ? 'border-slate-200 text-amber-800' : '')}
            style={pv.isCorporate ? undefined : { borderColor: 'rgba(34,211,238,0.08)' }}
          >
            <span>Could not load patients. {error}</span>
            <button
              type="button"
              onClick={() => void reload()}
              className={cn('font-semibold uppercase tracking-wide', pv.isCorporate ? 'text-slate-700 hover:text-slate-900' : 'text-cyan-300 hover:text-cyan-200')}
            >
              Retry
            </button>
          </div>
        ) : null}
        {loading ? (
          <p className={cn('px-3 md:px-6 py-4 text-sm', pv.subText)}>Loading patients…</p>
        ) : null}
        {!loading && total === 0 ? (
          <p className={cn('px-3 md:px-6 py-4 text-sm', pv.subText)}>
            {patientListEmptyMessage(total, search, listFilters)}
          </p>
        ) : null}
        <ul
          className={cn(
            'divide-y',
            pv.isCorporate ? 'divide-slate-200' : '',
          )}
          style={pv.isCorporate ? undefined : { borderColor: 'rgba(34,211,238,0.08)' }}
        >
          {pagePatients.map((p) => (
            <li key={p.patientUuid}>
              <div
                className={cn(
                  'md:hidden px-3 py-3 transition-colors',
                  pv.rowHover,
                )}
              >
                <div className="flex items-start gap-2">
                  {bulkMode ? (
                    <input
                      type="checkbox"
                      checked={selectedUuids.has(p.patientUuid)}
                      disabled={p.episodeStatus !== 'active'}
                      onChange={() => togglePatientSelected(p.patientUuid)}
                      aria-label={`Select ${p.displayName}`}
                      className="mt-1 size-4 shrink-0 rounded border-slate-500"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect(p.patientUuid)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className={cn('font-semibold text-sm flex flex-wrap items-center gap-1.5 min-w-0', pv.bodyText)}>
                      <span className="truncate">{p.displayName}</span>
                      {p.episodeStatus === 'closed' ? (
                        <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                          Closed
                        </Badge>
                      ) : null}
                      {selfUuid && p.patientUuid === selfUuid ? (
                        <Badge variant="outline" className="text-[10px] font-semibold shrink-0" style={pv.demoBadgeStyle}>
                          Self (demo)
                        </Badge>
                      ) : null}
                    </div>
                    <div className={cn('font-mono text-xs mt-0.5', pv.isCorporate ? 'text-slate-600' : 'text-cyan-300')}>
                      {p.displayCode}
                    </div>
                    <div className={cn('text-sm mt-0.5', pv.mutedText)}>{p.surgery}</div>
                  </button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className={cn('shrink-0', pv.isCorporate ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10')}
                    aria-label={`Edit patient profile for ${p.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(p);
                    }}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-0 text-xs">
                  <span className={cn('font-semibold tabular-nums', pv.bodyText)}>
                    {p.daysPostOp} days post-op
                  </span>
                  <span className={cn('inline-flex items-center gap-1 min-w-0', pv.subText)}>
                    <SignalIcon className={cn('h-3.5 w-3.5 shrink-0', pv.isCorporate ? 'text-green-600' : 'text-green-400')} />
                    <span className="truncate">{formatRelativeActivity(p.lastChatAt, nowMs)}</span>
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap" style={pv.riskBadge(riskForRecovery(p))}>
                      {riskForRecovery(p)} risk
                    </Badge>
                    <RiskSummaryHint summary={p.riskSummary} />
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'hidden md:grid w-full items-center gap-x-3 px-6 py-4 transition-colors',
                  bulkMode ? PATIENT_ROW_GRID_COLS : PATIENT_ROW_GRID_NO_SELECT_COLS,
                  bulkMode ? undefined : 'gap-x-4',
                  pv.rowHover,
                )}
              >
                {bulkMode ? (
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedUuids.has(p.patientUuid)}
                      disabled={p.episodeStatus !== 'active'}
                      onChange={() => togglePatientSelected(p.patientUuid)}
                      aria-label={`Select ${p.displayName}`}
                      className="size-4 rounded border-slate-500"
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(p.patientUuid)}
                  className={cn(
                    'min-w-0 text-left',
                    bulkMode ? 'col-span-4 grid grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem] items-center gap-x-3' : 'col-span-4 grid grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem] items-center gap-x-3',
                  )}
                >
                  <div className="min-w-0 overflow-hidden">
                    <div className={cn('font-semibold text-sm flex items-center gap-2 min-w-0', pv.bodyText)}>
                      <span className="truncate">{p.displayName}</span>
                      {p.episodeStatus === 'closed' ? (
                        <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                          Closed
                        </Badge>
                      ) : null}
                      {selfUuid && p.patientUuid === selfUuid ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold shrink-0"
                          style={pv.demoBadgeStyle}
                        >
                          Self (demo)
                        </Badge>
                      ) : null}
                    </div>
                    <div className={cn('font-mono text-xs mt-0.5 truncate', pv.isCorporate ? 'text-slate-600' : 'text-cyan-300')}>
                      {p.displayCode}
                    </div>
                    <div className={cn('text-sm mt-0.5 truncate', pv.mutedText)}>{p.surgery}</div>
                    {p.tenantName ? (
                      <div className={cn('text-[10px] mt-0.5 truncate uppercase tracking-wide', pv.subText)}>
                        {p.tenantName}
                      </div>
                    ) : null}
                  </div>
                  <div className="w-[4.5rem] text-center shrink-0">
                    <div className={cn('text-lg font-bold tabular-nums', pv.bodyText)}>{p.daysPostOp}</div>
                    <div className={cn('text-[10px] uppercase tracking-widest leading-tight', pv.subText)}>days</div>
                  </div>
                  <div className={cn('w-[7rem] shrink-0 flex items-center gap-1.5 text-xs min-w-0', pv.subText)}>
                    <SignalIcon className={cn('h-4 w-4 shrink-0', pv.isCorporate ? 'text-green-600' : 'text-green-400')} />
                    <span className="truncate">{formatRelativeActivity(p.lastChatAt, nowMs)}</span>
                  </div>
                  <div className="w-[6.5rem] shrink-0 flex items-center justify-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] whitespace-nowrap"
                      style={pv.riskBadge(riskForRecovery(p))}
                    >
                      {riskForRecovery(p)} risk
                    </Badge>
                    <RiskSummaryHint summary={p.riskSummary} />
                  </div>
                </button>
                <div className="w-8 shrink-0 flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn('h-8 w-8', pv.isCorporate ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10')}
                    aria-label={`Edit patient profile for ${p.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(p);
                    }}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!loading && total > 0 ? (
          <div
            className={cn('shrink-0 border-t', pv.isCorporate ? 'border-slate-200' : '')}
            style={pv.isCorporate ? undefined : { borderColor: 'rgba(34,211,238,0.08)' }}
          >
            <RemoteListPagination
              total={total}
              page={page}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalLabel={total === 1 ? 'patient' : 'patients'}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
