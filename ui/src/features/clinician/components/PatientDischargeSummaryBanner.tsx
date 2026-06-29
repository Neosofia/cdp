import { ClockIcon } from '@heroicons/react/24/outline';
import { formatHistoryClosedAt } from '@/features/clinician/lib/clinicianEpisodeHistory';
import type { CareEpisodeHistoryEntry } from '@/shared/care-episode/careEpisodeApi';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export default function PatientDischargeSummaryBanner({
  entry,
}: {
  entry: CareEpisodeHistoryEntry;
}) {
  const pv = usePatientViewStyles();

  return (
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
        {entry.closed_at ? (
          <span className={pv.mutedText}>
            Closed {formatHistoryClosedAt(entry.closed_at)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
