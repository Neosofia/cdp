import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useState } from 'react';
import {
  listCareEpisodeAppointments,
  listCareEpisodeInboxMessages,
  listCareEpisodeRecords,
  type CareEpisodeAppointment,
  type CareEpisodeInboxMessage,
  type CareEpisodeRecord,
} from '@/lib/careEpisodeApi';
import type { ActivePatientRecovery } from '@/lib/demoPatients';
import {
  activePatientByRecoveryId,
  CHAT_ACTIVE_WINDOW_MS,
  CHAT_TODAY_WINDOW_MS,
  hasRecentChat,
  formatRelativeActivity,
  highlightDashboardRecoveries,
  paginatePatientRecoveries,
  PATIENT_LIST_PAGE_SIZE,
  riskForRecovery,
  sortPatientRecoveriesByRiskAndRecency,
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianListFilters,
} from '@/lib/demoPatients';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowPathIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { usePlatformServiceHealth } from '@/lib/usePlatformServiceHealth';
import { useUserRegistryStats } from '@/lib/useUserRegistryStats';
import { useAdminServiceOps } from '@/lib/useAdminServiceOps';
import { CREDENTIAL_ROTATION_WARNING_DAYS } from '@/lib/platformAuditFeed';
import {
  badgeForReachability,
  formatServiceHealthPrimary,
  formatServiceHealthSecondary,
} from '@/lib/serviceHealth';
import RiskSummaryHint from '@/components/RiskSummaryHint';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

