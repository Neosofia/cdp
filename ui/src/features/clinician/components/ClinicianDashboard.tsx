import { useEffect, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import {
  DashboardListItem,
  DashboardSectionCard,
  DashboardStatCard,
  DemoBanner,
} from '@/shared/dashboard/Dashboard';
import RemoteListPagination from '@/shared/pagination/RemoteListPagination';
import { formatRelativeActivity } from '@/shared/core/formatRelativeActivity';
import {
  DEFAULT_CLINICIAN_LIST_FILTERS,
  riskForRecovery,
  type ClinicianListFilters,
} from '@/features/clinician/lib/patientRoster';
import { useClinicianDashboardSummary } from '@/features/clinician/lib/useClinicianDashboardSummary';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

export interface ClinicianDashboardProps {
  token: string;
  activeActor: string;
  tenantUuid?: string | null;
  tenantName?: string | null;
  onOpenPatients?: (patientUuid?: string | null, filters?: ClinicianListFilters) => void;
}

export default function ClinicianDashboard({
  token,
  activeActor,
  tenantUuid,
  tenantName,
  onOpenPatients,
}: ClinicianDashboardProps) {
  const { isCorporate } = useUiTheme();
  const emptyTextClass = isCorporate ? 'text-slate-700' : 'text-slate-400';
  const openList = (filters: ClinicianListFilters = DEFAULT_CLINICIAN_LIST_FILTERS) => onOpenPatients?.(null, filters);

  const {
    highRiskCount,
    mediumRiskCount,
    chatsTodayCount,
    activePatients30MinCount,
    previewPatients,
    activeChatPatients,
    previewTotal,
    previewPage,
    previewTotalPages,
    previewRangeStart,
    previewRangeEnd,
    loading,
    error,
    reload,
    setPreviewPage,
  } = useClinicianDashboardSummary({
    token,
    activeActor,
    tenantUuid,
    tenantName,
  });

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dashboardPatients = previewPatients.map((patient) => {
    const risk = riskForRecovery(patient);
    return {
      patient,
      secondary: `${patient.surgery} · Day ${patient.daysPostOp} post-op`,
      meta: formatRelativeActivity(patient.lastChatAt, nowTick),
      risk,
      riskColor: (risk === 'High' ? 'red' : risk === 'Medium' ? 'yellow' : 'green') as 'red' | 'yellow' | 'green',
    };
  });

  const activeChatSessions = activeChatPatients.map((patient) => ({
    id: patient.recoveryId,
    patient: patient.displayName,
    started: formatRelativeActivity(patient.lastChatAt, nowTick),
    status: 'Active' as const,
    sc: 'cyan' as const,
    patientUuid: patient.patientUuid,
  }));

  return (
    <>
      <DemoBanner />
      {error ? (
        <div
          className={cn(
            'rounded-xl px-4 py-2.5 mb-4 text-sm flex flex-wrap items-center justify-between gap-3',
            isCorporate && 'border border-red-300 bg-red-50 text-red-950',
          )}
          style={
            isCorporate
              ? undefined
              : {
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  color: 'rgba(252,165,165,0.95)',
                }
          }
        >
          <span>Clinician data failed to load: {error}</span>
          <button
            type="button"
            onClick={() => void reload()}
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              isCorporate ? 'text-red-900 hover:text-red-950' : 'text-cyan-300 hover:text-cyan-200',
            )}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <DashboardStatCard
          label="High-risk alerts"
          value={highRiskCount}
          sub="Immediate review"
          icon={ExclamationTriangleIcon}
          accent="red"
          onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'high-risk' })}
        />
        <DashboardStatCard
          label="Medium risk"
          value={mediumRiskCount}
          sub="Medium risk patients"
          icon={ClipboardDocumentListIcon}
          accent="yellow"
          onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'medium-risk' })}
        />
        <DashboardStatCard
          label="Chats today"
          value={chatsTodayCount}
          sub="Last 24 hours"
          icon={ChatBubbleLeftRightIcon}
          accent="purple"
          onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'chats-today' })}
        />
        <DashboardStatCard
          label="Active patients"
          value={activePatients30MinCount}
          sub="Last 30 minutes"
          icon={UserGroupIcon}
          accent="cyan"
          onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'active-30m' })}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <DashboardSectionCard
          title="Patients"
          icon={UserGroupIcon}
          onTitleClick={() => openList()}
        >
          {loading ? (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>Loading patients…</div>
          ) : dashboardPatients.length > 0 ? (
            <>
              {dashboardPatients.map(({ patient, secondary, meta, risk, riskColor }) => (
                <DashboardListItem
                  key={patient.patientUuid}
                  primary={patient.displayName}
                  secondary={secondary}
                  badge={{ label: `${risk} risk`, color: riskColor }}
                  meta={meta}
                  riskSummary={patient.riskSummary}
                  onClick={() => onOpenPatients?.(patient.patientUuid)}
                />
              ))}
              {previewTotal > 0 ? (
                <RemoteListPagination
                  total={previewTotal}
                  page={previewPage}
                  totalPages={previewTotalPages}
                  rangeStart={previewRangeStart}
                  rangeEnd={previewRangeEnd}
                  totalLabel={previewTotal === 1 ? 'patient' : 'patients'}
                  onPageChange={setPreviewPage}
                />
              ) : null}
            </>
          ) : (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>
              No patients loaded for this role yet. Open Patients to confirm enrollment data is available.
            </div>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Active chat sessions"
          icon={ChatBubbleLeftRightIcon}
          onTitleClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'active-30m' })}
        >
          {loading ? (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>Loading chat sessions…</div>
          ) : activeChatSessions.length > 0 ? (
            activeChatSessions.map((session) => (
              <DashboardListItem
                key={session.id}
                primary={`Session ${session.id}`}
                secondary={session.patient}
                badge={{ label: session.status, color: session.sc }}
                meta={session.started}
                onClick={() => onOpenPatients?.(session.patientUuid)}
              />
            ))
          ) : (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>
              No active chats in the last 30 minutes.
            </div>
          )}
        </DashboardSectionCard>
      </div>
    </>
  );
}
