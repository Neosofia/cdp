import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { toUserFacingError } from '@/shared/core/userFacingError';
import { useListPageSelection } from '@/shared/pagination/useListPageSelection';

export interface PaginatedListResponse<T> {
  items: T[];
  total: number;
  page?: number;
}

export interface PageSelection {
  selected: Set<string>;
  toggleAll: () => void;
  toggleOne: (key: string) => void;
  allOnPageSelected: boolean;
  isSelected: (key: string) => boolean;
  clearSelection: () => void;
}

export interface UsePaginatedRemoteListOptions<T> {
  pageSize: number;
  fetchPage: (page: number, pageSize: number, search: string) => Promise<PaginatedListResponse<T>>;
  searchDebounceMs?: number;
  enabled?: boolean;
  /** Enables current-page multi-select; cleared after each successful fetch. */
  getItemKey?: (item: T) => string;
}

export interface UsePaginatedRemoteListResult<T> {
  items: T[];
  total: number;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  reload: () => Promise<void>;
  selection: PageSelection | null;
}

export function usePaginatedRemoteList<T>({
  pageSize,
  fetchPage,
  searchDebounceMs = 300,
  enabled = true,
  getItemKey,
}: UsePaginatedRemoteListOptions<T>): UsePaginatedRemoteListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, searchDebounceMs);
    return () => clearTimeout(id);
  }, [search, searchDebounceMs]);

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(page, pageSize, debouncedSearch);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(toUserFacingError(err, 'Failed to load list'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, enabled, fetchPage, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemKeys = useMemo(
    () => (getItemKey ? items.map((item) => getItemKey(item)) : []),
    [getItemKey, items],
  );

  const selectionResetKey = getItemKey
    ? `${page}:${debouncedSearch}:${itemKeys.join('\u0000')}`
    : undefined;
  const selectionState = useListPageSelection(itemKeys, selectionResetKey);
  const selection = getItemKey ? selectionState : null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return {
    items,
    total,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    loading,
    error,
    search,
    setSearch,
    reload: load,
    selection,
  };
}
