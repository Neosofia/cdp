import type { CSSProperties } from 'react';
import { useUiTheme } from '@/lib/uiTheme';
import { themedInputClass, themedSelectClass } from '@/lib/themedFormTokens';
import { cn } from '@/lib/utils';

export function useUserFormStyles() {
  const { isCorporate } = useUiTheme();

  const corporateSolidButtonClass =
    '!border-slate-900 !bg-slate-900 !text-white hover:!border-slate-800 hover:!bg-slate-800 hover:!text-white';

  return {
    isCorporate,
    sheetContentClass: isCorporate
      ? 'w-full max-w-[100vw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] !bg-white text-slate-900 border-l border-slate-200 p-0 overflow-y-auto shadow-lg'
      : 'w-full max-w-[100vw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] !bg-[#05050f] !text-slate-300 border-l border-cyan-500/20 p-0 overflow-y-auto shadow-[0_0_40px_rgba(34,211,238,0.08)]',
    sheetToggleSelectedClass: isCorporate
      ? corporateSolidButtonClass
      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:text-cyan-200',
    sheetToggleIdleClass: isCorporate
      ? '!border-slate-300 !bg-white !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900'
      : 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:bg-cyan-500/10',
    sheetHeaderClass: isCorporate
      ? 'border-b border-slate-200 pb-4 mb-0 px-6 pt-6'
      : 'border-b border-slate-700/60 pb-4 mb-0 px-6 pt-6',
    sheetBodyClass: 'px-6 pb-6 pt-4 space-y-5',
    sheetTitleClass: 'text-xs font-semibold uppercase tracking-widest',
    sheetTitleStyle: isCorporate
      ? ({ color: '#0f172a' } satisfies CSSProperties)
      : ({ color: 'rgba(34,211,238,0.7)' } satisfies CSSProperties),
    fieldLabelClass: isCorporate
      ? 'block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2'
      : 'block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2',
    inputClass: themedInputClass(isCorporate, 'user'),
    selectClass: themedSelectClass(isCorporate, 'user'),
    primaryButtonClass: isCorporate
      ? `${corporateSolidButtonClass} disabled:opacity-50`
      : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.08)] hover:bg-cyan-500/25 hover:text-cyan-100 hover:border-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)] disabled:opacity-50',
    sheetCancelButtonClass: isCorporate
      ? '!border-slate-300 !bg-white !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900'
      : 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:bg-cyan-500/10',
    mutedTextClass: isCorporate ? 'text-slate-600' : 'text-slate-500',
    bodyTextClass: isCorporate ? 'text-slate-900' : 'text-slate-200',
    monoMutedClass: isCorporate ? 'font-mono text-xs text-slate-600 break-all' : 'font-mono text-xs text-slate-400 break-all',
    pickerSelectedBoxClass: isCorporate
      ? 'rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5'
      : 'rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2.5',
    pickerSelectedTitleClass: isCorporate ? 'text-sm font-medium text-slate-900' : 'text-sm font-medium text-slate-100',
    pickerSelectedSubClass: isCorporate ? 'text-xs text-slate-600 mt-0.5' : 'text-xs text-slate-400 mt-0.5',
    pickerSelectedEmrClass: isCorporate ? 'font-mono text-slate-700' : 'font-mono text-cyan-400/90',
    pickerClearButtonClass: isCorporate
      ? 'shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      : 'shrink-0 rounded p-1 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200',
    pickerListClass: isCorporate
      ? 'max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-200'
      : 'max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800',
    pickerProcedureListClass: isCorporate
      ? 'max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-200'
      : 'max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800',
    pickerGroupTitleClass: isCorporate
      ? 'text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2'
      : 'text-[10px] font-semibold uppercase tracking-widest text-cyan-500/70 mb-2',
    pickerItemClass: (checked: boolean) =>
      cn(
        'flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
        isCorporate
          ? checked
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          : checked
            ? 'border-cyan-500/50 bg-cyan-950/40'
            : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
      ),
    pickerProcedureItemClass: (checked: boolean) =>
      cn(
        'w-full text-left rounded-md border px-3 py-2 transition-colors',
        isCorporate
          ? checked
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          : checked
            ? 'border-cyan-500/50 bg-cyan-950/40'
            : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
      ),
    pickerItemLabelClass: isCorporate ? 'block text-sm text-slate-900' : 'block text-sm text-slate-100',
    pickerItemSubClass: isCorporate ? 'block text-[11px] font-mono text-slate-500 truncate' : 'block text-[11px] font-mono text-slate-500 truncate',
    pickerItemMetaClass: isCorporate ? 'block text-[11px] text-slate-600 mt-0.5' : 'block text-[11px] text-slate-500 mt-0.5',
    pickerItemMetaMonoClass: isCorporate ? 'font-mono text-slate-500' : 'font-mono text-slate-400',
    pickerCheckboxClass: isCorporate
      ? 'mt-1 size-4 rounded border-slate-400 bg-white text-slate-900 focus:ring-slate-400/40'
      : 'mt-1 size-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40',
    pickerChipClass: isCorporate
      ? 'inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-800'
      : 'inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-xs text-cyan-200',
    pickerChipRemoveClass: isCorporate
      ? 'rounded p-0.5 hover:bg-slate-200 text-slate-600'
      : 'rounded p-0.5 hover:bg-cyan-500/20 text-cyan-400/80',
    pickerEmptyClass: isCorporate
      ? 'text-sm text-slate-500 rounded-md border border-slate-200 bg-slate-50 px-3 py-2'
      : 'text-sm text-slate-500 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2',
    pickerFooterClass: isCorporate ? 'text-[11px] text-slate-500' : 'text-[11px] text-slate-500',
    datePickerTriggerClass: isCorporate
      ? 'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none hover:border-slate-400 hover:bg-slate-50 focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-400/25 data-popup-open:border-slate-500 data-popup-open:ring-2 data-popup-open:ring-slate-400/20'
      : 'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none hover:border-cyan-500/40 hover:bg-slate-900 focus-visible:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500/25 data-popup-open:border-cyan-500/40 data-popup-open:ring-2 data-popup-open:ring-cyan-500/20',
    datePickerIconClass: isCorporate ? 'size-4 shrink-0 text-slate-500' : 'size-4 shrink-0 text-cyan-400/80',
    datePickerPopoverClass: isCorporate
      ? 'w-auto overflow-hidden border border-slate-200 bg-white p-0 text-slate-900 shadow-lg ring-0'
      : 'w-auto overflow-hidden border border-cyan-500/25 bg-[#05050f] p-0 text-slate-200 shadow-[0_0_32px_rgba(34,211,238,0.12)] ring-0',
  };
}
