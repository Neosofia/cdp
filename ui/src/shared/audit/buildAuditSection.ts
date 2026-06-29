import type { ReactNode } from 'react';

import type { AuditSection } from '@/shared/audit/AuditHistorySheet';
import type { UsePaginatedAuditResult } from '@/shared/audit/usePaginatedAudit';

type AuditKind = AuditSection['kind'];

interface AuditSectionConfig<K extends AuditKind> {
  key: string;
  kind: K;
  title?: ReactNode;
  actions?: ReactNode;
  emptyMessage: string;
  errorMessage: string;
}

/** Map shared paginated audit state into an AuditHistorySheet section. */
export function buildAuditSection<K extends AuditKind, T>(
  config: AuditSectionConfig<K>,
  audit: Pick<
    UsePaginatedAuditResult<T>,
    'sheetRows' | 'sheetLoading' | 'total' | 'page' | 'pageSize' | 'error' | 'handlePageChange'
  >,
): Extract<AuditSection, { kind: K }> {
  return {
    key: config.key,
    kind: config.kind,
    title: config.title,
    actions: config.actions,
    rows: audit.sheetRows,
    loading: audit.sheetLoading,
    emptyMessage: config.emptyMessage,
    errorMessage: audit.error ?? config.errorMessage,
    total: audit.total,
    page: audit.page,
    pageSize: audit.pageSize,
    onPageChange: audit.handlePageChange,
  } as Extract<AuditSection, { kind: K }>;
}
