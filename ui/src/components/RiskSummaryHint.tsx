import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

interface RiskSummaryHintProps {
  summary?: string | null;
  /** Tooltip opens above the icon when the control sits near the bottom of the viewport. */
  placement?: 'above' | 'below';
}

export default function RiskSummaryHint({
  summary,
  placement = 'below',
}: RiskSummaryHintProps) {
  const { isCorporate } = useUiTheme();
  const trimmed = summary?.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <span
      className="relative inline-flex group/summary shrink-0"
      tabIndex={0}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded',
          isCorporate ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-cyan-300',
        )}
        aria-label="AI interaction summary"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </span>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[100] hidden w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border p-3 text-xs leading-relaxed shadow-lg group-hover/summary:block group-focus-within/summary:block',
          placement === 'above' ? 'bottom-full right-0 mb-2' : 'top-full right-0 mt-2',
          isCorporate ? 'border-slate-300 bg-white text-slate-800' : 'text-slate-200',
        )}
        style={
          isCorporate
            ? undefined
            : {
                borderColor: 'rgba(34,211,238,0.25)',
                background: 'rgba(2,6,23,0.98)',
              }
        }
      >
        {trimmed}
      </span>
    </span>
  );
}
