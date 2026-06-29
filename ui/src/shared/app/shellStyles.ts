import type { CSSProperties } from 'react';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

export function useShellStyles() {
  const { isCorporate } = useUiTheme();

  const navLinkStateClass = (active: boolean) =>
    isCorporate
      ? active
        ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300 shadow-sm'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      : active
        ? 'text-cyan-300 bg-cyan-500/10'
        : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/5';

  const mainNavLinkClass = (active: boolean) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors',
      navLinkStateClass(active),
    );

  const mobileNavLinkClass = (active: boolean) =>
    cn(
      'w-full justify-start rounded-xl px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors',
      isCorporate
        ? active
          ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        : active
          ? 'text-cyan-300 bg-cyan-500/10'
          : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300',
    );

  const profileMenuSeparatorClass = isCorporate ? 'bg-slate-200' : undefined;

  const profileMenuSeparatorStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { background: 'rgba(34,211,238,0.12)' };

  const menuTriggerClass = isCorporate
    ? '!bg-transparent !text-slate-600 hover:!bg-slate-100 hover:!text-slate-900 data-[state=open]:!bg-slate-100 data-[state=open]:!text-slate-900 data-open:!bg-slate-100 data-open:!text-slate-900 text-sm font-semibold tracking-wide uppercase'
    : 'bg-transparent text-slate-400 hover:text-cyan-300 data-open:text-cyan-300 text-sm font-semibold tracking-wide uppercase';

  const menuContentClass = cn(
    'min-w-48 rounded-2xl p-2 shadow-2xl',
    isCorporate && '!border !border-slate-200 !bg-white !text-slate-700 !shadow-lg !ring-slate-200',
  );

  const menuContentStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: '#05050f',
        border: '1px solid rgba(34,211,238,0.18)',
        boxShadow: '0 0 40px rgba(34,211,238,0.08)',
      };

  const menuItemButtonClass = isCorporate
    ? 'w-full justify-start rounded-xl px-3 py-2 text-sm !text-slate-700 hover:!bg-slate-100 hover:!text-slate-900'
    : 'w-full justify-start rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300';

  const breadcrumbLinkClass = isCorporate
    ? 'text-slate-500 hover:text-slate-900'
    : 'text-slate-500 hover:text-cyan-400';

  return {
    isCorporate,
    mainNavLinkClass,
    mobileNavLinkClass,
    menuTriggerClass,
    menuContentClass,
    menuContentStyle,
    menuItemButtonClass,
    breadcrumbLinkClass,
    profileMenuSeparatorClass,
    profileMenuSeparatorStyle,
  };
}
