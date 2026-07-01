import { useCallback, useState } from 'react';

import { AUDIT_CSV_FETCH_PAGE_SIZE, AUDIT_CSV_MAX_PAGES, AUDIT_PAGE_SIZE } from '@/shared/audit/constants';
import { fetchAllAuditPages } from '@/shared/audit/fetchAllAuditPages';
import type { PaginatedAuditResponse } from '@/shared/audit/types';
import { toUserFacingError } from '@/shared/core/userFacingError';

interface UsePaginatedAuditOptions<T> {
  pageSize?: number;
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedAuditResponse<T>>;
  fetchAllPages?: (pageSize: number, maxPages: number) => Promise<T[]>;
}

export interface UsePaginatedAuditResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  loadPage: (page: number, reset?: boolean) => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
  handlePageChange: (page: number) => void;
  exportAll: () => Promise<T[]>;
  /** Rows prop for AuditHistorySheet (`null` while loading or on error). */
  sheetRows: T[] | null;
  /** Loading prop for AuditHistorySheet (initial fetch only). */
  sheetLoading: boolean;
}

export function usePaginatedAudit<T>({
  pageSize = AUDIT_PAGE_SIZE,
  fetchPage,
  fetchAllPages,
}: UsePaginatedAuditOptions<T>): UsePaginatedAuditResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setItems([]);
    setTotal(0);
    setPage(1);
    setLoading(false);
    setError(null);
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, shouldReset = false) => {
      setLoading(true);
      setError(null);
      if (shouldReset) {
        setItems([]);
        setTotal(0);
      }
      try {
        const data = await fetchPage(pageNum, pageSize);
        setItems(data.items ?? []);
        setPage(data.page ?? pageNum);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError(toUserFacingError(err, 'Failed to load audit history'));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, pageSize],
  );

  const reload = useCallback(() => loadPage(1, true), [loadPage]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (!loading) {
        void loadPage(newPage, false);
      }
    },
    [loadPage, loading],
  );

  const exportAll = useCallback(async (): Promise<T[]> => {
    if (fetchAllPages) {
      return fetchAllPages(AUDIT_CSV_FETCH_PAGE_SIZE, AUDIT_CSV_MAX_PAGES);
    }
    return fetchAllAuditPages(fetchPage, AUDIT_CSV_FETCH_PAGE_SIZE, AUDIT_CSV_MAX_PAGES);
  }, [fetchAllPages, fetchPage]);

  const sheetLoading = loading && items.length === 0;
  const sheetRows = error ? null : sheetLoading ? null : items;

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    loadPage,
    reload,
    reset,
    handlePageChange,
    exportAll,
    sheetRows,
    sheetLoading,
  };
}
