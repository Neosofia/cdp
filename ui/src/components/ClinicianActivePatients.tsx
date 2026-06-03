import { useEffect, useMemo, useState } from 'react';
import { useScrollToBottom } from '@/lib/useScrollToBottom';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  UserGroupIcon,
  SignalIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import PatientRecordsPanel from '@/components/PatientRecordsPanel';
import PatientEnrollSheet from '@/components/PatientEnrollSheet';
import ProcedurePicker from '@/components/ProcedurePicker';
import SpawnDatePicker from '@/components/SpawnDatePicker';
import { procedureById, procedureIdForSurgeryName } from '@/lib/procedureCatalog';
import {
  USER_FIELD_LABEL_CLASS,
  USER_INPUT_CLASS,
  USER_PRIMARY_BUTTON_CLASS,
  USER_SHEET_BODY_CLASS,
  USER_SHEET_CANCEL_BUTTON_CLASS,
  USER_SHEET_CONTENT_CLASS,
  USER_SHEET_HEADER_CLASS,
  USER_SHEET_TITLE_CLASS,
  USER_SHEET_TITLE_STYLE,
} from '@/components/userFormStyles';
import type { MedicalRecord } from '@/lib/patientRecordsData';
import { listCareEpisodeRecords } from '@/lib/careEpisodeApi';
import { loadPatientTranscript } from '@/lib/patientTranscript';
import {
  applyClinicianListFilters,
  DEFAULT_CLINICIAN_LIST_FILTERS,
  filterPatientSessions,
  formatRelativeActivity,
  paginatePatientSessions,
  PATIENT_LIST_PAGE_SIZE,
  riskForSession,
  sortPatientSessionsByRiskAndRecency,
  registryUsersNotYetEnrolled,
  type ActivePatientSession,
  type ClinicianActivityFilter,
  type ClinicianListFilters,
  type ClinicianRiskFilter,
  type RegistryPatientUser,
} from '@/lib/demoPatients';
import type { PostCareEnrollmentInput } from '@/lib/postCareEnrollment';

const CARD_STYLE = {
  background: 'rgba(5,5,15,0.7)',
  border: '1px solid rgba(34,211,238,0.18)',
  boxShadow: '0 0 40px rgba(34,211,238,0.05)',
};

interface Props {
  patients: ActivePatientSession[];
  registryUsers: RegistryPatientUser[];
  token: string;
  activeActor: string;
  selfUuid?: string | null;
  loading?: boolean;
  error?: string | null;
  listFilters?: ClinicianListFilters;
  onListFiltersChange?: (filters: ClinicianListFilters) => void;
  selectedPatientUuid?: string | null;
  onSelectPatient: (patientUuid: string | null) => void;
  tenantUuid?: string | null;
  onEnrollInPostCare: (input: PostCareEnrollmentInput) => Promise<void>;
  onEditEnrollment: (input: EditEnrollmentInput) => Promise<void>;
}

export interface EditEnrollmentInput {
  patient_uuid: string;
  display_code: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  surgery: string;
  procedure_date: string;
  session_id: string;
  risk_level: string;
  tenant_uuid: string;
}

