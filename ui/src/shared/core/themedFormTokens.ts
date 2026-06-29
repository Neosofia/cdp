export type ThemedFormVariant = 'patient' | 'user';

export function themedInputClass(isCorporate: boolean, variant: ThemedFormVariant = 'patient'): string {
  if (isCorporate) {
    return 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-slate-400/30';
  }
  if (variant === 'user') {
    return 'bg-slate-800 border-slate-700 text-slate-100';
  }
  return 'bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20';
}

export function themedSelectClass(isCorporate: boolean, variant: ThemedFormVariant = 'patient'): string {
  if (isCorporate) {
    if (variant === 'user') {
      return 'w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30 [color-scheme:light]';
    }
    return 'border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-400';
  }
  if (variant === 'user') {
    return 'w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 [color-scheme:dark]';
  }
  return 'border-slate-700 bg-slate-900/60 text-slate-200 focus:outline-none focus:border-cyan-500/50';
}
