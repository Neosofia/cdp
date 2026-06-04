import { TOS_PREVIEW_PATH } from '@/lib/tosPreview';
import { getUiVersion } from '@/lib/uiVersion';
import { cn } from '@/lib/utils';

type AppFooterProps = {
  className?: string;
  /** Extra trailing line after copyright (splash ticker area). */
  tagline?: string;
};

export default function AppFooter({ className, tagline }: AppFooterProps) {
  return (
    <footer
      id="footer"
      className={cn(
        'text-center py-4 text-xs tracking-widest uppercase text-slate-600',
        className,
      )}
    >
      © 2026 SPAWN 2 Clinical Data Platform
      <span className="text-slate-700"> · </span>
      UI {getUiVersion()}
      <span className="text-slate-700"> · </span>
      <a
        href={TOS_PREVIEW_PATH}
        className="normal-case tracking-normal text-cyan-600/90 underline-offset-2 hover:text-cyan-400 hover:underline"
      >
        TOS
      </a>
      {tagline ? (
        <>
          <span className="text-slate-700"> · </span>
          {tagline}
        </>
      ) : null}
    </footer>
  );
}
