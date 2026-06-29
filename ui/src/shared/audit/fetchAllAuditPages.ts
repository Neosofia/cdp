import { AUDIT_CSV_FETCH_PAGE_SIZE, AUDIT_CSV_MAX_PAGES } from '@/shared/audit/constants';
import type { PaginatedAuditResponse } from '@/shared/audit/types';

/** Fetch every page from a paginated audit endpoint (CSV export and bulk download). */
export async function fetchAllAuditPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedAuditResponse<T>>,
  pageSize = AUDIT_CSV_FETCH_PAGE_SIZE,
  maxPages = AUDIT_CSV_MAX_PAGES,
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 1;
  let total = Number.MAX_SAFE_INTEGER;

  while (allRows.length < total && page <= maxPages) {
    const data = await fetchPage(page, pageSize);
    allRows.push(...(data.items ?? []));
    total = data.total ?? allRows.length;
    if ((data.items ?? []).length === 0) {
      break;
    }
    page += 1;
  }

  return allRows;
}
