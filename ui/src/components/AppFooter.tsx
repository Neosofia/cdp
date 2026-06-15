import { TOS_PREVIEW_PATH } from '@/lib/tosPreview';
import { PLATFORM_FOOTER, useUiTheme } from '@/lib/uiTheme';
import { getUiVersion } from '@/lib/uiVersion';
import { cn } from '@/lib/utils';

type AppFooterProps = {
  className?: string;
  /** Extra trailing line after copyright (splash ticker area). */
  tagline?: string;
};

export default function AppFooter({ className, tagline }: AppFooterProps) {
  const { mode, isCorporate } = useUiTheme();

  return (
    <footer
      id="footer"
      className={cn(
        'shrink-0 py-4 text-xs tracking-widest uppercase',
        isCorporate ? 'text-slate-700' : 'text-slate-600',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 text-center md:px-8">
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
