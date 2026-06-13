import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface RiskSummaryHintProps {
  summary?: string | null;
}

export default function RiskSummaryHint({ summary }: RiskSummaryHintProps) {
  const trimmed = summary?.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <span
      className="relative inline-flex group/summary shrink-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-cyan-300"
        aria-label="Risk thread summary"
      >
        <DocumentTextIcon className="h-4 w-4" />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border p-3 text-xs leading-relaxed text-slate-200 shadow-lg group-hover/summary:block"
        style={{
          borderColor: 'rgba(34,211,238,0.25)',
          background: 'rgba(2,6,23,0.98)',
        }}
      >
        {trimmed}
      </span>
    </span>
  );
}
