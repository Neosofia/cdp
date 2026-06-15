import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUserFormStyles } from '@/components/userFormStyles';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

const BOOTSTRAP_UUID = '00000000-0000-7000-8000-000000000000';

interface AuditBaseItem {
  history_uuid: string | null;
  changed_at: string;
  changed_by_uuid: string;
  changed_by_type: number;
  change_type: number;
  changed_by_name?: string | null;
}

export interface ServiceAuditItem extends AuditBaseItem {
  source: 'service' | 'credential';
  credential_uuid: string | null;
  name: string | null;
  slug: string | null;
  base_url: string | null;
}

export interface UserAuditItem extends AuditBaseItem {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
}

interface AuditSectionBase {
  key: string;
  title?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  emptyMessage: string;
  errorMessage: string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export type AuditSection =
  | (AuditSectionBase & { kind: 'service' | 'credential'; rows: ServiceAuditItem[] | null })
  | (AuditSectionBase & { kind: 'user'; rows: UserAuditItem[] | null });

interface AuditHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  sections: AuditSection[];
}

interface AuditColumn<Row> {
  key: string;
  header: string;
  widthClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: Row) => ReactNode;
}

function changeTypeLabel(ct: number): string {
  return ct === 1 ? 'created' : ct === 2 ? 'updated' : ct === 3 ? 'deleted' : String(ct);
}

function formatAuditTimestamp(changedAt: string): string {
  return new Date(changedAt).toLocaleString(undefined, { timeZone: 'UTC' });
}

function auditRowKey(row: AuditBaseItem): string {
  return row.history_uuid ?? `${row.changed_at}-${row.changed_by_uuid}-${row.change_type}`;
}

function userAuditName(row: UserAuditItem): string {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return name || '—';
}

function useAuditHistoryStyles() {
  const { isCorporate } = useUiTheme();
  const formStyles = useUserFormStyles();

  return {
    isCorporate,
    sheetContentClass: cn(
      'overflow-y-auto',
      isCorporate
        ? 'bg-white border-slate-200 text-slate-900'
        : 'bg-slate-950 border-slate-700 text-slate-300',
    ),
    sheetHeaderClass: isCorporate ? 'border-b border-slate-200 pb-4 mb-6' : 'border-b border-slate-700/60 pb-4 mb-6',
    sheetTitleClass: formStyles.sheetTitleClass,
    sheetTitleStyle: formStyles.sheetTitleStyle,
    sectionTitleClass: isCorporate
      ? 'text-xs font-semibold text-slate-600 uppercase tracking-widest'
      : 'text-xs font-semibold text-slate-400 uppercase tracking-widest',
    headerCellClass: isCorporate
      ? 'text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-widest'
      : 'text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-widest',
    bodyCellClass: 'py-2 pr-3',
    tableWrapperClass: isCorporate
      ? 'overflow-y-auto max-h-112 min-h-64 border border-slate-200 rounded-lg bg-slate-50 p-2'
      : 'overflow-y-auto max-h-112 min-h-64 border border-slate-800/70 rounded-lg bg-slate-950/60 p-2',
    tableHeadRowClass: isCorporate ? 'border-b border-slate-200' : 'border-b border-slate-700/60',
    tableRowClass: isCorporate ? 'border-b border-slate-200' : 'border-b border-slate-800/60',
    loadingClass: isCorporate ? 'text-slate-600 text-xs' : 'text-slate-400 text-xs',
    emptyClass: isCorporate ? 'text-slate-500 text-xs' : 'text-slate-600 text-xs',
    paginationClass: isCorporate ? 'flex items-center justify-between pt-2 text-xs text-slate-600' : 'flex items-center justify-between pt-2 text-xs text-slate-500',
    timestampCellClass: isCorporate
      ? 'font-mono text-slate-600 whitespace-nowrap'
      : 'font-mono text-slate-400 whitespace-nowrap',
    eventCellClass: isCorporate
      ? 'text-slate-800 capitalize whitespace-nowrap'
      : 'text-slate-300 capitalize whitespace-nowrap',
    primaryCellClass: isCorporate ? 'text-slate-800' : 'text-slate-300',
    monoCellClass: isCorporate ? 'font-mono text-slate-600' : 'font-mono text-slate-400',
    mutedCellClass: isCorporate ? 'font-mono text-slate-500 truncate pr-0' : 'font-mono text-slate-500 truncate pr-0',
    secretCellClass: isCorporate ? 'font-mono text-slate-500 pr-0' : 'font-mono text-slate-600 pr-0',
    actorNameClass: isCorporate ? 'text-slate-800' : 'text-slate-300',
    actorUuidClass: isCorporate ? 'font-mono text-slate-500' : 'font-mono text-slate-500',
    bootstrapBadgeClass: isCorporate
      ? 'border-slate-400 text-slate-600'
      : 'border-slate-600 text-slate-400',
    userBadgeClass: isCorporate ? 'border-sky-300 text-sky-800' : 'border-cyan-700/60 text-cyan-400',
    serviceBadgeClass: isCorporate ? 'border-amber-300 text-amber-800' : 'border-amber-700 text-amber-400',
  };
}