interface DashboardProps {
  activeActor: string;
  firstName?: string;
  clinicianPatients?: ActivePatientRecovery[];
  clinicianError?: string | null;
  patientToken?: string;
  patientUuid?: string;
  /** Bumped after demo bootstrap succeeds so the patient dashboard refetches care-episode data. */
  patientDemoSeedVersion?: number;
  /** True while demo workspace bootstrap is running. */
  patientDemoSeeding?: boolean;
  operatorToken?: string;
  onPatientGoToProfile?: () => void;
  onClinicianOpenPatients?: (patientUuid?: string | null, filters?: ClinicianListFilters) => void;
  onClinicianRetry?: () => void;
  onOperatorOpenUsers?: () => void;
  onOperatorOpenServices?: () => void;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: 'cyan' | 'purple' | 'green' | 'yellow' | 'red';
  onClick?: () => void;
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, { border: string; icon: string; glow: string }> = {
  cyan:   { border: 'rgba(34,211,238,0.25)',  icon: '#22d3ee', glow: 'rgba(34,211,238,0.06)' },
  purple: { border: 'rgba(168,85,247,0.25)',  icon: '#a855f7', glow: 'rgba(168,85,247,0.06)' },
  green:  { border: 'rgba(34,197,94,0.25)',   icon: '#22c55e', glow: 'rgba(34,197,94,0.06)'  },
  yellow: { border: 'rgba(234,179,8,0.25)',   icon: '#eab308', glow: 'rgba(234,179,8,0.06)'  },
  red:    { border: 'rgba(239,68,68,0.25)',   icon: '#ef4444', glow: 'rgba(239,68,68,0.06)'  },
};

const CORPORATE_ACCENT: Record<
  NonNullable<StatCardProps['accent']>,
  { card: string; iconWrap: string; icon: string; sub: string }
> = {
  cyan: {
    card: 'border-cyan-300 bg-cyan-50',
    iconWrap: 'border-cyan-300 bg-cyan-100',
    icon: 'text-cyan-800',
    sub: 'text-cyan-900',
  },
  purple: {
    card: 'border-violet-300 bg-violet-50',
    iconWrap: 'border-violet-300 bg-violet-100',
    icon: 'text-violet-900',
    sub: 'text-violet-950',
  },
  green: {
    card: 'border-emerald-300 bg-emerald-50',
    iconWrap: 'border-emerald-300 bg-emerald-100',
    icon: 'text-emerald-900',
    sub: 'text-emerald-950',
  },
  yellow: {
    card: 'border-amber-300 bg-amber-50',
    iconWrap: 'border-amber-300 bg-amber-100',
    icon: 'text-amber-900',
    sub: 'text-amber-950',
  },
  red: {
    card: 'border-red-300 bg-red-50',
    iconWrap: 'border-red-300 bg-red-100',
    icon: 'text-red-900',
    sub: 'text-red-950',
  },
};

function StatCard({ label, value, sub, icon: Icon, accent = 'cyan', onClick }: StatCardProps) {
  const { isCorporate } = useUiTheme();
  const a = ACCENT[accent];
  const corporate = CORPORATE_ACCENT[accent];
  const Tag = onClick ? 'button' : 'div';

  if (isCorporate) {
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'rounded-xl border p-4 flex items-start gap-4 w-full text-left bg-white shadow-sm',
          corporate.card,
          onClick && 'cursor-pointer transition-colors hover:brightness-[0.98]',
        )}
      >
        <div className={cn('rounded-lg border p-2 shrink-0', corporate.iconWrap)}>
          <Icon className={cn('h-5 w-5', corporate.icon)} />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-950">{value}</div>
          <div className="text-sm font-medium text-slate-800">{label}</div>
          {sub ? <div className={cn('text-xs mt-0.5 font-medium', corporate.sub)}>{sub}</div> : null}
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl p-4 flex items-start gap-4 w-full text-left ${onClick ? 'cursor-pointer transition-colors hover:brightness-110' : ''}`}
      style={{ background: a.glow, border: `1px solid ${a.border}` }}
    >
      <div
        className="rounded-lg p-2 shrink-0"
        style={{ background: `${a.glow}`, border: `1px solid ${a.border}` }}
      >
        <Icon className="h-5 w-5" style={{ color: a.icon }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: a.icon }}>{sub}</div>}
      </div>
    </Tag>
  );
}

interface ListItemProps {
  primary: string;
  secondary: string;
  badge?: { label: string; color: 'green' | 'yellow' | 'red' | 'cyan' | 'purple' };
  meta?: string;
  riskSummary?: string | null;
  onClick?: () => void;
}

const BADGE_STYLE: Record<NonNullable<ListItemProps['badge']>['color'], React.CSSProperties> = {
  green:  { borderColor: 'rgba(34,197,94,0.4)',  color: '#22c55e', background: 'rgba(34,197,94,0.08)'  },
  yellow: { borderColor: 'rgba(234,179,8,0.4)',  color: '#eab308', background: 'rgba(234,179,8,0.08)'  },
  red:    { borderColor: 'rgba(239,68,68,0.4)',  color: '#ef4444', background: 'rgba(239,68,68,0.08)'  },
  cyan:   { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  purple: { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
};

const CORPORATE_BADGE_STYLE: Record<NonNullable<ListItemProps['badge']>['color'], React.CSSProperties> = {
  green:  { borderColor: '#15803d', color: '#14532d', background: '#dcfce7' },
  yellow: { borderColor: '#a16207', color: '#713f12', background: '#fef9c3' },
  red:    { borderColor: '#b91c1c', color: '#7f1d1d', background: '#fee2e2' },
  cyan:   { borderColor: '#0e7490', color: '#164e63', background: '#cffafe' },
  purple: { borderColor: '#7e22ce', color: '#581c87', background: '#f3e8ff' },
};

function ListItem({ primary, secondary, badge, meta, riskSummary, onClick }: ListItemProps) {
  const { isCorporate } = useUiTheme();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between py-3 px-4 rounded-lg w-full text-left border-b last:border-b-0',
        isCorporate ? 'border-slate-200 hover:bg-slate-50' : 'hover:bg-cyan-500/5 transition-colors',
        onClick && 'cursor-pointer',
      )}
      style={isCorporate ? undefined : { borderBottom: '1px solid rgba(34,211,238,0.06)' }}
    >
      <div>
        <div className={cn('text-sm font-medium', isCorporate ? 'text-slate-950' : 'text-slate-100')}>
          {primary}
        </div>
        <div className={cn('text-xs mt-0.5', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
          {secondary}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {meta ? (
          <span className={cn('text-xs', isCorporate ? 'text-slate-600' : 'text-slate-500')}>{meta}</span>
        ) : null}
        <RiskSummaryHint summary={riskSummary} />
        {badge ? (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold"
            style={isCorporate ? CORPORATE_BADGE_STYLE[badge.color] : BADGE_STYLE[badge.color]}
          >
            {badge.label}
          </Badge>
        ) : null}
      </div>
    </Tag>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  onTitleClick,
  headerRight,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onTitleClick?: () => void;
  headerRight?: React.ReactNode;
}) {
  const { isCorporate } = useUiTheme();

  return (
    <Card
      className={cn(
        'gap-0 py-0 self-start w-full overflow-visible',
        isCorporate && 'border border-slate-300 bg-white text-slate-900 shadow-sm ring-0',
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(5,5,15,0.7)',
              border: '1px solid rgba(34,211,238,0.14)',
              boxShadow: '0 0 30px rgba(34,211,238,0.04)',
            }
      }
    >
      <CardHeader
        className={cn('py-3 px-4', isCorporate && 'border-b border-slate-200 bg-slate-50')}
        style={
          isCorporate
            ? undefined
            : {
                borderBottom: '1px solid rgba(34,211,238,0.1)',
                background: 'rgba(34,211,238,0.02)',
              }
        }
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            className={cn(
              'text-sm font-semibold flex items-center gap-2 uppercase tracking-wider',
              isCorporate ? 'text-slate-800' : undefined,
            )}
            style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.7)' }}
          >
            <Icon className="h-4 w-4" />
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className={cn(
                  'transition-colors',
                  isCorporate ? 'hover:text-slate-950' : 'hover:text-cyan-300',
                )}
              >
                {title}
              </button>
            ) : (
              title
            )}
          </CardTitle>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Demo banner
// ---------------------------------------------------------------------------

function DemoBanner() {
  const { isCorporate } = useUiTheme();

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2 text-sm',
        isCorporate
          ? 'border border-amber-400 bg-amber-50 text-amber-950'
          : undefined,
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(168,85,247,0.07)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: 'rgba(168,85,247,0.85)',
            }
      }
    >
      <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
      <span>
        <strong>Demo mode</strong> — all data shown below is synthetic. Switch roles via the profile menu to explore different views.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clinician dashboard
// ---------------------------------------------------------------------------

function ClinicianDashboard({
  patients,
  error,
  onOpenPatients,
  onRetry,
}: {
  patients: ActivePatientRecovery[];
  error?: string | null;
  onOpenPatients?: (patientUuid?: string | null, filters?: ClinicianListFilters) => void;
  onRetry?: () => void;
}) {
  const { isCorporate } = useUiTheme();
  const emptyTextClass = isCorporate ? 'text-slate-700' : 'text-slate-400';
  const pagerTextClass = isCorporate ? 'text-slate-600' : 'text-slate-400';
  const pagerButtonClass = isCorporate
    ? 'h-5 w-5 rounded border border-slate-400 text-slate-800 hover:border-slate-600 disabled:opacity-40'
    : 'h-5 w-5 rounded border border-slate-700 hover:border-cyan-500 disabled:opacity-40';
  const [activePatientsPage, setActivePatientsPage] = useState(1);
  const nowMs = Date.now();
  const openList = (filters: ClinicianListFilters = DEFAULT_CLINICIAN_LIST_FILTERS) => onOpenPatients?.(null, filters);
  const openPatient = (patient: ActivePatientRecovery) => onOpenPatients?.(patient.patientUuid);

  const sortedPatients = useMemo(
    () => sortPatientRecoveriesByRiskAndRecency(patients),
    [patients],
  );

  const pagedActivePatients = useMemo(
    () => paginatePatientRecoveries(sortedPatients, activePatientsPage, PATIENT_LIST_PAGE_SIZE),
    [sortedPatients, activePatientsPage],
  );
  useEffect(() => {
    setActivePatientsPage(1);
  }, [sortedPatients]);

  const dashboardPatients = pagedActivePatients.items.map(p => ({
    patient: p,
    secondary: `${p.surgery} · Day ${p.daysPostOp} post-op`,
    meta: formatRelativeActivity(p.lastChatAt, nowMs),
    risk: riskForRecovery(p),
    riskColor: (riskForRecovery(p) === 'High' ? 'red' : riskForRecovery(p) === 'Medium' ? 'yellow' : 'green') as 'red' | 'yellow' | 'green',
  }));

  const activeChatSessions = highlightDashboardRecoveries(
    patients.filter((p) => hasRecentChat(p, nowMs, CHAT_ACTIVE_WINDOW_MS)),
  ).map(p => ({
    id: p.recoveryId,
    patient: p.displayName,
    started: formatRelativeActivity(p.lastChatAt, nowMs),
    status: 'Active' as const,
    sc: 'cyan' as const,
    patientUuid: p.patientUuid,
  }));

  const highRiskCount = patients.filter(p => riskForRecovery(p) === 'High').length;
  const mediumRiskCount = patients.filter(p => riskForRecovery(p) === 'Medium').length;
  const chatsTodayCount = patients.filter((p) => hasRecentChat(p, nowMs, CHAT_TODAY_WINDOW_MS)).length;
  const activePatients30MinCount = patients.filter((p) => hasRecentChat(p, nowMs, CHAT_ACTIVE_WINDOW_MS)).length;

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
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                'text-xs font-semibold uppercase tracking-wide',
                isCorporate ? 'text-red-900 hover:text-red-950' : 'text-cyan-300 hover:text-cyan-200',
              )}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="High-risk alerts"
          value={highRiskCount}
          sub="Immediate review"
          icon={ExclamationTriangleIcon}
          accent="red"
          onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'high-risk' })}
        />
        <StatCard label="Medium risk" value={mediumRiskCount} sub="Medium risk patients" icon={ClipboardDocumentListIcon} accent="yellow" onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, risk: 'medium-risk' })} />
        <StatCard label="Chats today" value={chatsTodayCount} sub="Last 24 hours" icon={ChatBubbleLeftRightIcon} accent="purple" onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'chats-today' })} />
        <StatCard label="Active patients" value={activePatients30MinCount} sub="Last 30 minutes" icon={UserGroupIcon} accent="cyan" onClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'active-30m' })} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <SectionCard
          title="Patients"
          icon={UserGroupIcon}
          onTitleClick={() => openList()}
          headerRight={pagedActivePatients.totalPages > 1 ? (
            <div className={cn('flex items-center gap-1 text-[10px]', pagerTextClass)}>
              <button
                type="button"
                className={pagerButtonClass}
                onClick={() => setActivePatientsPage((page) => Math.max(1, page - 1))}
                disabled={pagedActivePatients.page <= 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="min-w-9 text-center">
                {pagedActivePatients.page}/{pagedActivePatients.totalPages}
              </span>
              <button
                type="button"
                className={pagerButtonClass}
                onClick={() => setActivePatientsPage((page) => Math.min(pagedActivePatients.totalPages, page + 1))}
                disabled={pagedActivePatients.page >= pagedActivePatients.totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          ) : null}
        >
          {dashboardPatients.length > 0 ? (
            <>
              {dashboardPatients.map(({ patient, secondary, meta, risk, riskColor }) => (
                <ListItem
                  key={patient.patientUuid}
                  primary={patient.displayName}
                  secondary={secondary}
                  badge={{ label: `${risk} risk`, color: riskColor }}
                  meta={meta}
                  riskSummary={patient.riskSummary}
                  onClick={() => openPatient(patient)}
                />
              ))}
            </>
          ) : (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>
              No patients loaded for this role yet. Open Patients to confirm enrollment data is available.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Active chat sessions" icon={ChatBubbleLeftRightIcon} onTitleClick={() => openList({ ...DEFAULT_CLINICIAN_LIST_FILTERS, activity: 'active-30m' })}>
          {activeChatSessions.length > 0 ? (
            activeChatSessions.map(s => (
              <ListItem
                key={s.id}
                primary={`Session ${s.id}`}
                secondary={s.patient}
                badge={{ label: s.status, color: s.sc }}
                meta={s.started}
                onClick={() => {
                  const active = activePatientByRecoveryId(patients, s.id);
                  if (active) onOpenPatients?.(active.patientUuid);
                }}
              />
            ))
          ) : (
            <div className={cn('px-4 py-6 text-sm', emptyTextClass)}>
              No active chats in the last 30 minutes.
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

const LEVEL_COLOR = {
  info:    'green'  as const,
  warning: 'yellow' as const,
  error:   'red'    as const,
};

function AdminDashboard({
  operatorToken,
  activeActor,
  onOpenUsers,
  onOpenServices,
}: {
  operatorToken?: string;
  activeActor: string;
  onOpenUsers?: () => void;
  onOpenServices?: () => void;
}) {
  const { isCorporate } = useUiTheme();
  const { rows, loading, error, summary, refresh } = usePlatformServiceHealth();
  const {
    total: userTotal,
    loading: usersLoading,
    error: usersError,
  } = useUserRegistryStats(operatorToken, activeActor);
  const {
    rotationDueCount,
    auditEvents,
    failedSignIns24h,
    loading: opsLoading,
    error: opsError,
    refresh: refreshOps,
  } = useAdminServiceOps(operatorToken, activeActor);
  const nowMs = Date.now();

  const registeredUsersValue = usersLoading ? '…' : userTotal ?? '—';
  const registeredUsersSub = (() => {
    if (usersLoading) return 'Loading registry…';
    if (usersError) return usersError;
    if (userTotal === null) return 'User registry';
    return userTotal === 1 ? '1 person in registry' : `${userTotal} in user registry`;
  })();

  const activeServicesLabel =
    summary.configured > 0
      ? `${summary.healthy + summary.degraded} / ${summary.configured}`
      : '—';

  const activeServicesSub = (() => {
    if (summary.configured === 0) return 'No API URLs configured';
    const parts: string[] = [];
    if (summary.healthy > 0) parts.push(`${summary.healthy} healthy`);
    if (summary.degraded > 0) parts.push(`${summary.degraded} degraded`);
    if (summary.unhealthy + summary.unreachable > 0) {
      parts.push(`${summary.unhealthy + summary.unreachable} down`);
    }
    if (summary.notConfigured > 0) parts.push(`${summary.notConfigured} not configured`);
    return parts.join(' · ');
  })();

  const healthAccent =
    summary.unhealthy + summary.unreachable > 0
      ? 'red'
      : summary.degraded > 0
        ? 'yellow'
        : summary.configured > 0 && summary.healthy === summary.configured
          ? 'green'
          : 'cyan';

  const rotationDueValue = opsLoading ? '…' : rotationDueCount ?? '—';
  const rotationDueSub = (() => {
    if (opsLoading) return 'Loading service registry…';
    if (opsError) return opsError;
    if (rotationDueCount === null) return 'Authentication services';
    if (rotationDueCount === 0) return 'No credentials past rotation threshold';
    return `${rotationDueCount} credential${rotationDueCount === 1 ? '' : 's'} ≥ ${CREDENTIAL_ROTATION_WARNING_DAYS}d`;
  })();
  const rotationAccent =
    opsError ? 'red' : rotationDueCount && rotationDueCount > 0 ? 'yellow' : 'green';

  const failedSignInsValue = opsLoading ? '…' : failedSignIns24h ?? '—';
  const failedSignInsSub = (() => {
    if (opsLoading) return 'Loading sign-in events…';
    if (opsError) return opsError;
    if (failedSignIns24h === null) return 'Last 24 hours';
    if (failedSignIns24h === 0) return 'No failed sign-ins in the last 24 hours';
    return failedSignIns24h === 1
      ? '1 failed sign-in in the last 24 hours'
      : `${failedSignIns24h} failed sign-ins in the last 24 hours`;
  })();
  const failedSignInsAccent =
    opsError ? 'red' : failedSignIns24h && failedSignIns24h > 0 ? 'yellow' : 'green';

  return (
    <>
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Registered users"
          value={registeredUsersValue}
          sub={registeredUsersSub}
          icon={UserGroupIcon}
          accent={usersError ? 'red' : 'cyan'}
          onClick={onOpenUsers}
        />
        <StatCard
          label="Services responding"
          value={loading ? '…' : activeServicesLabel}
          sub={loading ? 'Checking /health…' : activeServicesSub}
          icon={ServerIcon}
          accent={healthAccent}
        />
        <StatCard
          label="Failed sign-ins (24h)"
          value={failedSignInsValue}
          sub={failedSignInsSub}
          icon={ExclamationTriangleIcon}
          accent={failedSignInsAccent}
        />
        <StatCard
          label="Rotation due"
          value={rotationDueValue}
          sub={rotationDueSub}
          icon={ShieldCheckIcon}
          accent={rotationAccent}
          onClick={onOpenServices}
        />
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: 'rgba(252,165,165,0.95)' }}
        >
          Service health refresh failed: {error}
        </div>
      ) : null}

      {opsError ? (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 text-sm"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)', color: 'rgba(253,224,71,0.95)' }}
        >
          Service registry / audit refresh failed: {opsError}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Service health */}
        <SectionCard
          title="Service health"
          icon={CpuChipIcon}
          headerRight={
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 disabled:opacity-50"
              aria-label="Refresh service health"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        >
          {rows.map((row) => {
            const badge = badgeForReachability(row.reachability);
            return (
              <ListItem
                key={row.id}
                primary={formatServiceHealthPrimary(row)}
                secondary={formatServiceHealthSecondary(row)}
                badge={{ label: badge.label, color: badge.color }}
              />
            );
          })}
          {!loading && summary.notConfigured > 0 ? (
            <div className="px-4 py-3 border-t border-cyan-500/10">
              <p className={cn('text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
                Services marked <span className="text-slate-400">Not configured</span> need a{' '}
                <code className="text-slate-400">VITE_*_API_URL</code> at UI build time (see{' '}
                <code className="text-slate-400">ui/.env.sample</code>).
              </p>
            </div>
          ) : null}
        </SectionCard>

        {/* Audit events */}
        <SectionCard
          title="Recent audit events"
          icon={ClipboardDocumentListIcon}
          headerRight={
            <button
              type="button"
              onClick={() => void refreshOps()}
              disabled={opsLoading}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 disabled:opacity-50"
              aria-label="Refresh audit feed"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${opsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
          onTitleClick={onOpenServices}
        >
          {opsLoading && auditEvents.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>Loading audit history…</p>
          ) : auditEvents.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>No audit or sign-in events in the current window.</p>
          ) : (
            auditEvents.map((e) => (
              <ListItem
                key={e.id}
                primary={e.action}
                secondary={`${e.actor} → ${e.target}`}
                badge={{ label: e.level, color: LEVEL_COLOR[e.level] }}
                meta={formatRelativeActivity(e.changedAt, nowMs)}
                onClick={onOpenServices}
              />
            ))
          )}
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Patient dashboard
// ---------------------------------------------------------------------------

type RecordBadgeColor = 'cyan' | 'purple' | 'green' | 'yellow' | 'red';

const RECORD_TYPE_COLOR: Record<string, RecordBadgeColor> = {
  Lab: 'cyan',
  Visit: 'purple',
  Rx: 'green',
  Imaging: 'yellow',
  Procedure: 'red',
  Allergy: 'cyan',
};

function appointmentStatusColor(status: string): 'green' | 'yellow' | 'red' | 'cyan' {
  const key = status.toLowerCase();
  if (key === 'confirmed') return 'green';
  if (key === 'pending') return 'yellow';
  if (key === 'cancelled') return 'red';
  return 'cyan';
}

function formatAppointmentWhen(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRecordDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(iso: string, nowMs: number): number | null {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.ceil((ts - nowMs) / (24 * 60 * 60 * 1000)));
}

function previewText(body: string, max = 72): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function PatientDashboard({
  firstName,
  token,
  activeActor,
  patientUuid,
  demoSeedVersion = 0,
  demoSeeding = false,
  onGoToProfile,
}: {
  firstName?: string;
  token?: string;
  activeActor: string;
  patientUuid?: string;
  demoSeedVersion?: number;
  demoSeeding?: boolean;
  onGoToProfile?: () => void;
}) {
  const { isCorporate } = useUiTheme();
  const [appointments, setAppointments] = useState<CareEpisodeAppointment[]>([]);
  const [messages, setMessages] = useState<CareEpisodeInboxMessage[]>([]);
  const [records, setRecords] = useState<CareEpisodeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const nowMs = Date.now();

  useEffect(() => {
    if (!token || !patientUuid || demoSeeding) {
      if (!demoSeeding) {
        setAppointments([]);
        setMessages([]);
        setRecords([]);
      }
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [appts, inbox, recs] = await Promise.all([
          listCareEpisodeAppointments(token, activeActor, patientUuid),
          listCareEpisodeInboxMessages(token, activeActor, patientUuid),
          listCareEpisodeRecords(token, activeActor, patientUuid),
        ]);
        if (cancelled) return;
        setAppointments(appts);
        setMessages(inbox);
        setRecords(recs);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid, demoSeedVersion, demoSeeding]);

  const upcoming = useMemo(
    () =>
      [...appointments]
        .filter(a => Date.parse(a.scheduled_at) >= nowMs - 60 * 60 * 1000)
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)),
    [appointments, nowMs],
  );

  const nextAppointment = upcoming[0] ?? null;
  const unreadCount = messages.filter(m => !m.read_at).length;
  const recentRecords = useMemo(
    () =>
      [...records]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4),
    [records],
  );
  const rxCount = records.filter(r => r.type === 'Rx').length;
  const lastRecord = records.length
    ? [...records].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const welcomeDays = nextAppointment ? daysUntil(nextAppointment.scheduled_at, nowMs) : null;

  return (
    <>
      <DemoBanner />

      <div
        className={cn(
          'mb-6 rounded-xl px-5 py-4',
          isCorporate && 'border border-slate-300 bg-slate-100',
        )}
        style={
          isCorporate
            ? undefined
            : {
                background: 'rgba(34,211,238,0.04)',
                border: '1px solid rgba(34,211,238,0.12)',
              }
        }
      >
        <p className={cn('text-sm', isCorporate ? 'text-slate-800' : 'text-slate-300')}>
          {demoSeeding || loading ? (
            <>Loading your care overview…</>
          ) : nextAppointment ? (
            <>
              Welcome back{firstName ? `, ${firstName}` : ''}. Your next appointment is in{' '}
              <strong className={isCorporate ? 'text-slate-950' : 'text-white'}>
                {welcomeDays === 0 ? 'less than a day' : `${welcomeDays} day${welcomeDays === 1 ? '' : 's'}`}
              </strong>
              .
            </>
          ) : (
            <>Welcome back{firstName ? `, ${firstName}` : ''}. No upcoming appointments are scheduled.</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Next appointment"
          value={
            nextAppointment
              ? new Date(nextAppointment.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : '—'
          }
          sub={nextAppointment?.clinician_display_name ?? 'None scheduled'}
          icon={CalendarDaysIcon}
          accent="cyan"
        />
        <StatCard
          label="Unread messages"
          value={unreadCount}
          sub={unreadCount === 1 ? '1 message' : `${unreadCount} messages`}
          icon={ChatBubbleLeftRightIcon}
          accent="yellow"
          onClick={onGoToProfile}
        />
        <StatCard
          label="Health records"
          value={records.length || '—'}
          sub={lastRecord ? `Last: ${formatRecordDate(lastRecord.date)}` : 'On your profile'}
          icon={DocumentTextIcon}
          accent="purple"
          onClick={onGoToProfile}
        />
        <StatCard
          label="Active prescriptions"
          value={rxCount || '—'}
          sub={rxCount ? 'From your record list' : 'None on file'}
          icon={ClipboardDocumentListIcon}
          accent="green"
          onClick={onGoToProfile}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Upcoming appointments" icon={CalendarDaysIcon}>
          {upcoming.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>No upcoming appointments.</p>
          ) : (
            upcoming.map(a => (
              <ListItem
                key={a.id}
                primary={a.clinician_display_name}
                secondary={`${a.specialty} · ${formatAppointmentWhen(a.scheduled_at)}`}
                badge={{ label: a.status, color: appointmentStatusColor(a.status) }}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Messages" icon={BellIcon} onTitleClick={onGoToProfile}>
          {messages.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>No messages from your care team.</p>
          ) : (
            messages.map(m => (
              <ListItem
                key={m.id}
                primary={m.sender_display_name}
                secondary={previewText(m.body)}
                badge={!m.read_at ? { label: 'Unread', color: 'cyan' } : undefined}
                meta={formatRelativeActivity(m.sent_at, nowMs)}
                onClick={onGoToProfile}
              />
            ))
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent medical records" icon={DocumentTextIcon} onTitleClick={onGoToProfile}>
        {recentRecords.length === 0 ? (
          <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>No records yet. View your profile for health records.</p>
        ) : (
          recentRecords.map(r => (
            <ListItem
              key={r.id}
              primary={r.title}
              secondary={formatRecordDate(r.date)}
              badge={{ label: r.type, color: RECORD_TYPE_COLOR[r.type] ?? 'cyan' }}
              onClick={onGoToProfile}
            />
          ))
        )}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// No-role fallback
// ---------------------------------------------------------------------------

function NoRoleDashboard() {
  const { isCorporate } = useUiTheme();

  return (
    <div
      className={cn(
        'rounded-xl p-8 text-center',
        isCorporate && 'border border-slate-300 bg-white text-slate-800 shadow-sm',
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(34,211,238,0.03)',
              border: '1px solid rgba(34,211,238,0.12)',
            }
      }
    >
      <ShieldCheckIcon
        className={cn('h-10 w-10 mx-auto mb-3', isCorporate ? 'text-slate-500' : undefined)}
        style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.4)' }}
      />
      <p className={cn('text-sm', isCorporate ? 'text-slate-800' : 'text-slate-400')}>
        No active role selected. Use the{' '}
        <strong className={isCorporate ? 'text-slate-950' : 'text-white'}>profile menu</strong> to choose a role and see your dashboard.
      </p>
    </div>
  );
}

function StudyDashboard() {
  const { isCorporate } = useUiTheme();

  return (
    <div
      className={cn(
        'rounded-xl p-8 text-center',
        isCorporate && 'border border-slate-300 bg-white text-slate-800 shadow-sm',
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(34,211,238,0.03)',
              border: '1px solid rgba(34,211,238,0.12)',
            }
      }
    >
      <UserGroupIcon
        className={cn('h-10 w-10 mx-auto mb-3', isCorporate ? 'text-slate-500' : undefined)}
        style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.4)' }}
      />
      <p className={cn('text-sm', isCorporate ? 'text-slate-800' : 'text-slate-400')}>
        Study operations home. Open{' '}
        <strong className={isCorporate ? 'text-slate-950' : 'text-white'}>Users</strong> in the menu to
        browse people in your organization (read-only until role management is enabled for study
        operators).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function Dashboard({
  activeActor,
  firstName,
  patientToken,
  patientUuid,
  patientDemoSeedVersion = 0,
  patientDemoSeeding = false,
  operatorToken,
  clinicianPatients = [],
  clinicianError,
  onPatientGoToProfile,
  onClinicianOpenPatients,
  onClinicianRetry,
  onOperatorOpenUsers,
  onOperatorOpenServices,
}: DashboardProps) {
  const role = activeActor.toLowerCase();

  if (role === 'clinician') {
    return (
      <ClinicianDashboard
        patients={clinicianPatients}
        error={clinicianError}
        onOpenPatients={onClinicianOpenPatients}
        onRetry={onClinicianRetry}
      />
    );
  }
  if (role === 'operator') {
    return (
      <AdminDashboard
        operatorToken={operatorToken}
        activeActor={activeActor}
        onOpenUsers={onOperatorOpenUsers}
        onOpenServices={onOperatorOpenServices}
      />
    );
  }
  if (role === 'study') return <StudyDashboard />;
  if (role === 'patient') {
    return (
      <PatientDashboard
        firstName={firstName}
        token={patientToken}
        activeActor={activeActor}
        patientUuid={patientUuid}
        demoSeedVersion={patientDemoSeedVersion}
        demoSeeding={patientDemoSeeding}
        onGoToProfile={onPatientGoToProfile}
      />
    );
  }
  return <NoRoleDashboard />;
}
