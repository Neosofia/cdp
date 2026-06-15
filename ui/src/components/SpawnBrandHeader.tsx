import type { ReactNode } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

type SpawnBrandHeaderProps = {
  className?: string;
  /** Trailing header actions (e.g. Login on splash). */
  trailing?: ReactNode;
  showThemeToggle?: boolean;
};

export default function SpawnBrandHeader({
  className,
  trailing,
  showThemeToggle = true,
}: SpawnBrandHeaderProps) {
  return (
    <header
      className={cn(
        'relative z-10 shrink-0 flex items-center justify-between px-6 md:px-10 py-4 border-b border-white/6',
        className,
      )}
    >
      <a
        href="/"
        className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
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
      {showThemeToggle || trailing ? (
        <div className="flex items-center gap-3">
          {showThemeToggle ? (
            <ThemeToggle
              alwaysShowLabel
              className="border-cyan-400/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
            />
          ) : null}
          {trailing}
        </div>
      ) : null}
    </header>
  );
}
