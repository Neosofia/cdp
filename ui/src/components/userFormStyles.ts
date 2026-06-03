import type { CSSProperties } from 'react';

/** Hellspawn shell background and cyan edge glow (matches App / PatientRecords sheets). */
export const USER_SHEET_CONTENT_CLASS =
  'w-full max-w-[100vw] sm:min-w-xl sm:w-[40vw] sm:max-w-[40vw] !bg-[#05050f] !text-slate-300 border-l border-cyan-500/20 p-0 overflow-y-auto shadow-[0_0_40px_rgba(34,211,238,0.08)]';

export const USER_SHEET_TOGGLE_SELECTED_CLASS =
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:text-cyan-200';

export const USER_SHEET_TOGGLE_IDLE_CLASS =
  'text-slate-400 border-slate-700 hover:text-cyan-300 hover:bg-cyan-500/10';

export const USER_SHEET_HEADER_CLASS = 'border-b border-slate-700/60 pb-4 mb-0 px-6 pt-6';

export const USER_SHEET_BODY_CLASS = 'px-6 pb-6 pt-4 space-y-5';

export const USER_SHEET_TITLE_CLASS =
  'text-xs font-semibold uppercase tracking-widest';

export const USER_SHEET_TITLE_STYLE: CSSProperties = { color: 'rgba(34,211,238,0.7)' };

export const USER_FIELD_LABEL_CLASS =
  'block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2';

export const USER_INPUT_CLASS = 'bg-slate-800 border-slate-700 text-slate-100';

export const USER_SELECT_CLASS =
  'w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 [color-scheme:dark]';

export const USER_PRIMARY_BUTTON_CLASS =
  'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.08)] hover:bg-cyan-500/25 hover:text-cyan-100 hover:border-cyan-400/50 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)] disabled:opacity-50';

export const USER_SHEET_CANCEL_BUTTON_CLASS = USER_SHEET_TOGGLE_IDLE_CLASS;
