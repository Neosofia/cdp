import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { CSSProperties, ElementType, ReactNode } from 'react';

import RiskSummaryHint from '@/features/clinician/components/RiskSummaryHint';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

export type DashboardStatAccent = 'cyan' | 'purple' | 'green' | 'yellow' | 'red';

export type DashboardBadgeColor = 'green' | 'yellow' | 'red' | 'cyan' | 'purple';

export const STAT_ACCENT: Record<
  DashboardStatAccent,
  { border: string; icon: string; glow: string }
> = {
  cyan: { border: 'rgba(34,211,238,0.25)', icon: '#22d3ee', glow: 'rgba(34,211,238,0.06)' },
  purple: { border: 'rgba(168,85,247,0.25)', icon: '#a855f7', glow: 'rgba(168,85,247,0.06)' },
  green: { border: 'rgba(34,197,94,0.25)', icon: '#22c55e', glow: 'rgba(34,197,94,0.06)' },
  yellow: { border: 'rgba(234,179,8,0.25)', icon: '#eab308', glow: 'rgba(234,179,8,0.06)' },
  red: { border: 'rgba(239,68,68,0.25)', icon: '#ef4444', glow: 'rgba(239,68,68,0.06)' },
};

export const CORPORATE_STAT_ACCENT: Record<
  DashboardStatAccent,
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

export const LIST_BADGE_STYLE: Record<DashboardBadgeColor, CSSProperties> = {
  green: { borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
  yellow: { borderColor: 'rgba(234,179,8,0.4)', color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  red: { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  cyan: { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  purple: { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
};

export const CORPORATE_LIST_BADGE_STYLE: Record<DashboardBadgeColor, CSSProperties> = {
  green: { borderColor: '#15803d', color: '#14532d', background: '#dcfce7' },
  yellow: { borderColor: '#a16207', color: '#713f12', background: '#fef9c3' },
  red: { borderColor: '#b91c1c', color: '#7f1d1d', background: '#fee2e2' },
  cyan: { borderColor: '#0e7490', color: '#164e63', background: '#cffafe' },
  purple: { borderColor: '#7e22ce', color: '#581c87', background: '#f3e8ff' },
};

export interface DashboardStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ElementType;
  accent?: DashboardStatAccent;
  onClick?: () => void;
}

export interface DashboardListItemProps {
  primary: string;
  secondary: string;
  badge?: { label: string; color: DashboardBadgeColor };
  meta?: string;
  riskSummary?: string | null;
  onClick?: () => void;
}

interface DashboardSectionCardProps {
  title: string;
  icon: ElementType;
  children: ReactNode;
  onTitleClick?: () => void;
  headerRight?: ReactNode;
}

export function DemoBanner() {
  const { isCorporate } = useUiTheme();

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2 text-sm',
        isCorporate ? 'border border-amber-400 bg-amber-50 text-amber-950' : undefined,
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

export function DashboardListItem({
  primary,
  secondary,
  badge,
  meta,
  riskSummary,
  onClick,
}: DashboardListItemProps) {
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
            style={isCorporate ? CORPORATE_LIST_BADGE_STYLE[badge.color] : LIST_BADGE_STYLE[badge.color]}
          >
            {badge.label}
          </Badge>
        ) : null}
      </div>
    </Tag>
  );
}

export function DashboardSectionCard({
  title,
  icon: Icon,
  children,
  onTitleClick,
  headerRight,
}: DashboardSectionCardProps) {
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

export function DashboardStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'cyan',
  onClick,
}: DashboardStatCardProps) {
  const { isCorporate } = useUiTheme();
  const spawnAccent = STAT_ACCENT[accent];
  const corporateAccent = CORPORATE_STAT_ACCENT[accent];
  const Tag = onClick ? 'button' : 'div';

  if (isCorporate) {
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'rounded-xl border p-4 flex items-start gap-4 w-full text-left bg-white shadow-sm',
          corporateAccent.card,
          onClick && 'cursor-pointer transition-colors hover:brightness-[0.98]',
        )}
      >
        <div className={cn('rounded-lg border p-2 shrink-0', corporateAccent.iconWrap)}>
          <Icon className={cn('h-5 w-5', corporateAccent.icon)} />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-950">{value}</div>
          <div className="text-sm font-medium text-slate-800">{label}</div>
          {sub ? <div className={cn('text-xs mt-0.5 font-medium', corporateAccent.sub)}>{sub}</div> : null}
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl p-4 flex items-start gap-4 w-full text-left ${onClick ? 'cursor-pointer transition-colors hover:brightness-110' : ''}`}
      style={{ background: spawnAccent.glow, border: `1px solid ${spawnAccent.border}` }}
    >
      <div
        className="rounded-lg p-2 shrink-0"
        style={{ background: spawnAccent.glow, border: `1px solid ${spawnAccent.border}` }}
      >
        <Icon className="h-5 w-5" style={{ color: spawnAccent.icon }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub ? <div className="text-xs mt-0.5" style={{ color: spawnAccent.icon }}>{sub}</div> : null}
      </div>
    </Tag>
  );
}
