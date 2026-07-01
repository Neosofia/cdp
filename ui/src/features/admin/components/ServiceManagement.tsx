import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClockIcon,
  PencilSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AuditHistorySheet,
} from '@/shared/audit/AuditHistorySheet';
import AuditCsvDownloadButton from '@/shared/audit/AuditCsvDownloadButton';
import RemoteListPagination from '@/shared/pagination/RemoteListPagination';
import ServiceFormSheet, {
  EMPTY_SERVICE_FORM_DRAFT,
  serviceToFormDraft,
  type ServiceFormDraft,
} from '@/features/admin/components/ServiceFormSheet';
import { cn } from '@/shared/core/utils';
import { toUserFacingError } from '@/shared/core/userFacingError';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { buildAuditSection } from '@/shared/audit/buildAuditSection';
import { downloadServiceAuditCsv } from '@/shared/audit/downloadAuditCsv';
import { usePaginatedAudit } from '@/shared/audit/usePaginatedAudit';
import { usePaginatedRemoteList } from '@/shared/pagination/usePaginatedRemoteList';
import type { ServiceAuditItem } from '@/shared/audit/types';
import {
  createAuthService,
  fetchAuthServices,
  fetchServiceSourceAudits,
  rotateAuthServiceCredential,
  updateAuthService,
  type AuthServiceItem,
} from '@/features/admin/lib/authServicesApi';

type ServiceItem = AuthServiceItem;

interface RotationResult {
  slug: string;
  client_secret: string;
  error?: string;
}

interface Props {
  token: string;
  activeActor: string;
}

const PAGE_SIZE = 20;

function rotationWarningClass(days: number | null, isCorporate: boolean): string {
  if (days === null) return '';
  if (days >= 365) return isCorporate ? 'text-red-700' : 'text-red-400';
  if (days >= 300) return isCorporate ? 'text-amber-700' : 'text-amber-400';
  return isCorporate ? 'text-slate-600' : 'text-slate-400';
}

