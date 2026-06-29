import { useEffect, useMemo, useState } from 'react';
import type { PageSelection } from '@/shared/pagination/usePaginatedRemoteList';

export function useListPageSelection(itemKeys: string[], resetKey?: unknown): PageSelection {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [resetKey]);

  const allOnPageSelected =
    itemKeys.length > 0 && itemKeys.every((key) => selected.has(key));

  return useMemo(
    () => ({
      selected,
      allOnPageSelected,
      isSelected: (key: string) => selected.has(key),
      clearSelection: () => setSelected(new Set()),
      toggleAll: () => {
        setSelected((previous) => {
          if (itemKeys.length > 0 && itemKeys.every((key) => previous.has(key))) {
            return new Set();
          }
          return new Set(itemKeys);
        });
      },
      toggleOne: (key: string) => {
        setSelected((previous) => {
          const next = new Set(previous);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          return next;
        });
      },
    }),
    [allOnPageSelected, itemKeys, selected],
  );
}
