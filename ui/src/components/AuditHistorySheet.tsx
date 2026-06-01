import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const BOOTSTRAP_UUID = '00000000-0000-7000-8000-000000000000';

const AUDIT_SHEET_TITLE_STYLE = { color: 'rgba(34,211,238,0.7)' };
const AUDIT_SHEET_TITLE_CLASS = 'text-xs font-semibold uppercase tracking-widest';
const AUDIT_SECTION_TITLE_CLASS = 'text-xs font-semibold text-slate-400 uppercase tracking-widest';
const AUDIT_HEADER_CELL_CLASS =
  'text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-widest';
const AUDIT_BODY_CELL_CLASS = 'py-2 pr-3';
const AUDIT_TABLE_WRAPPER_CLASS =
  'overflow-y-auto max-h-112 min-h-64 border border-slate-800/70 rounded-lg bg-slate-950/60 p-2';

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

function renderActorBadge(changedByType: number, changedByUuid: string, changedByName?: string | null) {
  if (changedByUuid === BOOTSTRAP_UUID) {
    return (
      <span title={changedByUuid}>
        <Badge variant="outline" className="border-slate-600 text-slate-400">
          Bootstrap
        </Badge>
      </span>
    );
  }

  const truncated = changedByUuid ? changedByUuid.slice(0, 8) : '—';

  if (changedByType === 1) {
    return (
      <span title={changedByUuid} className="inline-flex items-center gap-1">
        <Badge variant="outline" className="border-cyan-700/60 text-cyan-400">
          User
        </Badge>
        {changedByName ? (
          <span className="text-slate-300">{changedByName}</span>
        ) : (
          <span className="font-mono text-slate-500">{truncated}</span>
        )}
      </span>
    );
  }

  return (
    <span title={changedByUuid} className="inline-flex items-center gap-1">
      <Badge variant="outline" className="border-amber-700 text-amber-400">
        Service
      </Badge>
      <span className="font-mono text-slate-500">{truncated}</span>
    </span>
  );
}

function baseColumns<Row extends AuditBaseItem>(
  actorName?: (row: Row) => string | undefined,
): AuditColumn<Row>[] {
  return [
    {
      key: 'changed-at',
      header: 'Changed at (UTC)',
      widthClassName: 'w-40',
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'font-mono text-slate-400 whitespace-nowrap',
      render: (row) => formatAuditTimestamp(row.changed_at),
    },
    {
      key: 'event',
      header: 'Event',
      widthClassName: 'w-16',
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'text-slate-300 capitalize whitespace-nowrap',
      render: (row) => changeTypeLabel(row.change_type),
    },
    {
      key: 'actor',
      header: 'Actor',
      widthClassName: 'w-40',
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (row) =>
        renderActorBadge(row.changed_by_type, row.changed_by_uuid, actorName?.(row) ?? row.changed_by_name),
    },
  ];
}

const SERVICE_COLUMNS: AuditColumn<ServiceAuditItem>[] = [
  ...baseColumns<ServiceAuditItem>(),
  {
    key: 'name',
    header: 'Name',
    cellClassName: 'text-slate-300',
    render: (row) => row.name ?? '—',
  },
  {
    key: 'slug',
    header: 'Slug',
    cellClassName: 'font-mono text-slate-400',
    render: (row) => row.slug ?? '—',
  },
  {
    key: 'base-url',
    header: 'Base URL',
    headerClassName: 'pr-0',
    cellClassName: 'font-mono text-slate-500 truncate pr-0',
    render: (row) => row.base_url ?? '—',
  },
];

const CREDENTIAL_COLUMNS: AuditColumn<ServiceAuditItem>[] = [
  ...baseColumns<ServiceAuditItem>(),
  {
    key: 'secret',
    header: 'Secret',
    headerClassName: 'pr-0',
    cellClassName: 'font-mono text-slate-600 pr-0',
    render: () => '***',
  },
];

const USER_COLUMNS: AuditColumn<UserAuditItem>[] = [
  ...baseColumns<UserAuditItem>((row) =>
    row.changed_by_type === 1 && row.changed_by_uuid === row.uuid ? userAuditName(row) : undefined,
  ),
  {
    key: 'name',
    header: 'Name',
    cellClassName: 'text-slate-300',
    render: (row) => userAuditName(row),
  },
  {
    key: 'email',
    header: 'Email',
    cellClassName: 'text-slate-400',
    render: (row) => row.email ?? '—',
  },
  {
    key: 'roles',
    header: 'Roles',
    headerClassName: 'pr-0',
    cellClassName: 'text-slate-500 pr-0',
    render: (row) => row.roles.join(', ') || '—',
  },
];

function AuditTable<Row>({
  rows,
  columns,
}: {
  rows: Row[];
  columns: AuditColumn<Row>[];
}) {
  return (
    <table className="min-w-max max-w-full text-xs table-auto">
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} className={column.widthClassName} />
        ))}
      </colgroup>
      <thead>
        <tr className="border-b border-slate-700/60">
          {columns.map((column) => (
            <th
              key={column.key}
              className={`${AUDIT_HEADER_CELL_CLASS} ${column.headerClassName ?? ''}`.trim()}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={auditRowKey(row as AuditBaseItem)}
            className="border-b border-slate-800/60"
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={`${AUDIT_BODY_CELL_CLASS} ${column.cellClassName ?? ''}`.trim()}
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

function AuditSectionContent({ section }: { section: AuditSection }) {
  if (section.loading && !section.rows) {
    return <p className="text-slate-400 text-xs">Loading…</p>;
  }

  if (!section.rows) {
    return <p className="text-red-400 text-xs">{section.errorMessage}</p>;
  }

  if (section.rows.length === 0) {
    return <p className="text-slate-600 text-xs">{section.emptyMessage}</p>;
  }

  switch (section.kind) {
    case 'service':
      return <AuditTable rows={section.rows} columns={SERVICE_COLUMNS} />;
    case 'credential':
      return <AuditTable rows={section.rows} columns={CREDENTIAL_COLUMNS} />;
    case 'user':
      return <AuditTable rows={section.rows} columns={USER_COLUMNS} />;
  }
}

export function AuditHistorySheet({
  open,
  onOpenChange,
  title,
  sections,
}: AuditHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-slate-950 border-slate-700 text-slate-300 overflow-y-auto"
        style={{ width: '80vw', maxWidth: '80vw' }}
      >
        <SheetHeader className="border-b border-slate-700/60 pb-4 mb-6">
          <SheetTitle className={AUDIT_SHEET_TITLE_CLASS} style={AUDIT_SHEET_TITLE_STYLE}>
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
                    <h3 className={AUDIT_SECTION_TITLE_CLASS}>{section.title}</h3>
                    {section.actions}
                  </div>
                ) : null}

                <div className={AUDIT_TABLE_WRAPPER_CLASS}>
                  <AuditSectionContent section={section} />
                </div>

                {pagination ? (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
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
