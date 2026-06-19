import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useScrollToBottom } from '@/lib/useScrollToBottom';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArchiveBoxXMarkIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  SparklesIcon,
  SignalIcon,
  UserPlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import ChatBubbleMetaRow from '@/components/ChatBubbleMetaRow';
import ChatMessageContent from '@/components/ChatMessageContent';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePatientViewStyles } from '@/lib/patientViewStyles';
import PatientRecordsPanel from '@/components/PatientRecordsPanel';
import PatientEnrollSheet from '@/components/PatientEnrollSheet';
import NewCareEpisodeSheet from '@/components/NewCareEpisodeSheet';
import ConversationListItems from '@/components/ConversationListItems';
import EpisodeSelector from '@/components/EpisodeSelector';
import PriorConversationsSheet from '@/components/PriorConversationsSheet';
import RiskSummaryHint from '@/components/RiskSummaryHint';
import { AuditHistorySheet } from '@/components/AuditHistorySheet';
import ProcedurePicker from '@/components/ProcedurePicker';
import SpawnDatePicker from '@/components/SpawnDatePicker';
import { procedureById, procedureIdForSurgeryName } from '@/lib/procedureCatalog';
import { useUserFormStyles } from '@/components/userFormStyles';
import type { MedicalRecord } from '@/lib/patientRecordsData';
import {
  createChatMessage,
  interactionsWithIntervention,
  type ChatInteraction,
} from '@/lib/chatApi';
import {
  bulkCloseCareEpisodeRecoveries,
  closeCareEpisodeRecovery,
  listCareEpisodeHistory,
  listCareEpisodeRecords,
  listPatientCareEpisodeAudits,
  reopenCareEpisodeRecovery,
  type CareEpisodeHistoryEntry,
  type CareEpisodeRecoveryAuditItem,
  type InteractionRiskAuditItem,
  type PatientCareEpisodeAuditSource,
} from '@/lib/careEpisodeApi';
import {
  chatMessageToTranscriptLine,
  listPatientChatInteractions,
  loadPatientTranscriptForInteraction,
  type PatientTranscriptLine,
} from '@/lib/patientTranscript';
import {
  applyClinicianListFilters,
  DEFAULT_CLINICIAN_LIST_FILTERS,
  filterPatientRecoveries,
  formatRelativeActivity,
  paginatePatientRecoveries,
  PATIENT_LIST_PAGE_SIZE,
  riskForRecovery,
  sortPatientRecoveriesByRiskAndRecency,
  registryUsersNotYetEnrolled,
  DEFAULT_CARE_WINDOW_DAYS,
  type ActivePatientRecovery,
  type ClinicianActivityFilter,
  type ClinicianEpisodeStatusFilter,
  type ClinicianListFilters,
  type ClinicianRiskFilter,
  type RegistryPatientUser,
} from '@/lib/demoPatients';
import type { PostCareEnrollmentInput } from '@/lib/postCareEnrollment';
import { clinicianTranscriptBubbleLayout } from '@/lib/chatBubbleLayout';

interface Props {
  patients: ActivePatientRecovery[];
  registryUsers: RegistryPatientUser[];
  token: string;
  activeActor: string;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  clinicianUuid?: string | null;
  selfUuid?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  listFilters?: ClinicianListFilters;
  onListFiltersChange?: (filters: ClinicianListFilters) => void;
  selectedPatientUuid?: string | null;
  selectedEpisodeUuid?: string | null;
  onSelectPatient: (patientUuid: string | null) => void;
  tenantUuid?: string | null;
  tenantName?: string | null;
  onEnrollInPostCare: (input: PostCareEnrollmentInput) => Promise<void>;
  onEditEnrollment: (input: EditEnrollmentInput) => Promise<void>;
  onBreadcrumbTrailingChange?: (node: ReactNode | null) => void;
}

export interface EditEnrollmentInput {
  patient_uuid: string;
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
  surgery: string;
  procedure_date: string;
  recovery_id: string;
  risk_level: string;
  tenant_uuid: string;
  care_window_days: number;
}

const RISK_FILTER_OPTIONS: { value: ClinicianRiskFilter; label: string }[] = [
  { value: 'all', label: 'All risk' },
  { value: 'high-risk', label: 'High risk' },
  { value: 'medium-risk', label: 'Medium risk' },
];

