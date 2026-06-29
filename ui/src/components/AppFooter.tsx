import { TOS_PREVIEW_PATH } from '@/shared/auth/tosPreview';
import { PLATFORM_FOOTER, useUiTheme } from '@/shared/core/uiTheme';
import { getUiVersion } from '@/shared/core/uiVersion';
import { cn } from '@/shared/core/utils';

type AppFooterProps = {
  className?: string;
  /** Extra trailing line after copyright (splash ticker area). */
  tagline?: string;
  /** Use full viewport width (splash pages). */
  fullWidth?: boolean;
  /** Minimal single-line footer for full-height chat views on small screens. */
  compact?: boolean;
};

export default function AppFooter({
  className,
  tagline,
  fullWidth = false,
  compact = false,
}: AppFooterProps) {
  const { mode, isCorporate } = useUiTheme();

  return (
    <footer
      id="footer"
      className={cn(
        'shrink-0 uppercase',
        compact
          ? 'py-1 text-[10px] tracking-wide md:py-4 md:text-xs md:tracking-widest'
          : 'py-4 text-xs tracking-widest',
        isCorporate ? 'text-slate-700' : 'text-slate-600',
        className,
      )}
    >
      <div
        className={cn(
          'w-full text-center',
          fullWidth ? 'px-6 md:px-10' : 'mx-auto max-w-7xl px-4 md:px-8',
        )}
      >
        {PLATFORM_FOOTER[mode]}
      <span className={isCorporate ? 'text-slate-500' : 'text-slate-700'}> · </span>
      UI {getUiVersion()}
      <span className={isCorporate ? 'text-slate-500' : 'text-slate-700'}> · </span>
      <a
        href={TOS_PREVIEW_PATH}
        className={cn(
          'normal-case tracking-normal underline-offset-2 hover:underline',
          isCorporate
            ? 'text-slate-700 hover:text-slate-900'
            : 'text-cyan-600/90 hover:text-cyan-400',
        )}
      >
        TOS
      </a>
      {tagline ? (
        <>
          <span className={isCorporate ? 'text-slate-500' : 'text-slate-700'}> · </span>
          {tagline}
        </>
      ) : null}
      </div>
    </footer>
  );
}
