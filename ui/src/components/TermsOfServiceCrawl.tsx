import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TOS_SECTIONS } from '@/shared/auth/termsOfServiceContent';

/** Scroll speed along the crawl path (higher = faster). */
const PX_PER_SECOND = 24;

/** Flat “a long time ago…” card on stars before the tilted crawl begins. */
const LOGLINE_BEAT_SEC = 5;

const CRAWL_TILT_DEG = 26;
const CRAWL_START_Z_PX = 80;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    target.isContentEditable
  );
}

function measureCrawlStartVh(
  plane: HTMLElement,
  anchor: HTMLElement,
  stage: HTMLElement,
): string {
  const targetCenter = stage.clientHeight * 0.68;
  let bestVh = 98;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let vh = 84; vh <= 102; vh += 1) {
    plane.style.transform = `rotateX(${CRAWL_TILT_DEG}deg) translate3d(0, ${vh}vh, ${CRAWL_START_Z_PX}px)`;
    const anchorRect = anchor.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const center = (anchorRect.top + anchorRect.bottom) / 2 - stageRect.top;
    const delta = Math.abs(center - targetCenter);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestVh = vh;
    }
  }

  plane.style.transform = '';
  return `${bestVh}vh`;
}

export default function TermsOfServiceCrawl() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = useState(180);
  const [crawlStart, setCrawlStart] = useState('98vh');
  const [crawlEndPx, setCrawlEndPx] = useState(-6000);
  const [crawlReady, setCrawlReady] = useState(false);
  const [crawlRunKey, setCrawlRunKey] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const restartCrawl = () => {
      setCrawlRunKey((key) => key + 1);
      setCrawlReady(false);
      setPaused(false);
    };

    window.addEventListener('pageshow', restartCrawl);
    return () => window.removeEventListener('pageshow', restartCrawl);
  }, []);

  useEffect(() => {
    setPaused(false);
  }, [crawlRunKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      setPaused((value) => !value);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useLayoutEffect(() => {
    const plane = planeRef.current;
    const viewport = viewportRef.current;
    if (!plane || !viewport) {
      return;
    }

    const anchor = plane.querySelector<HTMLElement>('.tos-crawl-title');
    const stage = plane.parentElement;
    if (anchor && stage) {
      setCrawlStart(measureCrawlStartVh(plane, anchor, stage));
    }

    const contentHeight = plane.scrollHeight;
    const viewportHeight = viewport.clientHeight;
    const travel = contentHeight + viewportHeight * 1.5;
    setCrawlEndPx(-travel);
    setDurationSec(Math.max(90, Math.min(420, Math.round(travel / PX_PER_SECOND))));
    setCrawlReady(true);
  }, [crawlRunKey]);

  const durationLabel =
    durationSec >= 120 ? `${Math.round(durationSec / 60)} min` : `${durationSec} sec`;

  const planeStyle = {
    '--tos-crawl-start': crawlStart,
    '--tos-crawl-end': `${crawlEndPx}px`,
    '--tos-crawl-duration': `${durationSec}s`,
    '--tos-crawl-delay': `${LOGLINE_BEAT_SEC}s`,
  } as CSSProperties;

  const planeClassName = [
    'tos-crawl-plane',
    crawlReady && 'tos-crawl-plane--active',
    paused && 'tos-crawl-plane--paused',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={viewportRef} className="tos-crawl-viewport flex-1 min-h-0 w-full min-w-0">
      <p className="tos-crawl-hint" aria-hidden="true">
        {paused ? 'Paused — spacebar to resume' : 'Spacebar to pause'} · full crawl ~{durationLabel}
      </p>
      <p className="tos-crawl-logline-beat" key={`beat-${crawlRunKey}`}>
        A long time ago in a regulated platform far, far away…
      </p>
      <div className="tos-crawl-stage">
        <div key={crawlRunKey} ref={planeRef} className={planeClassName} style={planeStyle}>
          <div className="tos-crawl-content">
            <h2 className="tos-crawl-title">Terms of Service</h2>
            <p className="tos-crawl-episode">Episode CDP</p>
            <div className="tos-crawl-spacer" aria-hidden="true" />
            {TOS_SECTIONS.map((section) => (
              <section key={section.title} className="tos-crawl-section">
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
