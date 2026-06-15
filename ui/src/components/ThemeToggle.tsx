import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
  /** Compact header button (default) or full-width profile menu row. */
  variant?: 'button' | 'menuItem';
};

export default function ThemeToggle({ className, variant = 'button' }: ThemeToggleProps) {
  const { isCorporate, toggleMode } = useUiTheme();

  const label = isCorporate ? 'Switch to Spawn mode' : 'Switch to Corporate mode';
  const shortLabel = isCorporate ? 'Spawn mode' : 'Corporate mode';

  if (variant === 'menuItem') {
    return (
      <button
        type="button"
        onClick={toggleMode}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
          isCorporate
            ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400/40'
            : 'text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-200 focus-visible:ring-cyan-500/40',
          className,
        )}
        aria-label={label}
      >
        {isCorporate ? (
          <MoonIcon className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <SunIcon className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span>{shortLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2',
        isCorporate
          ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400/40'
          : 'border-slate-700/80 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 focus-visible:ring-cyan-500/40',
        className,
      )}
      aria-label={label}
      title={shortLabel}
    >
      {isCorporate ? (
        <>
          <MoonIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Spawn</span>
        </>
      ) : (
        <>
          <SunIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Corporate</span>
        </>
      )}
    </button>
  );
}