function AuditTable<Row>({
  rows,
  columns,
  styles,
}: {
  rows: Row[];
  columns: AuditColumn<Row>[];
  styles: ReturnType<typeof useAuditHistoryStyles>;
}) {
  return (
    <table className="min-w-max max-w-full text-xs table-auto">
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} className={column.widthClassName} />
        ))}
      </colgroup>
      <thead>
        <tr className={styles.tableHeadRowClass}>
          {columns.map((column) => (
            <th
              key={column.key}
              className={`${styles.headerCellClass} ${column.headerClassName ?? ''}`.trim()}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={auditRowKey(row as AuditBaseItem)} className={styles.tableRowClass}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={`${styles.bodyCellClass} ${column.cellClassName ?? ''}`.trim()}
              >
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditSectionContent({
  section,
  styles,
  columns,
}: {
  section: AuditSection;
  styles: ReturnType<typeof useAuditHistoryStyles>;
  columns: {
    service: AuditColumn<ServiceAuditItem>[];
    credential: AuditColumn<ServiceAuditItem>[];
    user: AuditColumn<UserAuditItem>[];
  };
}) {
  if (section.loading && (section.rows == null || section.rows.length === 0)) {
    return <p className={styles.loadingClass}>Loading…</p>;
  }

  if (section.rows == null) {
    return <p className="text-red-400 text-xs">{section.errorMessage}</p>;
  }

  if (section.rows.length === 0) {
    return <p className={styles.emptyClass}>{section.emptyMessage}</p>;
  }

  switch (section.kind) {
    case 'service':
      return <AuditTable rows={section.rows} columns={columns.service} styles={styles} />;
    case 'credential':
      return <AuditTable rows={section.rows} columns={columns.credential} styles={styles} />;
    case 'user':
      return <AuditTable rows={section.rows} columns={columns.user} styles={styles} />;
  }
}

export function AuditHistorySheet({
  open,
  onOpenChange,
  title,
  sections,
}: AuditHistorySheetProps) {
  const styles = useAuditHistoryStyles();

  const renderActorBadge = (
    changedByType: number,
    changedByUuid: string,
    changedByName?: string | null,
  ) => {
    if (changedByUuid === BOOTSTRAP_UUID) {
      return (
        <span title={changedByUuid}>
          <Badge variant="outline" className={styles.bootstrapBadgeClass}>
            Bootstrap
          </Badge>
        </span>
      );
    }

    const truncated = changedByUuid ? changedByUuid.slice(0, 8) : '—';

    if (changedByType === 1) {
      return (
        <span title={changedByUuid} className="inline-flex items-center gap-1">
          <Badge variant="outline" className={styles.userBadgeClass}>
            User
          </Badge>
          {changedByName ? (
            <span className={styles.actorNameClass}>{changedByName}</span>
          ) : (
            <span className={styles.actorUuidClass}>{truncated}</span>
          )}
        </span>
      );
    }

    return (
      <span title={changedByUuid} className="inline-flex items-center gap-1">
        <Badge variant="outline" className={styles.serviceBadgeClass}>
          Service
        </Badge>
        <span className={styles.actorUuidClass}>{truncated}</span>
      </span>
    );
  };

  const columns = useMemo(() => {
    const baseColumns = <Row extends AuditBaseItem>(
      actorName?: (row: Row) => string | undefined,
    ): AuditColumn<Row>[] => [
      {
        key: 'changed-at',
        header: 'Changed at (UTC)',
        widthClassName: 'w-40',
        headerClassName: 'whitespace-nowrap',
        cellClassName: styles.timestampCellClass,
        render: (row) => formatAuditTimestamp(row.changed_at),
      },
      {
        key: 'event',
        header: 'Event',
        widthClassName: 'w-16',
        headerClassName: 'whitespace-nowrap',
        cellClassName: styles.eventCellClass,
        render: (row) => changeTypeLabel(row.change_type),
      },
      {
        key: 'actor',
        header: 'Actor',
        widthClassName: 'w-40',
        headerClassName: 'whitespace-nowrap',
        cellClassName: 'whitespace-nowrap',
        render: (row) =>
          renderActorBadge(
            row.changed_by_type,
            row.changed_by_uuid,
            actorName?.(row) ?? row.changed_by_name,
          ),
      },
    ];

    return {
      service: [
        ...baseColumns<ServiceAuditItem>(),
        {
          key: 'name',
          header: 'Name',
          cellClassName: styles.primaryCellClass,
          render: (row) => row.name ?? '—',
        },
        {
          key: 'slug',
          header: 'Slug',
          cellClassName: styles.monoCellClass,
          render: (row) => row.slug ?? '—',
        },
        {
          key: 'base-url',
          header: 'Base URL',
          headerClassName: 'pr-0',
          cellClassName: styles.mutedCellClass,
          render: (row) => row.base_url ?? '—',
        },
      ] satisfies AuditColumn<ServiceAuditItem>[],
      credential: [
        ...baseColumns<ServiceAuditItem>(),
        {
          key: 'secret',
          header: 'Secret',
          headerClassName: 'pr-0',
          cellClassName: styles.secretCellClass,
          render: () => '***',
        },
      ] satisfies AuditColumn<ServiceAuditItem>[],
      user: [
        ...baseColumns<UserAuditItem>((row) =>
          row.changed_by_type === 1 && row.changed_by_uuid === row.uuid ? userAuditName(row) : undefined,
        ),
        {
          key: 'name',
          header: 'Name',
          cellClassName: styles.primaryCellClass,
          render: (row) => userAuditName(row),
        },
        {
          key: 'email',
          header: 'Email',
          cellClassName: styles.monoCellClass,
          render: (row) => row.email ?? '—',
        },
        {
          key: 'roles',
          header: 'Roles',
          headerClassName: 'pr-0',
          cellClassName: styles.mutedCellClass,
          render: (row) => (row.roles ?? []).join(', ') || '—',
        },
      ] satisfies AuditColumn<UserAuditItem>[],
    };
  }, [styles]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={styles.sheetContentClass}
        style={{ width: '80vw', maxWidth: '80vw' }}
      >
        <SheetHeader className={styles.sheetHeaderClass}>
          <SheetTitle className={styles.sheetTitleClass} style={styles.sheetTitleStyle}>
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
          {sections.map((section) => {
            const pagination =
              typeof section.total === 'number' &&
              typeof section.page === 'number' &&
              typeof section.pageSize === 'number' &&
              section.onPageChange &&
              section.total > section.pageSize
                ? {
                    total: section.total,
                    page: section.page,
                    pageSize: section.pageSize,
                    onPageChange: section.onPageChange,
                    totalPages: Math.max(1, Math.ceil(section.total / section.pageSize)),
                  }
                : null;

            return (
              <div key={section.key}>
                {section.title || section.actions ? (
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={styles.sectionTitleClass}>{section.title}</h3>
                    {section.actions}
                  </div>
                ) : null}

                <div className={styles.tableWrapperClass}>
                  <AuditSectionContent section={section} styles={styles} columns={columns} />
                </div>

                {pagination ? (
                  <div className={styles.paginationClass}>
                    <span>{pagination.total} records</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={section.loading || pagination.page <= 1}
                        onClick={() => pagination.onPageChange(pagination.page - 1)}
                      >
                        Prev
                      </Button>
                      <span>
                        Page {pagination.page} / {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={section.loading || pagination.page >= pagination.totalPages}
                        onClick={() => pagination.onPageChange(pagination.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