interface UiTranscriptMessage {
  id: string;
  role: 'patient' | 'assistant';
  content: string;
  time: string;
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

const FILTER_TRIGGER_CLASS =
  'inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-200 hover:border-slate-500 data-popup-open:border-cyan-500/40';

const FILTER_MENU_CLASS =
  'min-w-36 rounded-lg border border-slate-700 bg-slate-950 p-1 text-slate-200 shadow-lg';

/** Fixed columns: patient · days post-op · last chat · risk (+ edit action). */
const PATIENT_ROW_GRID =
  'grid w-full grid-cols-[minmax(0,1fr)_4.5rem_7rem_5.5rem_2rem] items-center gap-x-4';

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
}) {
  const currentLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={FILTER_TRIGGER_CLASS} aria-label={`${label}: ${currentLabel}`}>
        <span className="text-slate-500">{label}</span>
        <span className="max-w-[5.5rem] truncate text-slate-200">{currentLabel}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-slate-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={FILTER_MENU_CLASS} align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              'cursor-pointer rounded-md px-2 py-1.5 text-xs text-slate-300 focus:bg-cyan-500/10 focus:text-cyan-200',
              value === option.value && 'bg-cyan-500/15 text-cyan-200',
            )}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PatientListFilters({
  filters,
  onChange,
}: {
  filters: ClinicianListFilters;
  onChange: (filters: ClinicianListFilters) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <FilterDropdown
        label="Risk"
        value={filters.risk}
        options={RISK_FILTER_OPTIONS}
        onSelect={(risk) => onChange({ ...filters, risk })}
      />
      <FilterDropdown
        label="Chat"
        value={filters.activity}
        options={ACTIVITY_FILTER_OPTIONS}
        onSelect={(activity) => onChange({ ...filters, activity })}
      />
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
  if (listFilters.risk !== 'all' || listFilters.activity !== 'all') {
    return 'No patients match these filters. Clear risk or chat filters to see more.';
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
  listFilters,
  onListFiltersChange,
  onSelect,
  onEdit,
  onEnroll,
}: {
  patients: ActivePatientSession[];
  selfUuid?: string | null;
  loading?: boolean;
  error?: string | null;
  listFilters: ClinicianListFilters;
  onListFiltersChange: (filters: ClinicianListFilters) => void;
  onSelect: (uuid: string) => void;
  onEdit: (patient: ActivePatientSession) => void;
  onEnroll: () => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
  }, [debouncedSearch, listFilters]);

  const filtered = useMemo(() => {
    const byFilter = applyClinicianListFilters(patients, listFilters, nowMs);
    const searched = filterPatientSessions(byFilter, debouncedSearch);
    return sortPatientSessionsByRiskAndRecency(searched);
  }, [patients, listFilters, nowMs, debouncedSearch]);

  const { items: pagePatients, total, totalPages, page: safePage } = useMemo(
    () => paginatePatientSessions(filtered, page, PATIENT_LIST_PAGE_SIZE),
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
    <Card className="gap-0 py-0 h-full min-h-0 flex flex-col overflow-hidden" style={CARD_STYLE}>
      <CardHeader
        className="py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#22d3ee' }}>
            <UserGroupIcon className="h-5 w-5" />
            Patients
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onEnroll}
            className="text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            <UserPlusIcon className="h-4 w-4 mr-1.5" />
            Enroll
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className="px-6 py-3 border-b shrink-0"
          style={{ borderColor: 'rgba(34,211,238,0.08)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="h-9 w-full pl-9 bg-slate-950/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <PatientListFilters filters={listFilters} onChange={onListFiltersChange} />
          </div>
        </div>
        {error ? (
          <p className="px-6 py-3 text-xs text-amber-400/90 border-b shrink-0" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
            Could not load patients. {error}
          </p>
        ) : null}
        {loading ? (
          <p className="px-6 py-4 text-sm text-slate-500">Loading patients from user service…</p>
        ) : null}
        {!loading && total === 0 ? (
          <p className="px-6 py-4 text-sm text-slate-500">
            {patientListEmptyMessage(patients.length, debouncedSearch, listFilters)}
          </p>
        ) : null}
        <ul className="divide-y flex-1 min-h-0 overflow-y-auto overscroll-y-contain" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          {pagePatients.map(p => (
            <li key={p.patientUuid}>
              <button
                type="button"
                onClick={() => onSelect(p.patientUuid)}
                className={cn(
                  PATIENT_ROW_GRID,
                  'text-left px-6 py-4 hover:bg-cyan-500/5 transition-colors',
                )}
              >
                <div className="min-w-0 overflow-hidden">
                  <div className="font-semibold text-sm text-white flex items-center gap-2 min-w-0">
                    <span className="truncate">{p.displayName}</span>
                    {selfUuid && p.patientUuid === selfUuid ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold shrink-0"
                        style={{
                          borderColor: 'rgba(34,211,238,0.5)',
                          color: '#22d3ee',
                          background: 'rgba(34,211,238,0.12)',
                        }}
                      >
                        Self (demo)
                      </Badge>
                    ) : null}
                  </div>
                  <div className="font-mono text-xs text-cyan-300 mt-0.5 truncate">{p.displayCode}</div>
                  <div className="text-sm text-slate-400 mt-0.5 truncate">{p.surgery}</div>
                </div>
                <div className="w-[4.5rem] text-center shrink-0">
                  <div className="text-lg font-bold text-white tabular-nums">{p.daysPostOp}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 leading-tight">days</div>
                </div>
                <div className="w-[7rem] shrink-0 flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                  <SignalIcon className="h-4 w-4 shrink-0 text-green-400" />
                  <span className="truncate">{formatRelativeActivity(p.lastChatAt, nowMs)}</span>
                </div>
                <div className="w-[5.5rem] shrink-0 flex justify-center">
                  <Badge
                    variant="outline"
                    className="text-[10px] whitespace-nowrap"
                    style={riskForSession(p) === 'High'
                      ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' }
                      : riskForSession(p) === 'Medium'
                        ? { borderColor: 'rgba(234,179,8,0.4)', color: '#eab308', background: 'rgba(234,179,8,0.08)' }
                        : { borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                  >
                    {riskForSession(p)} risk
                  </Badge>
                </div>
                <div className="w-8 shrink-0 flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
                    aria-label={`Edit patient profile for ${p.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(p);
                    }}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Button>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {!loading && total > 0 ? (
          <div
            className="shrink-0 flex items-center justify-between gap-4 px-6 py-3 text-sm text-slate-500 border-t"
            style={{ borderColor: 'rgba(34,211,238,0.08)' }}
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
                className="text-slate-400 border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40"
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
                className="text-slate-400 border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40"
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

function TranscriptPanel({
  patient,
  messages,
}: {
  patient: ActivePatientSession;
  messages: UiTranscriptMessage[];
}) {
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrollRef = useScrollToBottom<HTMLDivElement>([patient.patientUuid, messages.length, lastMessageId]);

  return (
    <Card className="gap-0 py-0 h-full min-h-0 flex flex-col overflow-hidden" style={CARD_STYLE}>
      <CardHeader
        className="py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider" style={{ color: 'rgba(34,211,238,0.8)' }}>
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          Active chat · {messages.length} messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 pb-6 space-y-3"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'patient' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  msg.role === 'patient' ? 'rounded-br-sm' : 'rounded-bl-sm',
                )}
                style={
                  msg.role === 'patient'
                    ? {
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                        border: '1px solid rgba(34,211,238,0.2)',
                        color: '#e2e8f0',
                      }
                    : {
                        background: 'rgba(15,23,42,0.85)',
                        border: '1px solid rgba(34,211,238,0.1)',
                        color: '#cbd5e1',
                      }
                }
              >
                <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60">
                  {msg.role === 'patient' ? 'Patient' : 'Care assistant'} · {msg.time}
                </div>
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDetail({
  patient,
  token,
  activeActor,
  onBack,
  onEdit,
}: {
  patient: ActivePatientSession;
  token: string;
  activeActor: string;
  onBack: () => void;
  onEdit: (patient: ActivePatientSession) => void;
}) {
  const [transcript, setTranscript] = useState<UiTranscriptMessage[]>([]);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  useEffect(() => {
    setTranscript([]);
    setPatientRecords([]);
    setSelectedRecordId(null);
  }, [patient]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [transcriptLines, remoteRecords] = await Promise.all([
        loadPatientTranscript(token, activeActor, patient.patientUuid),
        listCareEpisodeRecords(token, activeActor, patient.patientUuid),
      ]);
      if (cancelled) return;
      setTranscript(transcriptLines);
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
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patient.patientUuid]);

  const handleSelectRecord = (record: MedicalRecord | null) => {
    setSelectedRecordId(record?.id ?? null);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-fit text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
          Back to list
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
          onClick={() => onEdit(patient)}
        >
          <PencilSquareIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4 overflow-hidden">
        <div className="min-h-0 h-full overflow-hidden">
          <TranscriptPanel patient={patient} messages={transcript} />
        </div>
        <div className="min-h-0 h-full overflow-hidden">
          <PatientRecordsPanel
            records={patientRecords}
            embedded
            selectedId={selectedRecordId}
            onSelectRecord={handleSelectRecord}
          />
        </div>
      </div>
    </div>
  );
}

export default function ClinicianActivePatients({
  patients,
  registryUsers,
  token,
  activeActor,
  selfUuid,
  loading,
  error,
  listFilters,
  onListFiltersChange,
  selectedPatientUuid,
  onSelectPatient,
  tenantUuid,
  onEnrollInPostCare,
  onEditEnrollment,
}: Props) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<ActivePatientSession | null>(null);
  const [editDisplayCode, setEditDisplayCode] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSelectedProcedureId, setEditSelectedProcedureId] = useState<string | null>(null);
  const [editProcedureDate, setEditProcedureDate] = useState('');
  const [editSessionId, setEditSessionId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const enrollableRegistryUsers = useMemo(
    () => registryUsersNotYetEnrolled(registryUsers, patients),
    [registryUsers, patients],
  );

  const openEditSheet = (patientToEdit: ActivePatientSession) => {
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
    setEditSessionId(patientToEdit.sessionId ?? '');
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
    if (!editDisplayCode.trim() || !editFirstName.trim() || !editLastName.trim() || !editSessionId.trim() || !editProcedureDate.trim()) {
      setEditError('First name, last name, display code, procedure date, and session ID are required.');
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
        display_name: `${editFirstName.trim()} ${editLastName.trim()}`.trim(),
        surgery: procedureEntry.name,
        procedure_date: editProcedureDate.trim(),
        session_id: editSessionId.trim(),
        risk_level: editingPatient.riskLevel.toLowerCase(),
        tenant_uuid: matchedUser?.tenant_uuid ?? '',
      });
      closeEditSheet();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save patient profile');
      setEditSaving(false);
    }
  };
  const patient = selectedPatientUuid
    ? patients.find(p => p.patientUuid === selectedPatientUuid)
    : null;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {patient ? (
        <SessionDetail
          patient={patient}
          token={token}
          activeActor={activeActor}
          onBack={() => onSelectPatient(null)}
          onEdit={openEditSheet}
        />
      ) : (
        <PatientList
          patients={patients}
          selfUuid={selfUuid}
          loading={loading}
          error={error}
          listFilters={listFilters ?? DEFAULT_CLINICIAN_LIST_FILTERS}
          onListFiltersChange={onListFiltersChange ?? (() => {})}
          onSelect={onSelectPatient}
          onEdit={openEditSheet}
          onEnroll={() => setEnrollOpen(true)}
        />
      )}
      <Sheet open={editOpen} onOpenChange={(nextOpen) => (nextOpen ? setEditOpen(true) : closeEditSheet())}>
        <SheetContent side="right" className={USER_SHEET_CONTENT_CLASS}>
          <SheetHeader className={USER_SHEET_HEADER_CLASS}>
            <SheetTitle className={USER_SHEET_TITLE_CLASS} style={USER_SHEET_TITLE_STYLE}>
              {editingPatient
                ? (
                  <>
                    Patient{' '}
                    <span className="font-mono normal-case tracking-normal text-slate-400">
                      ({editingPatient.patientUuid})
                    </span>
                  </>
                )
                : 'Patient'}
            </SheetTitle>
          </SheetHeader>
          <div className={USER_SHEET_BODY_CLASS}>
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>First name</label>
              <Input value={editFirstName} onChange={(event) => setEditFirstName(event.target.value)} className={USER_INPUT_CLASS} />
            </div>
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>Last name</label>
              <Input value={editLastName} onChange={(event) => setEditLastName(event.target.value)} className={USER_INPUT_CLASS} />
            </div>
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>Email</label>
              <Input value={editEmail} readOnly className={USER_INPUT_CLASS} />
            </div>
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>Display code</label>
              <Input value={editDisplayCode ?? ''} onChange={(event) => setEditDisplayCode(event.target.value)} className={USER_INPUT_CLASS} />
            </div>
            <ProcedurePicker
              selectedId={editSelectedProcedureId}
              onChange={setEditSelectedProcedureId}
            />
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>Procedure date</label>
              <SpawnDatePicker value={editProcedureDate} onChange={setEditProcedureDate} />
            </div>
            <div>
              <label className={USER_FIELD_LABEL_CLASS}>Session ID</label>
              <Input value={editSessionId ?? ''} onChange={(event) => setEditSessionId(event.target.value)} className={USER_INPUT_CLASS} />
            </div>
            {editError ? <p className="text-sm text-red-400">{editError}</p> : null}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void submitEdit()}
                disabled={editSaving}
                className={USER_PRIMARY_BUTTON_CLASS}
              >
                {editSaving ? 'Saving…' : 'Save profile'}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditSheet} className={USER_SHEET_CANCEL_BUTTON_CLASS}>
                Cancel
              </Button>
            </div>
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