const ACTIVITY_FILTER_OPTIONS: { value: ClinicianActivityFilter; label: string }[] = [
  { value: 'all', label: 'All chats' },
  { value: 'active-30m', label: 'Last 30 min' },
  { value: 'chats-today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
];

const EPISODE_STATUS_FILTER_OPTIONS: { value: ClinicianEpisodeStatusFilter; label: string }[] = [
  { value: 'active', label: 'Open episodes' },
  { value: 'closed', label: 'Closed episodes' },
  { value: 'all', label: 'All episodes' },
];

/** Fixed columns: select · patient · days post-op · last chat · risk (+ edit action). */
const PATIENT_ROW_GRID_COLS =
  'grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_7rem_5.5rem_2rem]';
const PATIENT_ROW_GRID_NO_SELECT_COLS =
  'grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem_2rem]';
const PATIENT_AUDIT_PAGE_SIZE = 20;
const PATIENT_AUDIT_CSV_FETCH_SIZE = 100;

function csvEscape(value: string | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function auditEventLabel(changeType: number): string {
  return changeType === 1 ? 'created' : changeType === 2 ? 'updated' : changeType === 3 ? 'deleted' : String(changeType);
}

function downloadPatientAuditCsv(
  rows: CareEpisodeRecoveryAuditItem[] | InteractionRiskAuditItem[],
  source: PatientCareEpisodeAuditSource,
  patientLabel: string,
): void {
  const escape = csvEscape;
  const baseRow = (row: CareEpisodeRecoveryAuditItem | InteractionRiskAuditItem) => [
    escape(new Date(row.changed_at).toLocaleString(undefined, { timeZone: 'UTC' })),
    escape(auditEventLabel(row.change_type)),
    escape(row.changed_by_type === 1 ? 'User' : 'Service'),
    escape(row.changed_by_uuid),
  ];

  const lines =
    source === 'episode'
      ? [
          ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Episode UUID', 'Risk', 'Status', 'Procedure', 'Recovery ID'].join(','),
          ...(rows as CareEpisodeRecoveryAuditItem[]).map((row) =>
            [
              ...baseRow(row),
              escape(row.episode_uuid),
              escape(row.risk_level),
              escape(row.status),
              escape(row.surgery),
              escape(row.recovery_id),
            ].join(','),
          ),
        ]
      : [
          ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Thread UUID', 'Rolling summary'].join(','),
          ...(rows as InteractionRiskAuditItem[]).map((row) =>
            [
              ...baseRow(row),
              escape(row.chat_interaction_uuid),
              escape(row.summary),
            ].join(','),
          ),
        ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${patientLabel}-${source}-audit.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  fullWidth = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
  fullWidth?: boolean;
}) {
  const pv = usePatientViewStyles();
  const currentLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(pv.filterTriggerClass, fullWidth && 'w-full justify-between')}
        aria-label={`${label}: ${currentLabel}`}
      >
        <span className={pv.filterLabelClass}>{label}</span>
        <span className={pv.filterValueClass}>{currentLabel}</span>
        <ChevronDownIcon className={cn('size-3.5 shrink-0', pv.mutedText)} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={pv.filterMenuClass} align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={pv.filterMenuItemClass(value === option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function countActiveListFilters(filters: ClinicianListFilters): number {
  let count = 0;
  if (filters.episodeStatus !== 'active') count += 1;
  if (filters.risk !== 'all') count += 1;
  if (filters.activity !== 'all') count += 1;
  if (filters.minDaysPostOp !== null) count += 1;
  if (filters.minDaysSinceChat !== null) count += 1;
  return count;
}

function PatientListFilters({
  filters,
  onChange,
}: {
  filters: ClinicianListFilters;
  onChange: (filters: ClinicianListFilters) => void;
}) {
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
    onUpdate: (filters: ClinicianListFilters) => void,
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

function patientListEmptyMessage(
  rosterCount: number,
  debouncedSearch: string,
  listFilters: ClinicianListFilters,
): string {
  if (debouncedSearch.trim()) {
    return 'No patients match your search.';
  }
  if (listFilters.risk !== 'all' || listFilters.activity !== 'all' || listFilters.episodeStatus !== 'active'
    || listFilters.minDaysPostOp !== null || listFilters.minDaysSinceChat !== null) {
    return 'No patients match these filters. Clear filters to see more.';
  }
  if (rosterCount === 0) {
    return 'No patients on your roster yet. Select Enroll to start post-care monitoring.';
  }
  return 'No patients to show.';
}

function PatientList({
  patients,
  selfUuid,
  loading,
  error,
  onRetry,
  listFilters,
  onListFiltersChange,
  onSelect,
  onEdit,
  onEnroll,
  token,
  activeActor,
  onBulkClosed,
}: {
  patients: ActivePatientRecovery[];
  selfUuid?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  listFilters: ClinicianListFilters;
  onListFiltersChange: (filters: ClinicianListFilters) => void;
  onSelect: (uuid: string) => void;
  onEdit: (patient: ActivePatientRecovery) => void;
  onEnroll: () => void;
  token: string;
  activeActor: string;
  onBulkClosed: () => void;
}) {
  const pv = usePatientViewStyles();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [bulkClosing, setBulkClosing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelectedUuids(new Set());
  }, [debouncedSearch, listFilters]);

  const filtered = useMemo(() => {
    const byFilter = applyClinicianListFilters(patients, listFilters, nowMs);
    const searched = filterPatientRecoveries(byFilter, debouncedSearch);
    return sortPatientRecoveriesByRiskAndRecency(searched);
  }, [patients, listFilters, nowMs, debouncedSearch]);

  const selectablePatients = useMemo(
    () => filtered.filter((patient) => patient.episodeStatus === 'active'),
    [filtered],
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
    } catch (closeError) {
      setBulkError(closeError instanceof Error ? closeError.message : 'Failed to close episodes');
    } finally {
      setBulkClosing(false);
    }
  };

  const { items: pagePatients, total, totalPages, page: safePage } = useMemo(
    () => paginatePatientRecoveries(filtered, page, PATIENT_LIST_PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const rangeStart = total === 0 ? 0 : (safePage - 1) * PATIENT_LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PATIENT_LIST_PAGE_SIZE, total);

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
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className={cn('font-semibold uppercase tracking-wide', pv.isCorporate ? 'text-slate-700 hover:text-slate-900' : 'text-cyan-300 hover:text-cyan-200')}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {loading ? (
          <p className={cn('px-3 md:px-6 py-4 text-sm', pv.subText)}>Loading patients from user service…</p>
        ) : null}
        {!loading && total === 0 ? (
          <p className={cn('px-3 md:px-6 py-4 text-sm', pv.subText)}>
            {patientListEmptyMessage(patients.length, debouncedSearch, listFilters)}
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
            className={cn('shrink-0 flex items-center justify-between gap-4 px-3 md:px-6 py-3 text-sm border-t', pv.subText, pv.isCorporate ? 'border-slate-200' : '')}
            style={pv.isCorporate ? undefined : { borderColor: 'rgba(34,211,238,0.08)' }}
          >
            <span>
              {rangeStart}–{rangeEnd} of {total} patient{total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={cn(pv.isCorporate ? 'text-slate-600 border-slate-300 hover:text-slate-900 hover:border-slate-400' : 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40')}
              >
                Previous
              </Button>
              <span className="text-xs tabular-nums">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className={cn(pv.isCorporate ? 'text-slate-600 border-slate-300 hover:text-slate-900 hover:border-slate-400' : 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40')}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function transcriptHasClinicianMessage(messages: PatientTranscriptLine[]): boolean {
  return messages.some(message => message.role === 'clinician');
}

function TranscriptPanel({
  patient,
  messages,
  interactions,
  activeInteractionUuid,
  onSelectInteraction,
  onSendClinicianMessage,
  clinicianDisplayName,
  clinicianRoleLabel,
  interventionThreadUuids,
  canCompose,
  loading,
  error,
  composeError,
  sending,
}: {
  patient: ActivePatientRecovery;
  messages: PatientTranscriptLine[];
  interactions: ChatInteraction[];
  activeInteractionUuid: string | null;
  onSelectInteraction: (interactionUuid: string) => void;
  onSendClinicianMessage: (content: string) => Promise<void>;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  interventionThreadUuids: Set<string>;
  canCompose: boolean;
  loading: boolean;
  error: string | null;
  composeError: string | null;
  sending: boolean;
}) {
  const pv = usePatientViewStyles();
  const [draft, setDraft] = useState('');
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrollRef = useScrollToBottom<HTMLDivElement>([
    patient.patientUuid,
    activeInteractionUuid,
    messages.length,
    lastMessageId,
  ]);
  const showDesktopSidebar = interactions.length >= 2;
  const showConversationsPicker = interactions.length > 0;
  const activeThreadHasIntervention = activeInteractionUuid
    ? interventionThreadUuids.has(activeInteractionUuid) || transcriptHasClinicianMessage(messages)
    : false;

  const focusComposeInput = useCallback(() => {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
  }, []);

  useEffect(() => {
    if (canCompose && !sending && !loading) {
      focusComposeInput();
    }
  }, [canCompose, sending, loading, focusComposeInput]);

  const selectInteraction = (interactionUuid: string) => {
    if (interactionUuid === activeInteractionUuid || sending) {
      return;
    }
    onSelectInteraction(interactionUuid);
    focusComposeInput();
  };

  const submitReply = async () => {
    const text = draft.trim();
    if (!text || sending || !canCompose) {
      return;
    }
    setDraft('');
    focusComposeInput();
    try {
      await onSendClinicianMessage(text);
    } finally {
      focusComposeInput();
    }
  };

  const conversationsSidebar = showDesktopSidebar ? (
    <div className={pv.conversationsPanelWrapClass}>
      <aside
        className={pv.conversationsPanelClass}
        style={pv.conversationsPanelStyle}
      >
        <div
          className={pv.conversationsPanelHeaderClass}
          style={pv.conversationsPanelHeaderStyle}
        >
          <p className={cn('text-xs font-semibold uppercase tracking-widest', pv.mutedText)}>Conversations</p>
        </div>
        <nav className={pv.conversationsPanelNavClass}>
          <ConversationListItems
            interactions={interactions}
            activeInteractionUuid={activeInteractionUuid}
            interventionThreadUuids={interventionThreadUuids}
            disabled={loading || sending}
            onSelect={selectInteraction}
            styles={pv}
          />
        </nav>
      </aside>
    </div>
  ) : null;

  const conversationsSheet = showConversationsPicker ? (
    <PriorConversationsSheet
      open={conversationsOpen}
      onOpenChange={setConversationsOpen}
      interactions={interactions}
      activeInteractionUuid={activeInteractionUuid}
      interventionThreadUuids={interventionThreadUuids}
      disabled={loading || sending}
      onSelect={selectInteraction}
    />
  ) : null;

  return (
    <div className={pv.chatLayoutClass}>
      <Card
        className={cn('flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden', pv.chatCardClass)}
        {...(pv.cardStyle ? { style: pv.cardStyle } : {})}
      >
        <CardHeader className={pv.chatCardHeaderClass} style={pv.headerStyle}>
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn('text-lg flex flex-wrap items-center gap-2 min-w-0', pv.titleClass)}
              style={pv.titleStyle}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" />
              <span>Patient chat</span>
              {activeThreadHasIntervention ? (
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md',
                    pv.careTeamBadgeClass,
                  )}
                >
                  Care team active
                </span>
              ) : null}
            </CardTitle>
            {showConversationsPicker ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('shrink-0 md:hidden', pv.outlineButton)}
                onClick={() => setConversationsOpen(true)}
              >
                Conversations
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
          <div
            ref={scrollRef}
            className={cn(pv.chatScrollAreaClass, pv.chatScrollClass)}
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-4 md:py-3">
                <p className={cn('text-sm', pv.mutedText)}>Loading chat transcript…</p>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400 text-center py-4 md:py-3">{error}</p>
            ) : null}
            {!loading && !error && messages.length === 0 ? (
              <p className={cn('text-sm text-center py-4 md:py-3', pv.mutedText)}>No messages in this conversation yet.</p>
            ) : null}
            {messages.map(msg => {
              const layout = clinicianTranscriptBubbleLayout(msg.role);
              const clinicianName = clinicianDisplayName?.trim() || 'Clinician';
              const metaTimeClass = cn(
                pv.isCorporate
                  ? layout.useUserBubble
                    ? 'text-slate-300'
                    : 'text-slate-500'
                  : 'text-slate-400/80',
              );

              return (
                <div
                  key={msg.id}
                  className={cn('flex w-full', layout.alignEnd ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      pv.chatMessageBubbleClass,
                      layout.sizeClass,
                      layout.offsetClass,
                      layout.useUserBubble
                        ? cn(pv.chatBubbleUserClass, layout.tailClass)
                        : cn(pv.chatBubbleAssistantClass, layout.tailClass),
                    )}
                    style={layout.useUserBubble ? pv.chatBubbleUser() : pv.chatBubbleAssistant()}
                  >
                    <ChatBubbleMetaRow
                      time={msg.time}
                      timeClass={metaTimeClass}
                      titleClass={
                        layout.useUserBubble
                          ? pv.isCorporate
                            ? 'text-slate-100'
                            : 'text-cyan-100'
                          : pv.isCorporate
                            ? 'text-slate-800'
                            : 'text-slate-200'
                      }
                      leading={
                        layout.showSparkles ? (
                          <SparklesIcon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              pv.isCorporate ? 'text-violet-600' : '',
                            )}
                            style={pv.isCorporate ? undefined : { color: '#a855f7' }}
                            aria-hidden
                          />
                        ) : undefined
                      }
                      title={
                        msg.role === 'clinician' ? (
                          <>
                            <span className="shrink-0 font-medium">{clinicianName}</span>
                            {clinicianRoleLabel ? (
                              <span
                                className={cn(
                                  'truncate',
                                  pv.isCorporate ? 'text-slate-300' : 'text-cyan-200/80',
                                )}
                              >
                                {` · ${clinicianRoleLabel}`}
                              </span>
                            ) : null}
                          </>
                        ) : msg.role === 'patient' ? (
                          <span className="truncate font-medium">{patient.displayName}</span>
                        ) : undefined
                      }
                    />
                    <ChatMessageContent
                      content={msg.content}
                      markdown={layout.markdown}
                      surface={layout.useUserBubble ? 'dark' : 'light'}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {composeError ? (
            <p className="px-4 pb-2 text-xs text-red-400">{composeError}</p>
          ) : null}

          {canCompose ? (
            <form
              className={cn(pv.chatComposeFormClass, pv.chatCardFooterClass, pv.formFooterClass)}
              style={pv.formFooterStyle}
              onSubmit={event => {
                event.preventDefault();
                void submitReply();
              }}
            >
              <Input
                ref={inputRef}
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitReply();
                  }
                }}
                placeholder="Reply to patient…"
                disabled={loading || sending}
                className={cn('flex-1 h-10', pv.inputClass)}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void submitReply()}
                disabled={loading || sending || !draft.trim()}
                className={cn('chat-send-button', pv.sendButtonClass)}
                style={pv.sendButtonStyle}
                aria-label="Send reply"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
      {conversationsSidebar}
      {conversationsSheet}
    </div>
  );
}

function historyRiskLevel(level: string): 'High' | 'Medium' | 'Low' {
  const normalized = level.trim().toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  return 'Low';
}

function formatHistoryClosedAt(value: string | null | undefined): string {
  if (!value) return 'discharged';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'discharged';
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysPostOpFromProcedureDate(procedureDate: string): number {
  const procedureMs = Date.parse(`${procedureDate.trim()}T12:00:00`);
  if (!Number.isFinite(procedureMs)) {
    return 0;
  }
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((todayMs - procedureMs) / (24 * 60 * 60 * 1000)));
}

function PatientBreadcrumbChrome({
  episodeHistory,
  selectedHistoryUuid,
  historyLoading,
  onSelectEpisode,
  onOpenRecords,
  onOpenAudits,
  onEditPatient,
  outlineButtonClass,
  inputClass,
}: {
  episodeHistory: CareEpisodeHistoryEntry[];
  selectedHistoryUuid: string;
  historyLoading: boolean;
  onSelectEpisode: (episodeUuid: string) => void;
  onOpenRecords: () => void;
  onOpenAudits: () => void;
  onEditPatient: () => void;
  outlineButtonClass: string;
  inputClass: string;
}) {
  return (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      <EpisodeSelector
        episodeHistory={episodeHistory}
        selectedHistoryUuid={selectedHistoryUuid}
        historyLoading={historyLoading}
        onSelectEpisode={onSelectEpisode}
        inputClass={inputClass}
        variant="inline"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onOpenRecords}
      >
        <DocumentTextIcon className="h-4 w-4 mr-1.5" />
        Records
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onOpenAudits}
      >
        <ClipboardDocumentListIcon className="h-4 w-4 mr-1.5" />
        Audits
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onEditPatient}
        aria-label="Edit patient profile"
      >
        <PencilSquareIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SessionDetail({
  patient,
  token,
  activeActor,
  clinicianDisplayName,
  clinicianRoleLabel,
  clinicianUuid,
  preferredEpisodeUuid,
  onEpisodeChanged,
  saveNotice,
  recordsOpen,
  onRecordsOpenChange,
  onEditPatient,
  onBreadcrumbTrailingChange,
}: {
  patient: ActivePatientRecovery;
  token: string;
  activeActor: string;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  clinicianUuid?: string | null;
  preferredEpisodeUuid?: string | null;
  onEpisodeChanged: () => void;
  saveNotice?: string | null;
  recordsOpen: boolean;
  onRecordsOpenChange: (open: boolean) => void;
  onEditPatient: () => void;
  onBreadcrumbTrailingChange?: (node: ReactNode | null) => void;
}) {
  const pv = usePatientViewStyles();
  const [interactions, setInteractions] = useState<ChatInteraction[]>([]);
  const [activeInteractionUuid, setActiveInteractionUuid] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<PatientTranscriptLine[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [episodeStatus, setEpisodeStatus] = useState(patient.episodeStatus);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [interventionThreadUuids, setInterventionThreadUuids] = useState<Set<string>>(() => new Set());
  const [episodeHistory, setEpisodeHistory] = useState<CareEpisodeHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryUuid, setSelectedHistoryUuid] = useState('');
  const [newEpisodeOpen, setNewEpisodeOpen] = useState(false);
  const [auditsOpen, setAuditsOpen] = useState(false);
  const [episodeAuditItems, setEpisodeAuditItems] = useState<CareEpisodeRecoveryAuditItem[]>([]);
  const [riskAuditItems, setRiskAuditItems] = useState<InteractionRiskAuditItem[]>([]);
  const [episodeAuditPage, setEpisodeAuditPage] = useState(1);
  const [riskAuditPage, setRiskAuditPage] = useState(1);
  const [episodeAuditTotal, setEpisodeAuditTotal] = useState(0);
  const [riskAuditTotal, setRiskAuditTotal] = useState(0);
  const [episodeAuditLoading, setEpisodeAuditLoading] = useState(false);
  const [riskAuditLoading, setRiskAuditLoading] = useState(false);
  const [episodeAuditError, setEpisodeAuditError] = useState<string | null>(null);
  const [riskAuditError, setRiskAuditError] = useState<string | null>(null);
  const [downloadingAuditCsv, setDownloadingAuditCsv] = useState<PatientCareEpisodeAuditSource | null>(null);

  const patientAuditLabel = patient.displayCode?.trim() || patient.patientUuid.slice(0, 8);

  const loadEpisodeAudits = useCallback(async (pageNum: number, reset: boolean) => {
    setEpisodeAuditLoading(true);
    if (reset) {
      setEpisodeAuditError(null);
      setEpisodeAuditItems([]);
      setEpisodeAuditTotal(0);
    }
    try {
      const data = await listPatientCareEpisodeAudits<CareEpisodeRecoveryAuditItem>(
        token,
        activeActor,
        patient.patientUuid,
        'episode',
        pageNum,
        PATIENT_AUDIT_PAGE_SIZE,
      );
      setEpisodeAuditItems(data.items ?? []);
      setEpisodeAuditPage(data.page ?? pageNum);
      setEpisodeAuditTotal(data.total ?? 0);
    } catch (error) {
      setEpisodeAuditError(error instanceof Error ? error.message : 'Failed to load episode audit history');
    } finally {
      setEpisodeAuditLoading(false);
    }
  }, [token, activeActor, patient.patientUuid]);

  const loadRiskAudits = useCallback(async (pageNum: number, reset: boolean) => {
    setRiskAuditLoading(true);
    if (reset) {
      setRiskAuditError(null);
      setRiskAuditItems([]);
      setRiskAuditTotal(0);
    }
    try {
      const data = await listPatientCareEpisodeAudits<InteractionRiskAuditItem>(
        token,
        activeActor,
        patient.patientUuid,
        'risk',
        pageNum,
        PATIENT_AUDIT_PAGE_SIZE,
      );
      setRiskAuditItems(data.items ?? []);
      setRiskAuditPage(data.page ?? pageNum);
      setRiskAuditTotal(data.total ?? 0);
    } catch (error) {
      setRiskAuditError(error instanceof Error ? error.message : 'Failed to load risk evaluation audit history');
    } finally {
      setRiskAuditLoading(false);
    }
  }, [token, activeActor, patient.patientUuid]);

  const openAudits = useCallback(() => {
    setAuditsOpen(true);
    setEpisodeAuditPage(1);
    setRiskAuditPage(1);
    void loadEpisodeAudits(1, true);
    void loadRiskAudits(1, true);
  }, [loadEpisodeAudits, loadRiskAudits]);

  const handleDownloadPatientAuditCsv = useCallback(async (source: PatientCareEpisodeAuditSource) => {
    const total = source === 'episode' ? episodeAuditTotal : riskAuditTotal;
    if (total <= 0) {
      return;
    }
    setDownloadingAuditCsv(source);
    try {
      const pages = Math.ceil(total / PATIENT_AUDIT_CSV_FETCH_SIZE);
      if (source === 'episode') {
        const allRows: CareEpisodeRecoveryAuditItem[] = [];
        for (let page = 1; page <= pages; page += 1) {
          const data = await listPatientCareEpisodeAudits<CareEpisodeRecoveryAuditItem>(
            token,
            activeActor,
            patient.patientUuid,
            source,
            page,
            PATIENT_AUDIT_CSV_FETCH_SIZE,
          );
          allRows.push(...data.items);
        }
        downloadPatientAuditCsv(allRows, source, patientAuditLabel);
      } else {
        const allRows: InteractionRiskAuditItem[] = [];
        for (let page = 1; page <= pages; page += 1) {
          const data = await listPatientCareEpisodeAudits<InteractionRiskAuditItem>(
            token,
            activeActor,
            patient.patientUuid,
            source,
            page,
            PATIENT_AUDIT_CSV_FETCH_SIZE,
          );
          allRows.push(...data.items);
        }
        downloadPatientAuditCsv(allRows, source, patientAuditLabel);
      }
    } finally {
      setDownloadingAuditCsv(null);
    }
  }, [token, activeActor, patient.patientUuid, patientAuditLabel, episodeAuditTotal, riskAuditTotal]);

  useEffect(() => {
    setAuditsOpen(false);
  }, [patient.patientUuid]);

  const reloadEpisodeHistory = useCallback(async (options?: { selectEpisodeUuid?: string }) => {
    setHistoryLoading(true);
    try {
      const items = await listCareEpisodeHistory(token, activeActor, patient.patientUuid);
      setEpisodeHistory(items);
      setSelectedHistoryUuid((previous) => {
        const preferred = options?.selectEpisodeUuid?.trim();
        if (preferred && items.some((item) => item.episode_uuid === preferred)) {
          return preferred;
        }
        if (options?.selectEpisodeUuid !== undefined) {
          return items.find((item) => item.is_current)?.episode_uuid ?? items[0]?.episode_uuid ?? '';
        }
        if (items.some((item) => item.episode_uuid === previous)) {
          return previous;
        }
        return items.find((item) => item.is_current)?.episode_uuid ?? items[0]?.episode_uuid ?? '';
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [token, activeActor, patient.patientUuid]);

  useEffect(() => {
    const preferred = preferredEpisodeUuid?.trim();
    void reloadEpisodeHistory(preferred ? { selectEpisodeUuid: preferred } : undefined);
  }, [reloadEpisodeHistory, preferredEpisodeUuid]);

  const selectedHistoryEntry = useMemo(
    () => episodeHistory.find((entry) => entry.episode_uuid === selectedHistoryUuid) ?? null,
    [episodeHistory, selectedHistoryUuid],
  );
  const showHistorySelect = episodeHistory.length > 1
    || episodeHistory.some((entry) => !entry.is_current);
  const liveEpisode = useMemo(
    () => episodeHistory.find((entry) => entry.is_current && entry.status === 'active') ?? null,
    [episodeHistory],
  );
  const managingEpisode = useMemo(() => {
    if (liveEpisode) {
      return liveEpisode;
    }
    return episodeHistory.find((entry) => entry.is_current) ?? episodeHistory[0] ?? null;
  }, [episodeHistory, liveEpisode]);
  const viewingManagingEpisode = Boolean(
    managingEpisode && selectedHistoryEntry?.episode_uuid === managingEpisode.episode_uuid,
  );
  const showLifecycleActions = !showHistorySelect || viewingManagingEpisode;
  const viewingLiveEpisode = Boolean(
    liveEpisode && selectedHistoryEntry?.episode_uuid === liveEpisode.episode_uuid,
  );
  const showDischargeSummary = Boolean(
    selectedHistoryEntry?.status === 'closed'
    && !viewingLiveEpisode
    && episodeHistory.length > 1,
  );
  const headerDaysPostOp = selectedHistoryEntry
    ? daysPostOpFromProcedureDate(selectedHistoryEntry.procedure_date)
    : patient.daysPostOp;
  const headerRisk = selectedHistoryEntry
    ? historyRiskLevel(selectedHistoryEntry.risk_level)
    : riskForRecovery(patient);
  const headerEpisodeClosed = selectedHistoryEntry
    ? selectedHistoryEntry.status === 'closed'
    : episodeStatus === 'closed';

  const breadcrumbCallbacksRef = useRef({
    onOpenRecords: () => onRecordsOpenChange(true),
    onOpenAudits: () => openAudits(),
    onEditPatient,
  });
  breadcrumbCallbacksRef.current = {
    onOpenRecords: () => onRecordsOpenChange(true),
    onOpenAudits: () => openAudits(),
    onEditPatient,
  };

  useEffect(() => {
    if (!onBreadcrumbTrailingChange) {
      return undefined;
    }
    onBreadcrumbTrailingChange(
      <PatientBreadcrumbChrome
        episodeHistory={episodeHistory}
        selectedHistoryUuid={selectedHistoryUuid}
        historyLoading={historyLoading}
        onSelectEpisode={setSelectedHistoryUuid}
        onOpenRecords={() => breadcrumbCallbacksRef.current.onOpenRecords()}
        onOpenAudits={() => breadcrumbCallbacksRef.current.onOpenAudits()}
        onEditPatient={() => breadcrumbCallbacksRef.current.onEditPatient()}
        outlineButtonClass={pv.outlineButton}
        inputClass={pv.inputClass}
      />,
    );
    return () => onBreadcrumbTrailingChange(null);
  }, [
    episodeHistory,
    selectedHistoryUuid,
    historyLoading,
    onBreadcrumbTrailingChange,
    pv.outlineButton,
    pv.inputClass,
  ]);

  useEffect(() => {
    setEpisodeStatus(patient.episodeStatus);
  }, [patient.episodeStatus, patient.patientUuid]);

  useEffect(() => {
    let cancelled = false;
    setRecordsLoading(true);
    setPatientRecords([]);
    setSelectedRecordId(null);

    const loadRecords = async () => {
      try {
        const remoteRecords = await listCareEpisodeRecords(token, activeActor, patient.patientUuid);
        if (cancelled) return;
        if (remoteRecords.length > 0) {
          const records = remoteRecords as MedicalRecord[];
          setPatientRecords(records);

          setSelectedRecordId(previousId => {
            if (previousId && records.some(record => record.id === previousId)) {
              return previousId;
            }
            if (patient.riskLevel === 'High') {
              return records.find(record => record.imageKey === 'xray-scissors')?.id ?? records[0]?.id ?? null;
            }
            return records[0]?.id ?? null;
          });
        }
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };

    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patient.patientUuid, patient.riskLevel]);

  useEffect(() => {
    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptError(null);
    setInteractions([]);
    setActiveInteractionUuid(null);
    setTranscript([]);

    const loadInteractions = async () => {
      try {
        const items = await listPatientChatInteractions(token, activeActor, patient.patientUuid);
        if (cancelled) return;
        setInteractions(items);
        const selectedUuid = items[0]?.chat_interaction_uuid ?? null;
        setActiveInteractionUuid(selectedUuid);
        if (!selectedUuid) {
          setTranscriptLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load conversations';
        setTranscriptError(message);
        setTranscriptLoading(false);
      }
    };

    void loadInteractions();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patient.patientUuid]);

  useEffect(() => {
    if (interactions.length < 2) {
      return;
    }

    let cancelled = false;
    const interactionUuids = interactions.map(interaction => interaction.chat_interaction_uuid);

    void interactionsWithIntervention(token, activeActor, patient.patientUuid, interactionUuids).then(
      engaged => {
        if (!cancelled) {
          setInterventionThreadUuids(engaged);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [interactions, token, activeActor, patient.patientUuid]);

  useEffect(() => {
    if (!activeInteractionUuid || !transcriptHasClinicianMessage(transcript)) {
      return;
    }
    setInterventionThreadUuids(previous => {
      if (previous.has(activeInteractionUuid)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(activeInteractionUuid);
      return next;
    });
  }, [transcript, activeInteractionUuid]);

  useEffect(() => {
    setComposeError(null);
  }, [activeInteractionUuid]);

  useEffect(() => {
    if (!activeInteractionUuid) {
      return;
    }

    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptError(null);

    const loadTranscript = async () => {
      try {
        const lines = await loadPatientTranscriptForInteraction(
          token,
          activeActor,
          patient.patientUuid,
          activeInteractionUuid,
        );
        if (cancelled) return;
        setTranscript(lines);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load chat transcript';
        setTranscriptError(message);
        setTranscript([]);
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    };

    void loadTranscript();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, activeInteractionUuid]);

  const handleSelectRecord = (record: MedicalRecord | null) => {
    setSelectedRecordId(record?.id ?? null);
  };

  const canCompose = Boolean(activeInteractionUuid && clinicianUuid && episodeStatus === 'active');

  const handleEpisodeClose = async () => {
    if (!managingEpisode?.episode_uuid) {
      setLifecycleError('No care episode to close');
      return;
    }
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      const result = await closeCareEpisodeRecovery(
        token,
        activeActor,
        managingEpisode.episode_uuid,
      );
      setEpisodeStatus(result.status ?? 'closed');
      onEpisodeChanged();
      void reloadEpisodeHistory();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to close episode');
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleEpisodeReopen = async () => {
    if (!managingEpisode?.episode_uuid) {
      setLifecycleError('No care episode to reopen');
      return;
    }
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      const result = await reopenCareEpisodeRecovery(
        token,
        activeActor,
        managingEpisode.episode_uuid,
      );
      setEpisodeStatus(result.status ?? 'active');
      onEpisodeChanged();
      void reloadEpisodeHistory();
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to reopen episode');
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleSendClinicianMessage = async (content: string) => {
    if (!activeInteractionUuid || !clinicianUuid) {
      return;
    }
    setComposeError(null);
    setSendingReply(true);
    try {
      const created = await createChatMessage(token, activeActor, patient.patientUuid, activeInteractionUuid, {
        sender_type: 'clinician',
        sender_uuid: clinicianUuid,
        content,
      });
      if (!created) {
        throw new Error('Chat service is not configured');
      }
      setTranscript(previous => [...previous, chatMessageToTranscriptLine(created)]);
      setInteractions(previous =>
        previous.map(interaction =>
          interaction.chat_interaction_uuid === activeInteractionUuid
            ? {
                ...interaction,
                message_count: interaction.message_count + 1,
                last_message_at: created.created_at,
                preview: content,
              }
            : interaction,
        ),
      );
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send reply';
      setComposeError(message);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {saveNotice ? (
        <p
          role="status"
          className="shrink-0 rounded-md border px-3 py-2 text-sm text-emerald-200"
          style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.1)' }}
        >
          {saveNotice}
        </p>
      ) : null}
      <div className="md:hidden shrink-0 space-y-2">
        <EpisodeSelector
          episodeHistory={episodeHistory}
          selectedHistoryUuid={selectedHistoryUuid}
          historyLoading={historyLoading}
          onSelectEpisode={setSelectedHistoryUuid}
          inputClass={pv.inputClass}
          variant="stacked"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('flex-1', pv.outlineButton)}
            onClick={() => onRecordsOpenChange(true)}
          >
            <DocumentTextIcon className="h-4 w-4 mr-1.5" />
            Records
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('flex-1', pv.outlineButton)}
            onClick={() => openAudits()}
          >
            <ClipboardDocumentListIcon className="h-4 w-4 mr-1.5" />
            Audits
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={pv.outlineButton}
            onClick={onEditPatient}
            aria-label="Edit patient profile"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'shrink-0 rounded-lg border px-3 py-2 md:px-4 md:py-3',
          pv.isCorporate ? 'border-slate-200 bg-slate-50' : 'border-cyan-500/20 bg-cyan-500/5',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <p className={cn('text-base font-semibold truncate', pv.bodyText)}>
            {patient.displayName}
            {patient.displayCode ? (
              <span className={cn('ml-1.5 font-mono text-xs font-normal', pv.mutedText)}>
                ({patient.displayCode})
              </span>
            ) : null}
          </p>
          <span className={cn('text-sm tabular-nums', pv.bodyText)}>{headerDaysPostOp}d post-op</span>
          {headerEpisodeClosed ? (
            <Badge variant="outline" className="text-[10px]">Closed</Badge>
          ) : null}
          {patient.tenantName ? (
            <span className={cn('hidden sm:inline text-[10px] uppercase tracking-wide', pv.subText)}>{patient.tenantName}</span>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Badge variant="outline" className="text-[10px]" style={pv.riskBadge(headerRisk)}>
              {headerRisk} risk
            </Badge>
            <RiskSummaryHint summary={patient.riskSummary} />
            {showLifecycleActions && episodeStatus === 'closed' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={pv.outlineButton}
                onClick={() => setNewEpisodeOpen(true)}
              >
                <UserPlusIcon className="h-4 w-4 mr-1.5" />
                New episode
              </Button>
            ) : null}
            {showLifecycleActions && episodeStatus === 'active' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={lifecycleBusy}
                onClick={() => void handleEpisodeClose()}
                className={pv.outlineButton}
              >
                <ArchiveBoxXMarkIcon className="h-4 w-4 mr-1.5" />
                Close episode
              </Button>
            ) : null}
            {showLifecycleActions && episodeStatus === 'closed' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={lifecycleBusy}
                onClick={() => void handleEpisodeReopen()}
                className={pv.outlineButton}
              >
                <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                Reopen episode
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {lifecycleError ? <p className="text-xs text-red-400 shrink-0">{lifecycleError}</p> : null}
      {showDischargeSummary && selectedHistoryEntry ? (
        <div
          className={cn(
            'shrink-0 rounded-lg border px-4 py-2 text-sm',
            pv.isCorporate ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/40',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <ClockIcon className={cn('h-4 w-4', pv.mutedText)} />
              <span className={pv.bodyText}>Discharge summary</span>
            </div>
            {selectedHistoryEntry.closed_at ? (
              <span className={pv.mutedText}>
                Closed {formatHistoryClosedAt(selectedHistoryEntry.closed_at)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {showHistorySelect && !viewingManagingEpisode ? (
        <p className={cn('text-sm shrink-0', pv.mutedText)}>
          Viewing a prior discharge for review. Select the current episode above to
          manage the live care episode.
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TranscriptPanel
          patient={patient}
          messages={transcript}
          interactions={interactions}
          activeInteractionUuid={activeInteractionUuid}
          onSelectInteraction={setActiveInteractionUuid}
          onSendClinicianMessage={handleSendClinicianMessage}
          clinicianDisplayName={clinicianDisplayName}
          clinicianRoleLabel={clinicianRoleLabel}
          interventionThreadUuids={interventionThreadUuids}
          canCompose={canCompose}
          loading={transcriptLoading}
          error={transcriptError}
          composeError={composeError}
          sending={sendingReply}
        />
      </div>
      <AuditHistorySheet
        open={auditsOpen}
        onOpenChange={setAuditsOpen}
        title={
          <>
            Patient audit history —{' '}
            <span className={cn('normal-case', pv.bodyText)}>{patient.displayName}</span>{' '}
            {patient.displayCode ? (
              <span className={cn('font-mono normal-case', pv.mutedText)}>({patient.displayCode})</span>
            ) : null}
          </>
        }
        sections={[
          {
            key: 'episode-audits',
            kind: 'episode',
            title: 'Care episode changes',
            actions: episodeAuditTotal > 0 && !episodeAuditError ? (
              <button
                type="button"
                onClick={() => void handleDownloadPatientAuditCsv('episode')}
                disabled={downloadingAuditCsv === 'episode'}
                className={pv.adminIconActionClass}
                title="Download full history as CSV"
              >
                {downloadingAuditCsv === 'episode'
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
            ) : null,
            rows: episodeAuditError ? null : episodeAuditLoading && episodeAuditItems.length === 0 ? null : episodeAuditItems,
            loading: episodeAuditLoading && episodeAuditItems.length === 0,
            emptyMessage: 'No care episode audit entries for this patient.',
            errorMessage: episodeAuditError ?? 'Failed to load episode audit history.',
            total: episodeAuditTotal,
            page: episodeAuditPage,
            pageSize: PATIENT_AUDIT_PAGE_SIZE,
            onPageChange: (page) => {
              if (!episodeAuditLoading) {
                void loadEpisodeAudits(page, false);
              }
            },
          },
          {
            key: 'risk-audits',
            kind: 'risk',
            title: 'Rolling risk evaluation summaries',
            actions: riskAuditTotal > 0 && !riskAuditError ? (
              <button
                type="button"
                onClick={() => void handleDownloadPatientAuditCsv('risk')}
                disabled={downloadingAuditCsv === 'risk'}
                className={pv.adminIconActionClass}
                title="Download full history as CSV"
              >
                {downloadingAuditCsv === 'risk'
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
            ) : null,
            rows: riskAuditError ? null : riskAuditLoading && riskAuditItems.length === 0 ? null : riskAuditItems,
            loading: riskAuditLoading && riskAuditItems.length === 0,
            emptyMessage: 'No risk evaluation audit entries yet — summaries appear after patient chat turns.',
            errorMessage: riskAuditError ?? 'Failed to load risk evaluation audit history.',
            total: riskAuditTotal,
            page: riskAuditPage,
            pageSize: PATIENT_AUDIT_PAGE_SIZE,
            onPageChange: (page) => {
              if (!riskAuditLoading) {
                void loadRiskAudits(page, false);
              }
            },
          },
        ]}
      />
      <Sheet open={recordsOpen} onOpenChange={onRecordsOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            'gap-0 overflow-hidden p-0',
            'w-[75vw] max-w-[75vw] data-[side=right]:w-[75vw] data-[side=right]:max-w-[75vw] data-[side=right]:sm:max-w-[75vw]',
            pv.isCorporate ? 'bg-white' : 'bg-slate-950',
          )}
        >
          <SheetHeader
            className={cn(
              'shrink-0 border-b px-6 pt-6 pb-4',
              pv.isCorporate ? 'border-slate-200' : 'border-slate-700/60',
            )}
          >
            <SheetTitle className={cn('pr-8', pv.titleClass)}>Medical records</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-4">
            <PatientRecordsPanel
              records={patientRecords}
              embedded
              selectedId={selectedRecordId}
              onSelectRecord={handleSelectRecord}
              loading={recordsLoading}
            />
          </div>
        </SheetContent>
      </Sheet>
      {patient.tenantUuid ? (
        <NewCareEpisodeSheet
          open={newEpisodeOpen}
          onOpenChange={setNewEpisodeOpen}
          patientUuid={patient.patientUuid}
          displayCode={patient.displayCode}
          displayName={patient.displayName}
          tenantUuid={patient.tenantUuid}
          token={token}
          activeActor={activeActor}
          onStarted={(episodeUuid) => {
            setEpisodeStatus('active');
            setLifecycleError(null);
            onEpisodeChanged();
            void reloadEpisodeHistory({ selectEpisodeUuid: episodeUuid });
          }}
        />
      ) : null}
    </div>
  );
}

export default function ClinicianActivePatients({
  patients,
  registryUsers,
  token,
  activeActor,
  clinicianDisplayName,
  clinicianRoleLabel,
  clinicianUuid,
  selfUuid,
  loading,
  error,
  onRetry,
  listFilters,
  onListFiltersChange,
  selectedPatientUuid,
  selectedEpisodeUuid,
  onSelectPatient,
  tenantUuid,
  tenantName: _tenantName,
  onEnrollInPostCare,
  onEditEnrollment,
  onBreadcrumbTrailingChange,
}: Props) {
  const formStyles = useUserFormStyles();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<ActivePatientRecovery | null>(null);
  const [editDisplayCode, setEditDisplayCode] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSelectedProcedureId, setEditSelectedProcedureId] = useState<string | null>(null);
  const [editProcedureDate, setEditProcedureDate] = useState('');
  const [editRecoveryId, setEditRecoveryId] = useState('');
  const [editCareWindowDays, setEditCareWindowDays] = useState(String(DEFAULT_CARE_WINDOW_DAYS));
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const enrollableRegistryUsers = useMemo(
    () => registryUsersNotYetEnrolled(registryUsers, patients),
    [registryUsers, patients],
  );

  const openEditSheet = (patientToEdit: ActivePatientRecovery) => {
    const matchedUser = registryUsers.find((user) => user.uuid === patientToEdit.patientUuid);
    const [fallbackFirstName = '', ...rest] = patientToEdit.displayName.trim().split(/\s+/);
    const fallbackLastName = rest.join(' ');
    setEditingPatient(patientToEdit);
    setEditDisplayCode(patientToEdit.displayCode ?? '');
    setEditFirstName((matchedUser?.first_name ?? fallbackFirstName).trim());
    setEditLastName((matchedUser?.last_name ?? fallbackLastName).trim());
    setEditEmail((matchedUser?.email ?? '').trim());
    setEditSelectedProcedureId(procedureIdForSurgeryName(patientToEdit.surgery ?? ''));
    setEditProcedureDate(patientToEdit.procedureDate ?? new Date().toISOString().slice(0, 10));
    setEditRecoveryId(patientToEdit.recoveryId ?? '');
    setEditCareWindowDays(String(patientToEdit.careWindowDays ?? DEFAULT_CARE_WINDOW_DAYS));
    setEditError(null);
    setEditOpen(true);
  };

  const closeEditSheet = () => {
    setEditOpen(false);
    setEditingPatient(null);
    setEditSelectedProcedureId(null);
    setEditError(null);
    setEditSaving(false);
  };

  const submitEdit = async () => {
    if (!editingPatient) return;
    const procedureEntry = editSelectedProcedureId ? procedureById(editSelectedProcedureId) : undefined;
    if (!editDisplayCode.trim() || !editFirstName.trim() || !editLastName.trim() || !editRecoveryId.trim() || !editProcedureDate.trim()) {
      setEditError('First name, last name, display code, procedure date, and recovery ID are required.');
      return;
    }
    if (!procedureEntry) {
      setEditError('Select a procedure from the catalog.');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Patient email is required to save name updates.');
      return;
    }
    const careDays = Number.parseInt(editCareWindowDays, 10);
    if (!Number.isFinite(careDays) || careDays <= 0) {
      setEditError('Care window must be a positive number of days.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const matchedUser = registryUsers.find((user) => user.uuid === editingPatient.patientUuid);
      await onEditEnrollment({
        patient_uuid: editingPatient.patientUuid,
        display_code: editDisplayCode.trim(),
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
        surgery: procedureEntry.name,
        procedure_date: editProcedureDate.trim(),
        recovery_id: editRecoveryId.trim(),
        risk_level: editingPatient.riskLevel.toLowerCase(),
        tenant_uuid: matchedUser?.tenant_uuid ?? '',
        care_window_days: careDays,
      });
      setSaveNotice('Patient profile saved.');
      closeEditSheet();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save patient profile');
      setEditSaving(false);
    }
  };
  const patient = selectedPatientUuid
    ? patients.find(p => p.patientUuid === selectedPatientUuid)
    : null;

  useEffect(() => {
    if (!patient) {
      onBreadcrumbTrailingChange?.(null);
    }
  }, [patient, onBreadcrumbTrailingChange]);

  useEffect(() => {
    setRecordsOpen(false);
  }, [patient?.patientUuid]);

  return (
    <div className={cn('flex flex-col gap-3', patient && 'min-h-0 flex-1 overflow-hidden')}>
      {patient ? (
        <SessionDetail
          patient={patient}
          token={token}
          activeActor={activeActor}
          clinicianDisplayName={clinicianDisplayName}
          clinicianRoleLabel={clinicianRoleLabel}
          clinicianUuid={clinicianUuid}
          preferredEpisodeUuid={selectedEpisodeUuid}
          onEpisodeChanged={onRetry ?? (() => {})}
          saveNotice={saveNotice}
          recordsOpen={recordsOpen}
          onRecordsOpenChange={setRecordsOpen}
          onEditPatient={() => openEditSheet(patient)}
          onBreadcrumbTrailingChange={onBreadcrumbTrailingChange}
        />
      ) : (
        <PatientList
          patients={patients}
          selfUuid={selfUuid}
          loading={loading}
          error={error}
          onRetry={onRetry}
          listFilters={listFilters ?? DEFAULT_CLINICIAN_LIST_FILTERS}
          onListFiltersChange={onListFiltersChange ?? (() => {})}
          onSelect={onSelectPatient}
          onEdit={openEditSheet}
          onEnroll={() => setEnrollOpen(true)}
          token={token}
          activeActor={activeActor}
          onBulkClosed={onRetry ?? (() => {})}
        />
      )}
      <Sheet open={editOpen} onOpenChange={(nextOpen) => (nextOpen ? setEditOpen(true) : closeEditSheet())}>
        <SheetContent side="right" className={formStyles.sheetContentClass}>
          <SheetHeader className={formStyles.sheetHeaderClass}>
            <SheetTitle className={formStyles.sheetTitleClass} style={formStyles.sheetTitleStyle}>
              {editingPatient ? (
                <span className="normal-case tracking-normal">
                  <span className="block text-sm sm:text-xs sm:uppercase sm:tracking-widest">Edit patient</span>
                  <span className={cn('mt-1 block font-mono text-sm sm:mt-0 sm:inline', formStyles.mutedTextClass)}>
                    <span className="sm:hidden">{editDisplayCode || editingPatient.displayCode}</span>
                    <span className="hidden sm:inline">({editingPatient.patientUuid})</span>
                  </span>
                </span>
              ) : (
                'Patient'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className={formStyles.sheetBodyClass}>
            <div>
              <label className={formStyles.fieldLabelClass}>First name</label>
              <Input value={editFirstName} onChange={(event) => setEditFirstName(event.target.value)} className={formStyles.inputClass} />
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>Last name</label>
              <Input value={editLastName} onChange={(event) => setEditLastName(event.target.value)} className={formStyles.inputClass} />
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>Email</label>
              <Input value={editEmail} readOnly className={formStyles.inputClass} />
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>Display code</label>
              <Input value={editDisplayCode ?? ''} onChange={(event) => setEditDisplayCode(event.target.value)} className={formStyles.inputClass} />
            </div>
            <ProcedurePicker
              selectedId={editSelectedProcedureId}
              onChange={setEditSelectedProcedureId}
            />
            <div>
              <label className={formStyles.fieldLabelClass}>Procedure date</label>
              <SpawnDatePicker value={editProcedureDate} onChange={setEditProcedureDate} />
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>Recovery ID</label>
              <Input value={editRecoveryId ?? ''} onChange={(event) => setEditRecoveryId(event.target.value)} className={formStyles.inputClass} />
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
                value={editCareWindowDays}
                onChange={(event) => setEditCareWindowDays(event.target.value)}
              />
            </div>
            {editError ? <p className="text-sm text-red-400">{editError}</p> : null}
          </div>
          <div className={formStyles.sheetFooterActionsClass}>
            <Button
              type="button"
              variant="outline"
              onClick={() => void submitEdit()}
              disabled={editSaving}
              className={cn(formStyles.primaryButtonClass, formStyles.sheetPrimaryActionClass)}
            >
              {editSaving ? 'Saving…' : 'Save profile'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditSheet}
              className={cn(formStyles.sheetCancelButtonClass, formStyles.sheetPrimaryActionClass)}
            >
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <PatientEnrollSheet
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        existingPatients={enrollableRegistryUsers}
        tenantUuid={tenantUuid}
        onEnroll={onEnrollInPostCare}
      />
    </div>
  );
}
