import type { ReactNode } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

type AppBrandHeaderProps = {
  className?: string;
  trailing?: ReactNode;
  showThemeToggle?: boolean;
};

export default function AppBrandHeader({
  className,
  trailing,
  showThemeToggle = true,
}: AppBrandHeaderProps) {
  const { isCorporate } = useUiTheme();

  const trailingContent = (
    <>
      {showThemeToggle ? <ThemeToggle /> : null}
      {trailing}
    </>
  );

  if (isCorporate) {
    return (
      <header
        className={cn(
          'relative z-10 shrink-0 border-b border-slate-200 bg-white/95',
          className,
        )}
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 md:px-8">
          <a
            href="/"
            className="flex min-w-0 items-center gap-3 justify-self-start rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
            aria-label="Post Discharge Care Platform home"
          >
            <img src="/favicon.svg?v=2" alt="" className="w-7 h-7" aria-hidden="true" />
            <span className="text-base md:text-lg font-semibold tracking-tight text-slate-900">
              Post Discharge Care Platform
            </span>
          </a>
          {trailingContent ? (
            <div className="flex shrink-0 items-center gap-3 justify-self-end">{trailingContent}</div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        'relative z-10 shrink-0 border-b border-white/6',
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 md:px-8">
        <a
          href="/"
          className="flex min-w-0 items-center gap-3 justify-self-start rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          aria-label="SPAWN Clinical Data Platform home"
        >
        <img src="/favicon.svg?v=2" alt="" className="w-7 h-7" aria-hidden="true" />
        <span
          className="text-xl font-black tracking-wider uppercase"
          style={{
            fontFamily: "'Orbitron', monospace",
            background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SPAWN
        </span>
        <span className="text-sm font-semibold text-slate-400 tracking-widest uppercase border border-slate-600 rounded px-1.5 py-0.5">
          v2
        </span>
        <span className="hidden sm:block text-xs text-slate-600 tracking-widest uppercase ml-1">
          Clinical Data Platform
        </span>
      </a>
      {trailingContent ? (
        <div className="flex shrink-0 items-center gap-3 justify-self-end">{trailingContent}</div>
      ) : null}
      </div>
    </header>
  );
}
