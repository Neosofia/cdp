import type { ReactNode } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { beginLogin } from '@/shared/auth/auth';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

const SPLASH_HEADER_PAD = 'px-6 py-4 md:px-10';
const SPLASH_ACTIONS_CLASS = 'flex shrink-0 items-center gap-3';

type SplashPageHeaderProps = {
  trailing: ReactNode;
};

function SpawnBrandMark() {
  return (
    <a
      href="/"
      className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      aria-label="SPAWN Clinical Data Platform home"
    >
      <img src="/favicon.svg?v=2" alt="" className="h-7 w-7" aria-hidden="true" />
      <span
        className="text-xl font-black uppercase tracking-wider"
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
      <span className="rounded border border-slate-600 px-1.5 py-0.5 text-sm font-semibold uppercase tracking-widest text-slate-400">
        v2
      </span>
      <span className="ml-1 hidden text-xs uppercase tracking-widest text-slate-600 sm:block">
        Clinical Data Platform
      </span>
    </a>
  );
}

function CorporateBrandMark() {
  return (
    <a
      href="/"
      className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
      aria-label="Post Discharge Care Platform home"
    >
      <img src="/favicon.svg?v=2" alt="" className="h-7 w-7" aria-hidden="true" />
      <span className="text-base font-semibold tracking-tight text-slate-900 md:text-lg">
        Post Discharge Care Platform
      </span>
    </a>
  );
}

export default function SplashPageHeader({ trailing }: SplashPageHeaderProps) {
  const { isCorporate } = useUiTheme();

  return (
    <header
      className={cn(
        'relative z-10 w-full shrink-0 border-b',
        isCorporate ? 'border-slate-200 bg-white/95' : 'border-white/6',
      )}
    >
      <div
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4',
          SPLASH_HEADER_PAD,
        )}
      >
        {isCorporate ? <CorporateBrandMark /> : <SpawnBrandMark />}
        <div className={SPLASH_ACTIONS_CLASS}>
          <ThemeToggle
            alwaysShowLabel
            className={
              isCorporate
                ? 'min-w-[8.25rem] justify-center'
                : 'min-w-[8.25rem] justify-center border-cyan-400/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
            }
          />
          {trailing}
        </div>
      </div>
    </header>
  );
}

export const splashLoginButtonClass = (isCorporate: boolean) =>
  cn(
    'inline-flex h-9 min-w-[7.25rem] items-center justify-center rounded-md text-sm font-semibold transition-colors',
    isCorporate
      ? 'bg-slate-900 px-5 text-white hover:bg-slate-800'
      : 'gap-2 rounded-lg px-5 font-bold uppercase tracking-wider text-white transition-all duration-200 hover:scale-105',
  );

type SplashLoginButtonProps = {
  isCorporate: boolean;
};

export function SplashLoginButton({ isCorporate }: SplashLoginButtonProps) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        beginLogin();
      }}
      className={splashLoginButtonClass(isCorporate)}
      style={
        isCorporate
          ? undefined
          : {
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }
      }
    >
      {isCorporate ? (
        'Sign In'
      ) : (
        <>
          <span>⚡</span> Login
        </>
      )}
    </a>
  );
}
