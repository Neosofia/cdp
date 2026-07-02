import { useEffect, useRef, type RefObject } from 'react';

/** Keep a scrollable chat/transcript pane pinned to the latest content after layout. */
export function useScrollToBottom<T extends HTMLElement>(deps: unknown[]): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };

    scrollToBottom();
    const raf = requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));

    const resizeObserver = new ResizeObserver(scrollToBottom);
    resizeObserver.observe(el);
    for (const child of el.children) {
      resizeObserver.observe(child);
    }

    const mutationObserver = new MutationObserver(scrollToBottom);
    mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies reactive deps array
  }, deps);

  return ref;
}
