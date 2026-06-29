import {
  ArchiveBoxXMarkIcon,
  ArrowPathIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import RiskSummaryHint from '@/features/clinician/components/RiskSummaryHint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export default function PatientSessionHeader({
  patient,
  headerDaysPostOp,
  headerRisk,
  headerEpisodeClosed,
  episodeStatus,
  showLifecycleActions,
  lifecycleBusy,
  onCloseEpisode,
  onReopenEpisode,
  onNewEpisode,
}: {
  patient: ActivePatientRecovery;
  headerDaysPostOp: number;
  headerRisk: 'High' | 'Medium' | 'Low';
  headerEpisodeClosed: boolean;
  episodeStatus: string;
  showLifecycleActions: boolean;
  lifecycleBusy: boolean;
  onCloseEpisode: () => void;
  onReopenEpisode: () => void;
  onNewEpisode: () => void;
}) {
  const pv = usePatientViewStyles();

  return (
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
          <span className={cn('hidden sm:inline text-[10px] uppercase tracking-wide', pv.subText)}>
            {patient.tenantName}
          </span>
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
              onClick={onNewEpisode}
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
              onClick={onCloseEpisode}
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
              onClick={onReopenEpisode}
              className={pv.outlineButton}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1.5" />
              Reopen episode
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
