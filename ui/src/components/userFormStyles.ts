import type { CSSProperties } from 'react';
import { useUiTheme } from '@/shared/core/uiTheme';
import { themedInputClass, themedSelectClass } from '@/shared/core/themedFormTokens';
import { cn } from '@/shared/core/utils';

const CORPORATE_SOLID_BUTTON_CLASS =
  '!border-slate-900 !bg-slate-900 !text-white hover:!border-slate-800 hover:!bg-slate-800 hover:!text-white';

export function useUserFormStyles() {
  const { isCorporate } = useUiTheme();

  if (isCorporate) {
    return {
      isCorporate,
      sheetContentClass:
        'w-full min-w-0 max-w-[100dvw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] !bg-white !opacity-100 text-slate-900 border-l border-slate-200 p-0 overflow-hidden shadow-lg flex flex-col min-h-0',
      sheetToggleSelectedClass: CORPORATE_SOLID_BUTTON_CLASS,
      sheetToggleIdleClass:
        '!border-slate-300 !bg-white !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900',
      sheetHeaderClass:
        'shrink-0 bg-white border-b border-slate-200 pb-4 mb-0 px-5 pt-6 pr-14 sm:px-6 sm:pt-6 sm:pr-6',
      sheetBodyClass:
        'flex-1 min-h-0 overflow-y-auto bg-white px-5 pb-5 pt-5 space-y-5 sm:px-6 sm:pb-6 sm:pt-4',
      sheetFooterActionsClass:
        'shrink-0 border-t border-slate-200 bg-white px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col-reverse gap-3 sm:px-6 sm:py-4 sm:pb-4 sm:flex-row sm:items-center sm:border-0 sm:pt-2',
      sheetPrimaryActionClass: 'w-full sm:w-auto',
      sheetTitleClass: 'text-xs font-semibold uppercase tracking-wide break-words sm:tracking-widest',
      sheetTitleStyle: { color: '#0f172a' } satisfies CSSProperties,
      fieldLabelClass: 'block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2',
      inputClass: themedInputClass(true, 'user'),
      selectClass: themedSelectClass(true, 'user'),
      primaryButtonClass: `${CORPORATE_SOLID_BUTTON_CLASS} disabled:opacity-50`,
      sheetCancelButtonClass:
        '!border-slate-300 !bg-white !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900',
      mutedTextClass: 'text-slate-600',
      bodyTextClass: 'text-slate-900',
      monoMutedClass: 'font-mono text-xs text-slate-600 break-all',
      pickerSelectedBoxClass: 'rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5',
      pickerSelectedTitleClass: 'text-sm font-medium text-slate-900',
      pickerSelectedSubClass: 'text-xs text-slate-600 mt-0.5',
      pickerSelectedEmrClass: 'font-mono text-slate-700',
      pickerClearButtonClass: 'shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      pickerListClass:
        'max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-200',
      pickerProcedureListClass:
        'max-h-40 sm:max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-200',
      pickerGroupTitleClass: 'text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2',
      pickerItemClass: (checked: boolean) =>
        cn(
          'flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
          checked
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        ),
      pickerProcedureItemClass: (checked: boolean) =>
        cn(
          'w-full text-left rounded-md border px-3 py-2 transition-colors',
          checked
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        ),
      pickerItemLabelClass: 'block text-sm text-slate-900',
      pickerItemSubClass: 'block text-[11px] font-mono text-slate-500 truncate',
      pickerItemMetaClass: 'block text-[11px] text-slate-600 mt-0.5',
      pickerItemMetaMonoClass: 'font-mono text-slate-500',
      pickerCheckboxClass:
        'mt-1 size-4 rounded border-slate-400 bg-white text-slate-900 focus:ring-slate-400/40',
      pickerChipClass:
        'inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-800',
      pickerChipRemoveClass: 'rounded p-0.5 hover:bg-slate-200 text-slate-600',
      pickerEmptyClass: 'text-sm text-slate-500 rounded-md border border-slate-200 bg-slate-50 px-3 py-2',
      pickerFooterClass: 'text-[11px] text-slate-500',
      datePickerTriggerClass:
        'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none hover:border-slate-400 hover:bg-slate-50 focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-400/25 data-popup-open:border-slate-500 data-popup-open:ring-2 data-popup-open:ring-slate-400/20',
      datePickerIconClass: 'size-4 shrink-0 text-slate-500',
      datePickerPopoverClass:
        'w-auto overflow-hidden border border-slate-200 bg-white p-0 text-slate-900 shadow-lg ring-0',
    };
  }

  return {
    isCorporate,
    sheetContentClass:
      'w-full min-w-0 max-w-[100dvw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] !bg-[#05050f] !opacity-100 !text-slate-300 border-l border-cyan-500/20 p-0 overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.08)] flex flex-col min-h-0',
    sheetToggleSelectedClass:
      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:text-cyan-200',
    sheetToggleIdleClass: 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:bg-cyan-500/10',
    sheetHeaderClass:
      'shrink-0 bg-[#05050f] border-b border-slate-700/60 pb-4 mb-0 px-5 pt-6 pr-14 sm:px-6 sm:pt-6 sm:pr-6',
    sheetBodyClass:
      'flex-1 min-h-0 overflow-y-auto bg-[#05050f] px-5 pb-5 pt-5 space-y-5 sm:px-6 sm:pb-6 sm:pt-4',
    sheetFooterActionsClass:
      'shrink-0 border-t border-slate-700/60 bg-[#05050f] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col-reverse gap-3 sm:px-6 sm:py-4 sm:pb-4 sm:flex-row sm:items-center sm:border-0 sm:pt-2',
    sheetPrimaryActionClass: 'w-full sm:w-auto',
    sheetTitleClass: 'text-xs font-semibold uppercase tracking-wide break-words sm:tracking-widest',
    sheetTitleStyle: { color: 'rgba(34,211,238,0.7)' } satisfies CSSProperties,
    fieldLabelClass: 'block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2',
    inputClass: themedInputClass(false, 'user'),
    selectClass: themedSelectClass(false, 'user'),
    primaryButtonClass:
      'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.08)] hover:bg-cyan-500/25 hover:text-cyan-100 hover:border-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)] disabled:opacity-50',
    sheetCancelButtonClass: 'text-slate-400 border-slate-700 hover:text-cyan-300 hover:bg-cyan-500/10',
    mutedTextClass: 'text-slate-500',
    bodyTextClass: 'text-slate-200',
    monoMutedClass: 'font-mono text-xs text-slate-400 break-all',
    pickerSelectedBoxClass: 'rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2.5',
    pickerSelectedTitleClass: 'text-sm font-medium text-slate-100',
    pickerSelectedSubClass: 'text-xs text-slate-400 mt-0.5',
    pickerSelectedEmrClass: 'font-mono text-cyan-400/90',
    pickerClearButtonClass: 'shrink-0 rounded p-1 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200',
    pickerListClass:
      'max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800',
    pickerProcedureListClass:
      'max-h-40 sm:max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800',
    pickerGroupTitleClass: 'text-[10px] font-semibold uppercase tracking-widest text-cyan-500/70 mb-2',
    pickerItemClass: (checked: boolean) =>
      cn(
        'flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
        checked
          ? 'border-cyan-500/50 bg-cyan-950/40'
          : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
      ),
    pickerProcedureItemClass: (checked: boolean) =>
      cn(
        'w-full text-left rounded-md border px-3 py-2 transition-colors',
        checked
          ? 'border-cyan-500/50 bg-cyan-950/40'
          : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
      ),
    pickerItemLabelClass: 'block text-sm text-slate-100',
    pickerItemSubClass: 'block text-[11px] font-mono text-slate-500 truncate',
    pickerItemMetaClass: 'block text-[11px] text-slate-500 mt-0.5',
    pickerItemMetaMonoClass: 'font-mono text-slate-400',
    pickerCheckboxClass:
      'mt-1 size-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40',
    pickerChipClass:
      'inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-xs text-cyan-200',
    pickerChipRemoveClass: 'rounded p-0.5 hover:bg-cyan-500/20 text-cyan-400/80',
    pickerEmptyClass: 'text-sm text-slate-500 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2',
    pickerFooterClass: 'text-[11px] text-slate-500',
    datePickerTriggerClass:
      'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none hover:border-cyan-500/40 hover:bg-slate-900 focus-visible:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500/25 data-popup-open:border-cyan-500/40 data-popup-open:ring-2 data-popup-open:ring-cyan-500/20',
    datePickerIconClass: 'size-4 shrink-0 text-cyan-400/80',
    datePickerPopoverClass:
      'w-auto overflow-hidden border border-cyan-500/25 bg-[#05050f] p-0 text-slate-200 shadow-[0_0_32px_rgba(34,211,238,0.12)] ring-0',
  };
}