function CopyButton({ value }: { value: string }) {
  const adminStyles = usePatientViewStyles();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={adminStyles.adminCopyButtonClass}
      title="Copy to clipboard"
    >
      {copied
        ? <CheckIcon className="size-4 text-green-600" />
        : <ClipboardDocumentIcon className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ServiceManagement({ token, activeActor }: Props) {
  const adminStyles = usePatientViewStyles();

  const fetchServicePage = useCallback(
    async (pageNum: number, pageSize: number, searchQuery: string) =>
      fetchAuthServices(token, activeActor, pageNum, pageSize, searchQuery),
    [token, activeActor],
  );

  const {
    items,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error: listError,
    search,
    setSearch,
    reload: fetchServices,
    selection,
  } = usePaginatedRemoteList({
    pageSize: PAGE_SIZE,
    fetchPage: fetchServicePage,
    getItemKey: (service) => service.slug,
  });

  const selected = selection!.selected;

  // Rotation results
  const [rotationResults, setRotationResults] = useState<RotationResult[] | null>(null);
  const [rotating, setRotating] = useState(false);

  // Audit sheet
  const [auditService, setAuditService] = useState<ServiceItem | null>(null);
  const [downloadingCSV, setDownloadingCSV] = useState<'service' | 'credential' | null>(null);

  const fetchServiceAuditPage = useCallback(
    async (pageNum: number, pageSize: number) => {
      if (!auditService) {
        return { items: [], total: 0, page: pageNum, page_size: pageSize };
      }
      return fetchServiceSourceAudits(token, activeActor, auditService.slug, 'service', pageNum, pageSize);
    },
    [token, activeActor, auditService],
  );

  const fetchCredentialAuditPage = useCallback(
    async (pageNum: number, pageSize: number) => {
      if (!auditService) {
        return { items: [], total: 0, page: pageNum, page_size: pageSize };
      }
      return fetchServiceSourceAudits(token, activeActor, auditService.slug, 'credential', pageNum, pageSize);
    },
    [token, activeActor, auditService],
  );

  const serviceAudits = usePaginatedAudit<ServiceAuditItem>({
    fetchPage: fetchServiceAuditPage,
  });

  const credentialAudits = usePaginatedAudit<ServiceAuditItem>({
    fetchPage: fetchCredentialAuditPage,
  });

  useEffect(() => {
    if (auditService) {
      void serviceAudits.reload();
      void credentialAudits.reload();
    } else {
      serviceAudits.reset();
      credentialAudits.reset();
    }
  }, [auditService?.slug]);

  type ServiceFormSheetState =
    | { mode: 'create' }
    | { mode: 'edit'; originalSlug: string };

  const [formSheet, setFormSheet] = useState<ServiceFormSheetState | null>(null);
  const [formDraft, setFormDraft] = useState<ServiceFormDraft>(EMPTY_SERVICE_FORM_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const openCreateSheet = () => {
    setFormDraft(EMPTY_SERVICE_FORM_DRAFT);
    setFormError(null);
    setFormSheet({ mode: 'create' });
  };

  const openEditSheet = (service: ServiceItem) => {
    setFormDraft(serviceToFormDraft(service));
    setFormError(null);
    setFormSheet({ mode: 'edit', originalSlug: service.slug });
  };

  const closeFormSheet = () => {
    setFormSheet(null);
    setFormError(null);
  };

  const submitFormSheet = async () => {
    if (!formSheet) {
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      if (formSheet.mode === 'create') {
        const data = await createAuthService(token, activeActor, {
          name: formDraft.name,
          slug: formDraft.slug,
          base_url: formDraft.base_url,
        });
        setFormSheet(null);
        setRotationResults([{ slug: formDraft.slug, client_secret: data.client_secret }]);
      } else {
        await updateAuthService(token, activeActor, formSheet.originalSlug, {
          name: formDraft.name,
          slug: formDraft.slug,
          base_url: formDraft.base_url,
        });
        setFormSheet(null);
      }
      void fetchServices();
    } catch (error) {
      setFormError(toUserFacingError(error, 'Save failed'));
    } finally {
      setFormSaving(false);
    }
  };

  const rotateSelected = async () => {
    if (selected.size === 0) return;
    setRotating(true);
    setRotationResults(null);

    const slugs = Array.from(selected);
    const results: RotationResult[] = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const data = await rotateAuthServiceCredential(token, activeActor, slug);
          return { slug, client_secret: data.client_secret };
        } catch (e) {
          return { slug, client_secret: '', error: toUserFacingError(e) };
        }
      }),
    );

    setRotationResults(results);
    setRotating(false);
    void fetchServices();
  };

  // ---------------------------------------------------------------------------
  // Audit sheet
  // ---------------------------------------------------------------------------

  const openAudits = (svc: ServiceItem) => {
    setAuditService(svc);
  };

  const handleDownloadCSV = async (source: 'service' | 'credential') => {
    if (!auditService) return;
    setDownloadingCSV(source);
    try {
      const audit = source === 'service' ? serviceAudits : credentialAudits;
      downloadServiceAuditCsv(await audit.exportAll(), source, auditService.slug);
    } finally {
      setDownloadingCSV(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by name, slug, or URL…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('pl-8', adminStyles.inputClass)}
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            onClick={rotateSelected}
            disabled={rotating}
            className={cn('gap-1.5', adminStyles.adminWarningButtonClass)}
          >
            <ArrowPathIcon className={cn('size-4', rotating && 'animate-spin')} />
            {rotating ? 'Rotating…' : `Rotate ${selected.size} secret${selected.size > 1 ? 's' : ''}`}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={openCreateSheet}
          className={cn('gap-1.5', adminStyles.adminAccentButtonClass)}
        >
          <PlusIcon className="size-4" />
          New service
        </Button>
        <Button variant="outline" size="icon" onClick={() => void fetchServices()} title="Refresh" disabled={loading}>
          <ArrowPathIcon className={cn('size-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Rotation results */}
      {rotationResults && (
        <Card className={adminStyles.adminAlertCardClass}>
          <CardHeader className={adminStyles.adminAlertHeaderClass}>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={adminStyles.adminAlertTitleStyle}>
              <ExclamationTriangleIcon className="size-4" />
              New secrets — copy and deploy before closing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {rotationResults.map((r) =>
              r.error ? (
                <div key={r.slug} className="flex items-center gap-2 text-sm text-red-400">
                  <span className="font-mono font-semibold">{r.slug}</span>
                  <span className="text-red-500">— {r.error}</span>
                </div>
              ) : (
                <div key={r.slug} className={adminStyles.adminSecretBoxClass}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={adminStyles.adminSecretSlugClass}>{r.slug}</span>
                  </div>
                  <div className={adminStyles.adminSecretValueClass}>
                    <span>{r.client_secret}</span>
                    <CopyButton value={r.client_secret} />
                  </div>
                </div>
              )
            )}
            <Button variant="ghost" size="sm" onClick={() => setRotationResults(null)} className={adminStyles.adminDismissClass}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {listError && (
        <p className="text-sm text-red-400">{listError}</p>
      )}

      {/* Table */}
      <Card className={adminStyles.adminCardClass}>
        <div className="overflow-x-auto">
          <table className={cn('w-full text-sm', adminStyles.isCorporate ? 'text-slate-900' : 'text-slate-300')}>
            <thead>
              <tr className={adminStyles.adminCardTableHeadRowClass}>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection!.allOnPageSelected}
                    onChange={selection!.toggleAll}
                    className={adminStyles.adminCheckboxClass}
                    title="Select all on this page"
                  />
                </th>
                <th className={adminStyles.adminThClass}>Name</th>
                <th className={adminStyles.adminThClass}>Slug</th>
                <th className={adminStyles.adminThClass}>Base URL</th>
                <th className={cn(adminStyles.adminThClass, 'text-right')}>
                  <span className="flex items-center justify-end gap-1">
                    <ClockIcon className="size-4" /> Days since rotation
                  </span>
                </th>
                <th className={cn(adminStyles.adminThClass, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={adminStyles.adminEmptyCellClass}>Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={adminStyles.adminEmptyCellClass}>No services found</td>
                </tr>
              ) : (
                items.map((svc) => (
                  <tr
                    key={svc.uuid}
                    className={cn(
                      adminStyles.adminTrClass,
                      selected.has(svc.slug) && adminStyles.adminTrSelectedClass,
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(svc.slug)}
                        onChange={() => selection!.toggleOne(svc.slug)}
                        className={adminStyles.adminCheckboxClass}
                      />
                    </td>
                    <td className={adminStyles.adminTdPrimaryClass}>{svc.name}</td>
                    <td className={adminStyles.adminTdMonoClass}>{svc.slug}</td>
                    <td className={adminStyles.adminTdMonoSubClass}>
                      {svc.base_url}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-mono text-xs', rotationWarningClass(svc.days_since_rotation, adminStyles.isCorporate))}>
                        {svc.days_since_rotation !== null ? `${svc.days_since_rotation}d` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Audit history"
                          onClick={() => openAudits(svc)}
                        >
                          <ClockIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit service"
                          onClick={() => openEditSheet(svc)}
                        >
                          <PencilSquareIcon className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <RemoteListPagination
          total={total}
          totalLabel={total === 1 ? 'service' : 'services'}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Audit Sheet                                                         */}
      {/* ------------------------------------------------------------------ */}
      <AuditHistorySheet
        open={!!auditService}
        onOpenChange={(open) => { if (!open) setAuditService(null); }}
        title={(
          <>
            Audit history — <span className="font-mono normal-case">{auditService?.slug}</span>
          </>
        )}
        sections={[
          buildAuditSection(
            {
              key: 'service',
              kind: 'service',
              title: (
                <>
                  Service{' '}
                  <span className="font-mono normal-case text-slate-600">
                    ({auditService?.uuid})
                  </span>
                </>
              ),
              actions: serviceAudits.total > 0 ? (
                <AuditCsvDownloadButton
                  downloading={downloadingCSV === 'service'}
                  onClick={() => handleDownloadCSV('service')}
                  className={adminStyles.adminIconActionClass}
                />
              ) : null,
              emptyMessage: 'No service records.',
              errorMessage: 'Failed to load service audit.',
            },
            serviceAudits,
          ),
          buildAuditSection(
            {
              key: 'credential',
              kind: 'credential',
              title: (
                <>
                  Credential{' '}
                  <span className="font-mono normal-case text-slate-600">
                    ({credentialAudits.items[0]?.credential_uuid ?? auditService?.credential_uuid ?? '—'})
                  </span>
                </>
              ),
              actions: credentialAudits.total > 0 ? (
                <AuditCsvDownloadButton
                  downloading={downloadingCSV === 'credential'}
                  onClick={() => handleDownloadCSV('credential')}
                  className={adminStyles.adminIconActionClass}
                />
              ) : null,
              emptyMessage: 'No credential records.',
              errorMessage: 'Failed to load credential audit.',
            },
            credentialAudits,
          ),
        ]}
      />

      <ServiceFormSheet
        open={formSheet !== null}
        mode={formSheet?.mode ?? 'create'}
        draft={formDraft}
        saving={formSaving}
        error={formError}
        onOpenChange={(open) => {
          if (!open) {
            closeFormSheet();
          }
        }}
        onDraftChange={(patch) => setFormDraft((previous) => ({ ...previous, ...patch }))}
        onSubmit={() => void submitFormSheet()}
      />
    </div>
  );
}
