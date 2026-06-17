import type { CSSProperties } from 'react';
import { useUiTheme } from '@/lib/uiTheme';
import { themedInputClass, themedSelectClass } from '@/lib/themedFormTokens';
import { cn } from '@/lib/utils';

export type RecordType = 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy';

const SPAWN_TYPE_BADGE: Record<RecordType, CSSProperties> = {
  Lab: { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  Visit: { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
  Rx: { borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
  Imaging: { borderColor: 'rgba(234,179,8,0.4)', color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  Procedure: { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  Allergy: { borderColor: 'rgba(251,146,60,0.4)', color: '#fb923c', background: 'rgba(251,146,60,0.08)' },
};

const CORPORATE_TYPE_BADGE: Record<RecordType, CSSProperties> = {
  Lab: { borderColor: '#0e7490', color: '#164e63', background: '#cffafe' },
  Visit: { borderColor: '#7e22ce', color: '#581c87', background: '#f3e8ff' },
  Rx: { borderColor: '#15803d', color: '#14532d', background: '#dcfce7' },
  Imaging: { borderColor: '#a16207', color: '#713f12', background: '#fef9c3' },
  Procedure: { borderColor: '#b91c1c', color: '#7f1d1d', background: '#fee2e2' },
  Allergy: { borderColor: '#c2410c', color: '#7c2d12', background: '#ffedd5' },
};

type RiskLevel = 'High' | 'Medium' | 'Low';

const SPAWN_RISK_BADGE: Record<RiskLevel, CSSProperties> = {
  High: { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  Medium: { borderColor: 'rgba(234,179,8,0.4)', color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  Low: { borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
};

const CORPORATE_RISK_BADGE: Record<RiskLevel, CSSProperties> = {
  High: { borderColor: '#b91c1c', color: '#7f1d1d', background: '#fee2e2' },
  Medium: { borderColor: '#a16207', color: '#713f12', background: '#fef9c3' },
  Low: { borderColor: '#15803d', color: '#14532d', background: '#dcfce7' },
};

export function usePatientViewStyles() {
  const { isCorporate } = useUiTheme();

  const cardStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: 'rgba(5,5,15,0.7)',
        border: '1px solid rgba(34,211,238,0.18)',
        boxShadow: '0 0 40px rgba(34,211,238,0.05)',
      };

  const headerStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        borderBottom: '1px solid rgba(34,211,238,0.12)',
        background: 'rgba(34,211,238,0.03)',
      };

  const titleStyle: CSSProperties | undefined = isCorporate ? undefined : { color: '#22d3ee' };

  const titleEmbeddedStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { color: 'rgba(34,211,238,0.8)' };

  const formFooterStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        borderColor: 'rgba(34,211,238,0.12)',
        background: 'rgba(34,211,238,0.02)',
      };

  const listBorderStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { border: '1px solid rgba(34,211,238,0.12)' };

  const listDivideStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { borderColor: 'rgba(34,211,238,0.08)' };

  const detailPanelStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: 'rgba(34,211,238,0.04)',
        border: '1px solid rgba(34,211,238,0.15)',
      };

  const imageFrameStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: '#0f172a',
        border: '1px solid rgba(34,211,238,0.15)',
      };

  const sheetStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: '#05050f',
        borderLeft: '1px solid rgba(34,211,238,0.18)',
      };

  const sidebarStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: 'rgba(5,5,15,0.85)',
        borderLeft: '1px solid rgba(34,211,238,0.12)',
      };

  const conversationsPanelStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: 'rgba(5,5,15,0.92)',
        borderColor: 'rgba(34,211,238,0.18)',
      };

  const conversationsPanelHeaderStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { borderColor: 'rgba(34,211,238,0.12)' };

  const alertStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : {
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.22)',
      };

  const sendButtonStyle: CSSProperties | undefined = isCorporate
    ? undefined
    : { background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)' };

  return {
    isCorporate,
    cardClass: isCorporate
      ? '!bg-white !text-slate-900 border border-slate-300 shadow-sm !ring-slate-300'
      : '',
    cardStyle,
    chatLayoutClass: 'flex h-full min-h-0 w-full gap-3 p-3',
    chatCardClass: isCorporate
      ? '!rounded-lg !ring-0 !bg-white border border-slate-200 shadow-sm gap-0 py-0'
      : '!rounded-lg !ring-0 gap-0 py-0',
    chatCardHeaderClass: isCorporate
      ? '!rounded-t-lg border-b border-slate-200 bg-slate-50 py-4 shrink-0'
      : 'border-b py-4 shrink-0',
    chatCardFooterClass: isCorporate
      ? '!rounded-b-lg border-t border-slate-200 bg-slate-50'
      : 'border-t',
    headerClass: isCorporate ? 'border-b border-slate-200 bg-slate-50' : '',
    headerStyle,
    titleClass: isCorporate ? 'text-slate-800' : '',
    titleStyle,
    titleEmbeddedClass: isCorporate ? 'text-slate-800' : '',
    titleEmbeddedStyle,
    inputClass: themedInputClass(isCorporate, 'patient'),
    selectClass: themedSelectClass(isCorporate, 'patient'),
    mutedText: isCorporate ? 'text-slate-600' : 'text-slate-400',
    bodyText: isCorporate ? 'text-slate-950' : 'text-slate-100',
    subText: isCorporate ? 'text-slate-600' : 'text-slate-500',
    rowHover: isCorporate ? 'hover:bg-slate-50' : 'hover:bg-cyan-500/5',
    rowSelected: isCorporate ? 'bg-slate-100' : 'bg-cyan-500/10',
    outlineButton: isCorporate
      ? '!border-slate-300 !bg-white !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900'
      : 'border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100',
    ghostButton: isCorporate
      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10',
    formFooterClass: isCorporate ? 'border-t border-slate-200 bg-slate-50' : 'border-t',
    formFooterStyle,
    sendButtonClass: isCorporate
      ? '!border-slate-900 !bg-slate-900 !text-white hover:!border-slate-800 hover:!bg-slate-800 hover:!text-white shrink-0'
      : 'shrink-0 text-white',
    sendButtonStyle,
    listBorderClass: isCorporate ? 'border border-slate-200 rounded-xl divide-slate-200' : 'rounded-xl divide-y',
    listBorderStyle,
    listDivideClass: isCorporate ? 'divide-slate-200' : 'divide-y',
    listDivideStyle,
    detailPanelClass: isCorporate ? 'rounded-lg border border-slate-200 bg-slate-50' : 'rounded-lg',
    detailPanelStyle,
    imageFrameClass: isCorporate ? 'rounded-lg overflow-hidden border border-slate-200 bg-slate-100' : 'rounded-lg overflow-hidden',
    imageFrameStyle,
    sheetClass: isCorporate ? 'bg-white text-slate-900 border-l border-slate-200' : 'text-slate-200',
    sheetStyle,
    sidebarClass: isCorporate ? 'border-l border-slate-200 !bg-slate-50' : '',
    sidebarStyle,
    conversationsPanelWrapClass: 'shrink-0 w-64 flex min-h-0 flex-col self-stretch',
    conversationsPanelClass: isCorporate
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'
      : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border',
    conversationsPanelStyle,
    conversationsPanelHeaderClass: isCorporate
      ? 'shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-3'
      : 'shrink-0 border-b px-3 py-3',
    conversationsPanelHeaderStyle,
    conversationsPanelNavClass: 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 space-y-1.5',
    alertClass: isCorporate ? 'border border-amber-300 bg-amber-50' : 'rounded-xl',
    alertStyle,
    alertText: isCorporate ? 'text-amber-950' : 'text-amber-100/90',
    listScrollClass: isCorporate ? 'bg-white' : '',
    filterTriggerClass: isCorporate
      ? 'inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:border-slate-400 data-popup-open:border-slate-500'
      : 'inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-200 hover:border-slate-500 data-popup-open:border-cyan-500/40',
    filterMenuClass: isCorporate
      ? 'min-w-36 rounded-lg border border-slate-200 bg-white p-1 text-slate-900 shadow-lg'
      : 'min-w-36 rounded-lg border border-slate-700 bg-slate-950 p-1 text-slate-200 shadow-lg',
    filterMenuItemClass: (selected: boolean) =>
      cn(
        'cursor-pointer rounded-md px-2 py-1.5 text-xs',
        isCorporate
          ? selected
            ? 'bg-slate-100 text-slate-900 focus:bg-slate-100 focus:text-slate-900'
            : 'text-slate-700 focus:bg-slate-50 focus:text-slate-900'
          : selected
            ? 'bg-cyan-500/15 text-cyan-200 focus:bg-cyan-500/10 focus:text-cyan-200'
            : 'text-slate-300 focus:bg-cyan-500/10 focus:text-cyan-200',
      ),
    filterLabelClass: isCorporate ? 'text-slate-500' : 'text-slate-500',
    filterValueClass: isCorporate ? 'max-w-[5.5rem] truncate text-slate-900' : 'max-w-[5.5rem] truncate text-slate-200',
    demoBadgeStyle: isCorporate
      ? { borderColor: '#0e7490', color: '#164e63', background: '#cffafe' }
      : { borderColor: 'rgba(34,211,238,0.5)', color: '#22d3ee', background: 'rgba(34,211,238,0.12)' },
    riskBadge: (level: RiskLevel) => (isCorporate ? CORPORATE_RISK_BADGE[level] : SPAWN_RISK_BADGE[level]),
    recordTypeBadge: (type: RecordType) =>
      isCorporate ? CORPORATE_TYPE_BADGE[type] : SPAWN_TYPE_BADGE[type],
    chatBubbleUser: (): CSSProperties | undefined =>
      isCorporate
        ? undefined
        : {
            background: 'linear-gradient(135deg, rgba(34,211,238,0.35) 0%, rgba(168,85,247,0.35) 100%)',
            border: '1px solid rgba(34,211,238,0.25)',
          },
    chatBubbleUserClass: isCorporate
      ? 'chat-bubble-user !bg-slate-800 !text-white !border !border-slate-700'
      : 'chat-bubble-user text-white',
    chatScrollClass: isCorporate ? 'bg-white' : '',
    unavailableBadgeClass: isCorporate
      ? 'text-amber-900 border border-amber-300 bg-amber-50'
      : 'text-amber-200/90 border border-amber-500/30 bg-amber-500/10',
    careTeamBadgeClass: isCorporate
      ? 'text-sky-900 bg-sky-50 border border-sky-200'
      : 'text-amber-200/90 bg-amber-500/15 border border-amber-500/25',
    chatBubbleAssistant: (): CSSProperties | undefined =>
      isCorporate
        ? undefined
        : {
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(34,211,238,0.12)',
          },
    chatBubbleAssistantClass: isCorporate
      ? 'chat-bubble-assistant !bg-slate-100 !text-slate-900 !border !border-slate-200'
      : 'chat-bubble-assistant text-slate-200',
    chatBubbleInbound: (): CSSProperties | undefined =>
      isCorporate
        ? undefined
        : {
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(168,85,247,0.2) 100%)',
            border: '1px solid rgba(34,211,238,0.2)',
            color: '#e2e8f0',
          },
    chatBubbleInboundClass: isCorporate
      ? 'chat-bubble-assistant !bg-slate-100 !text-slate-900 !border !border-slate-200'
      : '',
    chatBubbleOutbound: (): CSSProperties | undefined =>
      isCorporate
        ? undefined
        : {
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(34,211,238,0.1)',
            color: '#cbd5e1',
          },
    chatBubbleOutboundClass: isCorporate
      ? 'chat-bubble-user !bg-slate-800 !text-white !border !border-slate-700'
      : '',
    conversationActive: isCorporate
      ? 'text-slate-900 bg-slate-100 border border-slate-300'
      : 'text-cyan-200 bg-cyan-500/15 border border-cyan-500/30',
    conversationIdle: isCorporate
      ? 'text-slate-700 hover:bg-slate-100 border border-transparent'
      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent',
    conversationIntervention: isCorporate
      ? 'text-sky-950 bg-sky-50 border border-sky-200 hover:bg-sky-100'
      : 'text-slate-300 hover:bg-slate-800/60 border border-amber-500/25 bg-amber-500/5',
    adminTitleClass: isCorporate
      ? 'text-slate-800 font-semibold tracking-tight text-sm'
      : 'text-cyan-300 font-mono uppercase tracking-wider text-sm',
    adminSubtitleClass: isCorporate ? 'text-xs text-slate-600 mt-1' : 'text-xs text-slate-500 mt-1',
    adminTableWrapClass: isCorporate
      ? 'overflow-x-auto rounded-lg border border-slate-200'
      : 'overflow-x-auto rounded-lg border border-slate-800',
    adminTableClass: isCorporate ? 'w-full text-sm text-left text-slate-900' : 'w-full text-sm text-left',
    adminTheadClass: isCorporate
      ? 'text-xs uppercase text-slate-600 bg-slate-50'
      : 'text-xs uppercase text-slate-500 bg-slate-900/80',
    adminThClass: isCorporate ? 'px-3 py-2 font-medium' : 'px-4 py-3 text-left font-medium text-slate-400 whitespace-nowrap',
    adminTrClass: isCorporate
      ? 'border-t border-slate-200 hover:bg-slate-50'
      : 'border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors',
    adminTrSelectedClass: isCorporate ? 'bg-slate-100' : 'bg-slate-800/60',
    adminTdPrimaryClass: isCorporate ? 'px-3 py-2 text-slate-900' : 'px-4 py-3 font-medium text-slate-100',
    adminTdMutedClass: isCorporate ? 'px-3 py-2 text-slate-600' : 'px-4 py-3 text-slate-400',
    adminTdMonoClass: isCorporate
      ? 'px-3 py-2 font-mono text-xs text-slate-600'
      : 'px-4 py-3 font-mono text-xs text-slate-300',
    adminTdMonoSubClass: isCorporate
      ? 'px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell max-w-xs truncate'
      : 'px-4 py-3 font-mono text-xs text-slate-400 hidden md:table-cell max-w-xs truncate',
    adminPaginationClass: isCorporate
      ? 'flex items-center justify-between text-sm text-slate-600'
      : 'flex items-center justify-between px-4 py-3 border-t border-slate-700/60 text-xs text-slate-400',
    adminAccentButtonClass: isCorporate
      ? 'gap-1.5 !border-slate-300 !bg-white !text-slate-800 hover:!bg-slate-50 hover:!text-slate-900'
      : 'gap-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200',
    adminWarningButtonClass: isCorporate
      ? 'gap-1.5 !border-amber-300 !bg-amber-50 !text-amber-900 hover:!bg-amber-100 hover:!text-amber-950'
      : 'gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 hover:text-amber-200',
    adminCheckboxClass: isCorporate ? 'accent-slate-700 size-4 rounded cursor-pointer' : 'accent-cyan-400 size-4 rounded cursor-pointer',
    adminIconActionClass: isCorporate
      ? 'text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-40'
      : 'text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40',
    adminCopyButtonClass: isCorporate
      ? 'ml-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors'
      : 'ml-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors',
    adminAlertCardClass: isCorporate
      ? 'border-amber-300 bg-amber-50'
      : 'border-amber-500/30 bg-slate-950',
    adminAlertHeaderClass: isCorporate ? 'py-3 px-4 border-b border-amber-200' : 'py-3 px-4 border-b border-amber-500/20',
    adminAlertTitleStyle: isCorporate
      ? ({ color: '#92400e' } satisfies CSSProperties)
      : ({ color: 'rgba(251,191,36,0.8)' } satisfies CSSProperties),
    adminSecretBoxClass: isCorporate
      ? 'rounded-lg border border-slate-200 bg-white px-3 py-2.5'
      : 'rounded-lg border border-cyan-500/20 bg-slate-900 px-3 py-2.5',
    adminSecretSlugClass: isCorporate
      ? 'text-xs font-semibold uppercase tracking-widest text-slate-500'
      : 'text-xs font-semibold uppercase tracking-widest text-slate-400',
    adminSecretValueClass: isCorporate
      ? 'flex items-center gap-1 font-mono text-xs text-slate-800 break-all'
      : 'flex items-center gap-1 font-mono text-xs text-cyan-200 break-all',
    adminDismissClass: isCorporate
      ? 'mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800'
      : 'mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300',
    rotationDaysClass: (days: number | null) => {
      if (days === null) return '';
      if (days >= 365) return isCorporate ? 'text-red-700' : 'text-red-400';
      if (days >= 300) return isCorporate ? 'text-amber-700' : 'text-amber-400';
      return isCorporate ? 'text-slate-600' : 'text-slate-400';
    },
    adminCardClass: isCorporate
      ? '!bg-white !text-slate-900 border border-slate-300 shadow-sm'
      : 'border-slate-700/60',
    adminCardTableHeadRowClass: isCorporate
      ? 'border-b border-slate-200 bg-slate-50'
      : 'border-b border-slate-700/60 bg-slate-800/60',
    adminEmptyCellClass: isCorporate
      ? 'px-4 py-8 text-center text-slate-500'
      : 'px-4 py-8 text-center text-slate-500',
  };
}
