import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

const DESKTOP_TIP_WIDTH_PX = 288;
const DESKTOP_TIP_GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 16;

interface RiskSummaryHintProps {
  summary?: string | null;
  /** Tooltip opens above the icon when the control sits near the bottom of the viewport. */
  placement?: 'above' | 'below';
}

interface DesktopTipPosition {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

export default function RiskSummaryHint({
  summary,
  placement = 'below',
}: RiskSummaryHintProps) {
  const { isCorporate } = useUiTheme();
  const [open, setOpen] = useState(false);
  const [desktopTipOpen, setDesktopTipOpen] = useState(false);
  const [desktopTipPosition, setDesktopTipPosition] = useState<DesktopTipPosition | null>(null);
  const desktopAnchorRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();
  const trimmed = summary?.trim();

  const flyoutClass = cn(
    'pointer-events-none z-[100] w-72 max-w-[min(18rem,calc(100vw-2rem))] max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border p-3 text-xs leading-relaxed shadow-lg',
    isCorporate ? 'border-slate-300 bg-white text-slate-800' : 'text-slate-200',
  );

  const flyoutStyle = isCorporate
    ? undefined
    : {
        borderColor: 'rgba(34,211,238,0.25)',
        background: 'rgba(2,6,23,0.98)',
      };

  const iconButtonClass = cn(
    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded',
    isCorporate ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-cyan-300',
  );

  const positionDesktopTip = useCallback(() => {
    const anchor = desktopAnchorRef.current;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN_PX, rect.right - DESKTOP_TIP_WIDTH_PX),
      window.innerWidth - DESKTOP_TIP_WIDTH_PX - VIEWPORT_MARGIN_PX,
    );
    const spaceBelow = window.innerHeight - rect.bottom - DESKTOP_TIP_GAP_PX - VIEWPORT_MARGIN_PX;
    const spaceAbove = rect.top - DESKTOP_TIP_GAP_PX - VIEWPORT_MARGIN_PX;
    const resolvedPlacement =
      placement === 'above' || (placement === 'below' && spaceBelow < 120 && spaceAbove > spaceBelow)
        ? 'above'
        : 'below';
    const top =
      resolvedPlacement === 'above'
        ? rect.top - DESKTOP_TIP_GAP_PX
        : rect.bottom + DESKTOP_TIP_GAP_PX;
    setDesktopTipPosition({ left, top, placement: resolvedPlacement });
  }, [placement]);

  const showDesktopTip = useCallback(() => {
    positionDesktopTip();
    setDesktopTipOpen(true);
  }, [positionDesktopTip]);

  const hideDesktopTip = useCallback(() => {
    setDesktopTipOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!desktopTipOpen) {
      return;
    }
    const onViewportChange = () => positionDesktopTip();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [desktopTipOpen, positionDesktopTip]);

  if (!trimmed) {
    return null;
  }

  const desktopTip =
    desktopTipOpen && desktopTipPosition
      ? createPortal(
          <span
            role="tooltip"
            className={cn(flyoutClass, 'fixed')}
            style={{
              ...flyoutStyle,
              left: desktopTipPosition.left,
              top: desktopTipPosition.top,
              transform:
                desktopTipPosition.placement === 'above' ? 'translateY(-100%)' : undefined,
            }}
          >
            {trimmed}
          </span>,
          document.body,
        )
      : null;

  const mobileOverlay = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 md:hidden"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative w-full max-w-sm max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border p-4 pt-8 text-xs leading-relaxed shadow-xl',
              isCorporate ? 'border-slate-300 bg-white text-slate-800' : 'text-slate-200',
            )}
            style={flyoutStyle}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={cn(
                'absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md',
                isCorporate
                  ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200',
              )}
              aria-label="Close"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            <p
              id={titleId}
              className={cn(
                'mb-2 text-[10px] font-semibold uppercase tracking-widest',
                isCorporate ? 'text-slate-500' : 'text-cyan-300/80',
              )}
            >
              AI interaction summary
            </p>
            <p>{trimmed}</p>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        ref={desktopAnchorRef}
        data-risk-summary-hint="desktop"
        className="relative hidden md:inline-flex shrink-0"
        tabIndex={0}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={showDesktopTip}
        onMouseLeave={hideDesktopTip}
        onFocus={showDesktopTip}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            hideDesktopTip();
          }
        }}
      >
        <span className={iconButtonClass} aria-label="AI interaction summary">
          <InformationCircleIcon className="h-4 w-4" />
        </span>
      </span>
      <button
        type="button"
        className={cn(iconButtonClass, 'md:hidden')}
        aria-label="AI interaction summary"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {desktopTip}
      {mobileOverlay}
    </>
  );
}
