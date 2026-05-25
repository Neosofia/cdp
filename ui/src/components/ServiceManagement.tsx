import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClockIcon,
  PencilSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceItem {
  uuid: string;
  name: string;
  slug: string;
  base_url: string;
  credential_uuid: string | null;
  credential_changed_at: string | null;
  days_since_rotation: number | null;
}

interface ServiceListResponse {
  items: ServiceItem[];
  total: number;
  page: number;
  page_size: number;
}

interface AuditItem {
  history_uuid: string | null;
  source: 'service' | 'credential';
  credential_uuid: string | null;
  name: string | null;
  slug: string | null;
  base_url: string | null;
  changed_at: string;
  changed_by_uuid: string;
  changed_by_type: number;
  changed_by_name: string | null;
  change_type: number;
}

interface AuditResponse {
  service_uuid: string;
  slug: string;
  total: number;
  page: number;
  page_size: number;
  items: AuditItem[];
}

interface RotationResult {
  slug: string;
  client_secret: string;
  error?: string;
}

interface Props {
  token: string;
  activeRole: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
const PAGE_SIZE = 20;
const AUDIT_PAGE_SIZE = 5;

function downloadCSV(rows: AuditItem[], source: 'service' | 'credential', slug: string): void {
  const headers = source === 'service'
    ? ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Name', 'Slug', 'Base URL']
    : ['Changed at (UTC)', 'Event', 'Actor Type', 'Actor UUID', 'Secret'];
  const escape = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map(r => {
      const base = [
        escape(new Date(r.changed_at).toLocaleString(undefined, { timeZone: 'UTC' })),
        escape(r.change_type === 1 ? 'created' : r.change_type === 2 ? 'updated' : 'deleted'),
        escape(r.changed_by_type === 1 ? 'User' : 'Service'),
        escape(r.changed_by_uuid),
      ];
      return source === 'service'
        ? [...base, escape(r.name), escape(r.slug), escape(r.base_url)].join(',')
        : [...base, '"***"'].join(',');
    }),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-${source}-audit.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function rotationWarningClass(days: number | null): string {
  if (days === null) return '';
  if (days >= 365) return 'text-red-400';
  if (days >= 300) return 'text-amber-400';
  return 'text-slate-400';
}

function AuditTable({ rows, source }: { rows: AuditItem[]; source: 'service' | 'credential' }) {
  return (
    <table className="min-w-max max-w-full text-xs table-auto">
      <colgroup>
        <col className="w-40" />
        <col className="w-16" />
        <col className="w-40" />
        {source === 'service' ? (<><col /><col /><col /></>) : (<col />)}
      </colgroup>
      <thead>
        <tr className="border-b border-slate-700/60">
          <th className="text-left py-2 pr-3 whitespace-nowrap text-xs font-semibold text-slate-500 uppercase tracking-widest">Changed at (UTC)</th>
          <th className="text-left py-2 pr-3 whitespace-nowrap text-xs font-semibold text-slate-500 uppercase tracking-widest">Event</th>
          <th className="text-left py-2 pr-3 whitespace-nowrap text-xs font-semibold text-slate-500 uppercase tracking-widest">Actor</th>
          {source === 'service' ? (
            <>
              <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Name</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Slug</th>
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Base URL</th>
            </>
          ) : (
            <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Secret</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.history_uuid ?? `${row.source}-${row.changed_at}`} className="border-b border-slate-800/60">
            <td className="py-2 pr-3 font-mono text-slate-400 whitespace-nowrap">
              {new Date(row.changed_at).toLocaleString(undefined, { timeZone: 'UTC' })}
            </td>
            <td className="py-2 pr-3 text-slate-300 capitalize whitespace-nowrap">{changeTypeLabel(row.change_type)}</td>
            <td className="py-2 pr-3 whitespace-nowrap">{actorLabel(row.changed_by_type, row.changed_by_uuid, row.changed_by_name)}</td>
            {source === 'service' ? (
              <>
                <td className="py-2 pr-3 text-slate-300">{row.name ?? '—'}</td>
                <td className="py-2 pr-3 font-mono text-slate-400">{row.slug ?? '—'}</td>
                <td className="py-2 font-mono text-slate-500 truncate">{row.base_url ?? '—'}</td>
              </>
            ) : (
              <td className="py-2 font-mono text-slate-600">***</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function changeTypeLabel(ct: number): string {
  return ct === 1 ? 'created' : ct === 2 ? 'updated' : ct === 3 ? 'deleted' : String(ct);
}

const BOOTSTRAP_UUID = '00000000-0000-7000-8000-000000000000';

function actorLabel(changedByType: number, changedByUuid: string, changedByName?: string | null) {
  if (changedByUuid === BOOTSTRAP_UUID) {
    return (
      <span title={changedByUuid}>
        <Badge variant="outline" className="border-slate-600 text-slate-400">Bootstrap</Badge>
      </span>
    );
  }
  const truncated = changedByUuid ? changedByUuid.slice(0, 8) : '—';
  if (changedByType === 1) {
    return (
      <span title={changedByUuid} className="inline-flex items-center gap-1">
        <Badge variant="outline" className="border-cyan-700/60 text-cyan-400">User</Badge>
        {changedByName
          ? <span className="text-slate-300">{changedByName}</span>
          : <span className="font-mono text-slate-500">{truncated}</span>}
      </span>
    );
  }
  return (
    <span title={changedByUuid} className="inline-flex items-center gap-1">
      <Badge variant="outline" className="border-amber-700 text-amber-400">Service</Badge>
      <span className="font-mono text-slate-500">{truncated}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CopyButton — copies text and shows a tick for 2 s
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
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
      className="ml-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied
        ? <CheckIcon className="size-4 text-green-400" />
        : <ClipboardDocumentIcon className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ServiceManagement({ token, activeRole }: Props) {
  // List state
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Rotation results
  const [rotationResults, setRotationResults] = useState<RotationResult[] | null>(null);
  const [rotating, setRotating] = useState(false);

  // Audit sheet
  const [auditService, setAuditService] = useState<ServiceItem | null>(null);
  const [serviceAudits, setServiceAudits] = useState<AuditResponse | null>(null);
  const [credentialAudits, setCredentialAudits] = useState<AuditResponse | null>(null);
  const [serviceAuditPage, setServiceAuditPage] = useState(1);
  const [credentialAuditPage, setCredentialAuditPage] = useState(1);
  const [serviceAuditLoading, setServiceAuditLoading] = useState(false);
  const [credentialAuditLoading, setCredentialAuditLoading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState<'service' | 'credential' | null>(null);

  // New service sheet
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [newSaving, setNewSaving] = useState(false);

  // Edit sheet
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // ---------------------------------------------------------------------------
  // Fetch service list
  // ---------------------------------------------------------------------------

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`${AUTH_API}/api/services?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Active-Role': activeRole,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ServiceListResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setSelected(new Set()); // clear selection on reload
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [token, activeRole, page, debouncedSearch]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.slug)));
    }
  };

  const toggleOne = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Rotate selected
  // ---------------------------------------------------------------------------

  const rotateSelected = async () => {
    if (selected.size === 0) return;
    setRotating(true);
    setRotationResults(null);

    const slugs = Array.from(selected);
    const results: RotationResult[] = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const res = await fetch(`${AUTH_API}/api/services/${encodeURIComponent(slug)}/rotate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Active-Role': activeRole,
            },
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { slug, client_secret: '', error: body.error ?? `HTTP ${res.status}` };
          }
          const data = await res.json();
          return { slug, client_secret: data.client_secret as string };
        } catch (e) {
          return { slug, client_secret: '', error: e instanceof Error ? e.message : 'Unknown error' };
        }
      })
    );

    setRotationResults(results);
    setRotating(false);
    fetchServices(); // refresh the list to show updated timestamps
  };

  // ---------------------------------------------------------------------------
  // Audit sheet
  // ---------------------------------------------------------------------------

  const fetchSourceAudits = async (
    svc: ServiceItem,
    source: 'service' | 'credential',
    pageNum: number,
    isNew: boolean,
  ) => {
    const setData = source === 'service' ? setServiceAudits : setCredentialAudits;
    const setLoading = source === 'service' ? setServiceAuditLoading : setCredentialAuditLoading;
    setLoading(true);
    // Only wipe previous data when opening a different service. Keeping stale
    // data visible during pagination prevents Radix from closing the sheet when
    // the focused pagination button is momentarily unmounted.
    if (isNew) setData(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        page_size: String(AUDIT_PAGE_SIZE),
        source,
      });
      const res = await fetch(
        `${AUTH_API}/api/services/${encodeURIComponent(svc.slug)}/audits?${params}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Active-Role': activeRole } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openAudits = (svc: ServiceItem) => {
    const isNew = !auditService || auditService.slug !== svc.slug;
    setAuditService(svc);
    if (isNew) {
      setServiceAuditPage(1);
      setCredentialAuditPage(1);
    }
    void fetchSourceAudits(svc, 'service', isNew ? 1 : serviceAuditPage, isNew);
    void fetchSourceAudits(svc, 'credential', isNew ? 1 : credentialAuditPage, isNew);
  };

  const handleServicePageChange = (newPage: number) => {
    if (auditService && !serviceAuditLoading) {
      setServiceAuditPage(newPage);
      void fetchSourceAudits(auditService, 'service', newPage, false);
    }
  };

  const handleCredentialPageChange = (newPage: number) => {
    if (auditService && !credentialAuditLoading) {
      setCredentialAuditPage(newPage);
      void fetchSourceAudits(auditService, 'credential', newPage, false);
    }
  };

  const handleDownloadCSV = async (source: 'service' | 'credential') => {
    if (!auditService) return;
    const sourceData = source === 'service' ? serviceAudits : credentialAudits;
    if (!sourceData) return;
    setDownloadingCSV(source);
    try {
      const FETCH_SIZE = 100;
      const total = sourceData.total;
      const pages = Math.ceil(total / FETCH_SIZE);
      const allRows: AuditItem[] = [];
      for (let p = 1; p <= pages; p++) {
        const params = new URLSearchParams({ page: String(p), page_size: String(FETCH_SIZE), source });
        const res = await fetch(
          `${AUTH_API}/api/services/${encodeURIComponent(auditService.slug)}/audits?${params}`,
          { headers: { Authorization: `Bearer ${token}`, 'X-Active-Role': activeRole } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: AuditResponse = await res.json();
        allRows.push(...data.items);
      }
      downloadCSV(allRows, source, auditService.slug);
    } finally {
      setDownloadingCSV(null);
    }
  };

  // ---------------------------------------------------------------------------
  // New service sheet
  // ---------------------------------------------------------------------------

  const openNew = () => {
    setNewName('');
    setNewSlug('');
    setNewBaseUrl('');
    setNewError(null);
    setNewSheetOpen(true);
  };

  const createService = async () => {
    setNewSaving(true);
    setNewError(null);
    try {
      const res = await fetch(`${AUTH_API}/api/services`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Active-Role': activeRole,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName, slug: newSlug, base_url: newBaseUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setNewError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setNewSheetOpen(false);
      setRotationResults([{ slug: newSlug, client_secret: data.client_secret }]);
      fetchServices();
    } catch (e) {
      setNewError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setNewSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit sheet
  // ---------------------------------------------------------------------------

  const openEdit = (svc: ServiceItem) => {
    setEditService(svc);
    setEditName(svc.name);
    setEditSlug(svc.slug);
    setEditBaseUrl(svc.base_url);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editService) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `${AUTH_API}/api/services/${encodeURIComponent(editService.slug)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Active-Role': activeRole,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: editName, slug: editSlug, base_url: editBaseUrl }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEditError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setEditService(null);
      fetchServices();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
            className="pl-8 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            onClick={rotateSelected}
            disabled={rotating}
            className="gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 hover:text-amber-200"
          >
            <ArrowPathIcon className={cn('size-4', rotating && 'animate-spin')} />
            {rotating ? 'Rotating…' : `Rotate ${selected.size} secret${selected.size > 1 ? 's' : ''}`}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={openNew}
          className="gap-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200"
        >
          <PlusIcon className="size-4" />
          New service
        </Button>
        <Button variant="outline" size="icon" onClick={fetchServices} title="Refresh" disabled={loading}>
          <ArrowPathIcon className={cn('size-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Rotation results */}
      {rotationResults && (
        <Card className="border-amber-500/30 bg-slate-950">
          <CardHeader className="py-3 px-4 border-b border-amber-500/20">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: 'rgba(251,191,36,0.8)' }}>
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
                <div key={r.slug} className="rounded-lg border border-cyan-500/20 bg-slate-900 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{r.slug}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs text-cyan-200 break-all">
                    <span>{r.client_secret}</span>
                    <CopyButton value={r.client_secret} />
                  </div>
                </div>
              )
            )}
            <Button variant="ghost" size="sm" onClick={() => setRotationResults(null)} className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300">
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
      <Card className="border-slate-700/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/60">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll}
                    className="accent-cyan-400 size-4 rounded cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 whitespace-nowrap">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 whitespace-nowrap">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 whitespace-nowrap hidden md:table-cell">Base URL</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400 whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1">
                    <ClockIcon className="size-4" /> Days since rotation
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No services found</td>
                </tr>
              ) : (
                items.map((svc) => (
                  <tr
                    key={svc.uuid}
                    className={cn(
                      'border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors',
                      selected.has(svc.slug) && 'bg-slate-800/60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(svc.slug)}
                        onChange={() => toggleOne(svc.slug)}
                        className="accent-cyan-400 size-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">{svc.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{svc.slug}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 hidden md:table-cell max-w-xs truncate">
                      {svc.base_url}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-mono text-xs', rotationWarningClass(svc.days_since_rotation))}>
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
                          onClick={() => openEdit(svc)}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/60 text-xs text-slate-400">
            <span>{total} service{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <span>Page {page} / {totalPages}</span>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Audit Sheet                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={!!auditService} onOpenChange={(open) => { if (!open) setAuditService(null); }}>
        <SheetContent side="right" className="bg-slate-950 border-slate-700 text-slate-300 overflow-y-auto" style={{ width: '80vw', maxWidth: '80vw' }}>
          <SheetHeader className="border-b border-slate-700/60 pb-4 mb-6">
            <SheetTitle className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(34,211,238,0.7)' }}>
              Audit history — <span className="font-mono normal-case">{auditService?.slug}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="px-6 pb-6 space-y-6">
            {/* Service section */}
            <div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Service <span className="font-mono normal-case text-slate-600">({serviceAudits?.service_uuid ?? auditService?.uuid})</span>
                  </h3>
                  {serviceAudits && serviceAudits.total > 0 && (
                    <button onClick={() => handleDownloadCSV('service')} disabled={downloadingCSV === 'service'} className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40" title="Download full history as CSV">
                      {downloadingCSV === 'service'
                        ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        : <ArrowDownTrayIcon className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-112 min-h-64 border border-slate-800/70 rounded-lg bg-slate-950/60 p-2">
                  {serviceAuditLoading && !serviceAudits ? (
                    <p className="text-slate-400 text-xs">Loading…</p>
                  ) : !serviceAudits ? (
                    <p className="text-red-400 text-xs">Failed to load service audit.</p>
                  ) : serviceAudits.items.length === 0 ? (
                    <p className="text-slate-600 text-xs">No service records.</p>
                  ) : (
                    <AuditTable rows={serviceAudits.items} source="service" />
                  )}
                </div>
                {serviceAudits && serviceAudits.total > AUDIT_PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>{serviceAudits.total} records</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="xs" disabled={serviceAuditPage <= 1} onClick={() => handleServicePageChange(serviceAuditPage - 1)}>Prev</Button>
                      <span>Page {serviceAuditPage} / {Math.ceil(serviceAudits.total / AUDIT_PAGE_SIZE)}</span>
                      <Button variant="outline" size="xs" disabled={serviceAuditPage >= Math.ceil(serviceAudits.total / AUDIT_PAGE_SIZE)} onClick={() => handleServicePageChange(serviceAuditPage + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Credential section */}
            <div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Credential <span className="font-mono normal-case text-slate-600">({credentialAudits?.items[0]?.credential_uuid ?? '—'})</span>
                  </h3>
                  {credentialAudits && credentialAudits.total > 0 && (
                    <button onClick={() => handleDownloadCSV('credential')} disabled={downloadingCSV === 'credential'} className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40" title="Download full history as CSV">
                      {downloadingCSV === 'credential'
                        ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        : <ArrowDownTrayIcon className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-112 min-h-64 border border-slate-800/70 rounded-lg bg-slate-950/60 p-2">
                  {credentialAuditLoading && !credentialAudits ? (
                    <p className="text-slate-400 text-xs">Loading…</p>
                  ) : !credentialAudits ? (
                    <p className="text-red-400 text-xs">Failed to load credential audit.</p>
                  ) : credentialAudits.items.length === 0 ? (
                    <p className="text-slate-600 text-xs">No credential records.</p>
                  ) : (
                    <AuditTable rows={credentialAudits.items} source="credential" />
                  )}
                </div>
                {credentialAudits && credentialAudits.total > AUDIT_PAGE_SIZE && (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>{credentialAudits.total} records</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="xs" disabled={credentialAuditPage <= 1} onClick={() => handleCredentialPageChange(credentialAuditPage - 1)}>Prev</Button>
                      <span>Page {credentialAuditPage} / {Math.ceil(credentialAudits.total / AUDIT_PAGE_SIZE)}</span>
                      <Button variant="outline" size="xs" disabled={credentialAuditPage >= Math.ceil(credentialAudits.total / AUDIT_PAGE_SIZE)} onClick={() => handleCredentialPageChange(credentialAuditPage + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* New Service Sheet                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={newSheetOpen} onOpenChange={(open) => { if (!open) setNewSheetOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 border-slate-700 text-slate-300 p-6">
          <SheetHeader className="border-b border-slate-700/60 pb-4 mb-6">
            <SheetTitle className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(34,211,238,0.7)' }}>New service</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
                placeholder="My Service"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Slug</label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
                placeholder="my-service"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Base URL</label>
              <Input
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
                placeholder="http://my-service:8000"
                type="url"
              />
            </div>

            {newError && (
              <p className="text-sm text-red-400">{newError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={createService}
                disabled={newSaving}
                variant="ghost"
                className="flex-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200"
              >
                {newSaving ? 'Creating…' : 'Create service'}
              </Button>
              <Button variant="outline" onClick={() => setNewSheetOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Edit Sheet                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={!!editService} onOpenChange={(open) => { if (!open) setEditService(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 border-slate-700 text-slate-300 p-6">
          <SheetHeader className="border-b border-slate-700/60 pb-4 mb-6">
            <SheetTitle className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(34,211,238,0.7)' }}>Edit service</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Slug</label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Base URL</label>
              <Input
                value={editBaseUrl}
                onChange={(e) => setEditBaseUrl(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
                type="url"
              />
            </div>

            {editError && (
              <p className="text-sm text-red-400">{editError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={saveEdit}
                disabled={editSaving}
                variant="ghost"
                className="flex-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200"
              >
                {editSaving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditService(null)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
