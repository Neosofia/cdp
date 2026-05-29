import type { CSSProperties } from 'react';

/** Full width on phones; from sm up, 40vw with at least the former xl sheet width (36rem). */
export const USER_SHEET_CONTENT_CLASS =
  'w-full max-w-[100vw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] bg-slate-950 border-slate-700 text-slate-300 p-0 overflow-y-auto';

export const USER_SHEET_HEADER_CLASS = 'border-b border-slate-700/60 pb-4 mb-0 px-6 pt-6';

export const USER_SHEET_BODY_CLASS = 'px-6 pb-6 pt-4 space-y-5';

export const USER_SHEET_TITLE_CLASS =
  'text-xs font-semibold uppercase tracking-widest';

export const USER_SHEET_TITLE_STYLE: CSSProperties = { color: 'rgba(34,211,238,0.7)' };

export const USER_FIELD_LABEL_CLASS =
  'block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2';

export const USER_INPUT_CLASS = 'bg-slate-800 border-slate-700 text-slate-100';

export const USER_SELECT_CLASS =
  'w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30';

export const USER_PRIMARY_BUTTON_CLASS =
  'flex-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200';
