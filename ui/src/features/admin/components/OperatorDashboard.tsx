import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import {
  DashboardListItem,
  DashboardSectionCard,
  DashboardStatCard,
  type DashboardBadgeColor,
} from '@/shared/dashboard/Dashboard';
import { useAdminServiceOps } from '@/features/admin/lib/useAdminServiceOps';
import { useUserRegistryStats } from '@/features/admin/lib/useUserRegistryStats';
import { formatRelativeActivity } from '@/shared/core/formatRelativeActivity';
import { CREDENTIAL_ROTATION_WARNING_DAYS } from '@/shared/platform/platformAuditFeed';
import {
  badgeForReachability,
  formatServiceHealthPrimary,
  formatServiceHealthSecondary,
} from '@/shared/platform/serviceHealth';
import { usePlatformServiceHealth } from '@/shared/platform/usePlatformServiceHealth';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

const AUDIT_LEVEL_COLOR: Record<'info' | 'warning' | 'error', DashboardBadgeColor> = {
  info: 'green',
  warning: 'yellow',
  error: 'red',
};

export interface OperatorDashboardProps {
  operatorToken?: string;
  activeActor: string;
  onOpenUsers?: () => void;
  onOpenServices?: () => void;
}

export default function OperatorDashboard({
  operatorToken,
  activeActor,
  onOpenUsers,
  onOpenServices,
}: OperatorDashboardProps) {
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
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [rows, userTotal, auditEvents, failedSignIns24h, rotationDueCount]);

  const registeredUsersValue = usersLoading ? '…' : userTotal ?? '—';
  const registeredUsersSub = (() => {
    if (usersLoading) return 'Loading registry…';
    if (usersError) return usersError;
    if (userTotal === null) return 'User registry';
    return userTotal === 1 ? '1 person in registry' : `${userTotal} in user registry`;
  })();

  const activeServicesLabel =
    summary.configured > 0 ? `${summary.healthy + summary.degraded} / ${summary.configured}` : '—';

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
  const rotationAccent = opsError ? 'red' : rotationDueCount && rotationDueCount > 0 ? 'yellow' : 'green';

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
  const failedSignInsAccent = opsError ? 'red' : failedSignIns24h && failedSignIns24h > 0 ? 'yellow' : 'green';

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <DashboardStatCard
          label="Registered users"
          value={registeredUsersValue}
          sub={registeredUsersSub}
          icon={UserGroupIcon}
          accent={usersError ? 'red' : 'cyan'}
          onClick={onOpenUsers}
        />
        <DashboardStatCard
          label="Services responding"
          value={loading ? '…' : activeServicesLabel}
          sub={loading ? 'Checking /health…' : activeServicesSub}
          icon={ServerIcon}
          accent={healthAccent}
        />
        <DashboardStatCard
          label="Failed sign-ins (24h)"
          value={failedSignInsValue}
          sub={failedSignInsSub}
          icon={ExclamationTriangleIcon}
          accent={failedSignInsAccent}
        />
        <DashboardStatCard
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
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            color: 'rgba(252,165,165,0.95)',
          }}
        >
          Service health refresh failed: {error}
        </div>
      ) : null}

      {opsError ? (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 text-sm"
          style={{
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.22)',
            color: 'rgba(253,224,71,0.95)',
          }}
        >
          Service registry / audit refresh failed: {opsError}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        <DashboardSectionCard
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
              <DashboardListItem
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
        </DashboardSectionCard>

        <DashboardSectionCard
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
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
              Loading audit history…
            </p>
          ) : auditEvents.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
              No audit or sign-in events in the current window.
            </p>
          ) : (
            auditEvents.map((event) => (
              <DashboardListItem
                key={event.id}
                primary={event.action}
                secondary={`${event.actor} → ${event.target}`}
                badge={{ label: event.level, color: AUDIT_LEVEL_COLOR[event.level] }}
                meta={formatRelativeActivity(event.changedAt, nowMs)}
                onClick={onOpenServices}
              />
            ))
          )}
        </DashboardSectionCard>
      </div>
    </>
  );
}
