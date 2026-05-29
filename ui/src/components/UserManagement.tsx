import { useCallback, useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import PlatformRolePicker from '@/components/PlatformRolePicker';
import {
  USER_FIELD_LABEL_CLASS,
  USER_INPUT_CLASS,
  USER_PRIMARY_BUTTON_CLASS,
  USER_SHEET_BODY_CLASS,
  USER_SHEET_CONTENT_CLASS,
  USER_SHEET_HEADER_CLASS,
  USER_SHEET_TITLE_CLASS,
  USER_SHEET_TITLE_STYLE,
} from '@/components/userFormStyles';

const USER_API = import.meta.env.VITE_USER_API_URL ?? 'http://localhost:8018';
const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8014';
const PAGE_SIZE = 20;

interface TenantSummary {
  uuid: string;
  name: string;
  idp_id: string;
}

interface UserRecord {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  platform_roles: string[];
}

interface UserListResponse {
  items: UserRecord[];
  total: number;
  page: number;
  page_size: number;
}

interface AuditItem {
  history_uuid: string | null;
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  platform_roles: string[];
  changed_at: string;
  changed_by_uuid: string;
  changed_by_type: number;
  change_type: number;
}

interface Props {
  token: string;
  activeRole: string;
  /** All Tier-1 JWT roles (operator, clinician, patient) for role assignment. */
  tier1Roles: string[];
  sessionTenantUuid?: string | null;
}

function displayName(user: UserRecord): string {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || user.idp_id;
}

export default function UserManagement({ token, activeRole, tier1Roles, sessionTenantUuid }: Props) {
  const [items, setItems] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [roleCatalog, setRoleCatalog] = useState<string[]>([]);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});

  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [auditUser, setAuditUser] = useState<UserRecord | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'X-Active-Role': activeRole,
      'Content-Type': 'application/json',
    }),
    [token, activeRole],
  );

  const fetchRoles = useCallback(async () => {
    const res = await fetch(`${USER_API}/api/v1/roles`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setRoleCatalog(data.platform_roles ?? []);
  }, [authHeaders]);

  const resolveTenantName = useCallback(
    async (tenantUuid: string) => {
      if (!tenantUuid) return;
      const res = await fetch(`${AUTH_API}/api/v1/tenants/${tenantUuid}`, { headers: authHeaders() });
      if (!res.ok) return;
      const tenant: TenantSummary = await res.json();
      setTenantNames((prev) => {
        if (prev[tenant.uuid]) return prev;
        return { ...prev, [tenant.uuid]: tenant.name };
      });
    },
    [authHeaders],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('q', debouncedSearch);
      const res = await fetch(`${USER_API}/api/v1/users?${params}`, { headers: authHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data: UserListResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      setListError(
        msg === 'Failed to fetch'
          ? `Cannot reach user service at ${USER_API} (start cdp-user via docker-compose.local.yml)`
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, page, debouncedSearch]);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [fetchRoles, fetchUsers]);

  useEffect(() => {
    if (sessionTenantUuid) {
      void resolveTenantName(sessionTenantUuid);
    }
  }, [sessionTenantUuid, resolveTenantName]);

  useEffect(() => {
    const unique = [...new Set(items.map((user) => user.tenant_uuid).filter(Boolean))];
    unique.forEach((tenantUuid) => {
      void resolveTenantName(tenantUuid);
    });
  }, [items, resolveTenantName]);

  const openEdit = (user: UserRecord) => {
    setEditUser({ ...user, platform_roles: [...user.platform_roles] });
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`${USER_API}/api/v1/users/${editUser.uuid}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          email: editUser.email,
          platform_roles: editUser.platform_roles,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const loadAudits = async (user: UserRecord) => {
    setAuditUser(user);
    setAuditLoading(true);
    setAuditItems([]);
    try {
      const res = await fetch(
        `${USER_API}/api/v1/users/${user.uuid}/audits?page=1&page_size=20`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuditItems(data.items ?? []);
    } finally {
      setAuditLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card className="border-slate-800 bg-slate-950/80">
        <CardHeader>
          <CardTitle className="text-cyan-300 font-mono uppercase tracking-wider text-sm">
            Platform users
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Registry rows are provisioned on login (Stage 3). Edit existing users below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, idp id…"
              className="pl-9 bg-slate-900 border-slate-700"
            />
          </div>
          {listError && <p className="text-sm text-red-400">{listError}</p>}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-500 bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  items.map((user) => (
                    <tr key={user.uuid} className="border-t border-slate-800 hover:bg-slate-900/50">
                      <td className="px-3 py-2 text-white">{displayName(user)}</td>
                      <td className="px-3 py-2 text-slate-400">{user.email ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400 max-w-xs truncate">
                        {user.platform_roles.join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {tenantNames[user.tenant_uuid] ?? `${user.tenant_uuid.slice(0, 8)}…`}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Audit history"
                            onClick={() => loadAudits(user)}
                          >
                            <ClockIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Edit user"
                            onClick={() => openEdit(user)}
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
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {total} user{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="py-1">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <SheetContent side="right" className={USER_SHEET_CONTENT_CLASS}>
          <SheetHeader className={USER_SHEET_HEADER_CLASS}>
            <SheetTitle className={USER_SHEET_TITLE_CLASS} style={USER_SHEET_TITLE_STYLE}>
              Edit user
            </SheetTitle>
          </SheetHeader>
          {editUser && (
            <div className={USER_SHEET_BODY_CLASS}>
              <div>
                <label className={USER_FIELD_LABEL_CLASS}>User UUID</label>
                <p className="font-mono text-xs text-slate-400 break-all">{editUser.uuid}</p>
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS}>Tenant</label>
                <p className="text-sm text-slate-200">
                  {tenantNames[editUser.tenant_uuid] ?? editUser.tenant_uuid}
                </p>
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS}>IdP ID</label>
                <p className="font-mono text-xs text-slate-400 break-all">{editUser.idp_id}</p>
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS} htmlFor="edit-first-name">
                  First name
                </label>
                <Input
                  id="edit-first-name"
                  className={USER_INPUT_CLASS}
                  value={editUser.first_name ?? ''}
                  onChange={(e) =>
                    setEditUser((u) => (u ? { ...u, first_name: e.target.value } : u))
                  }
                />
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS} htmlFor="edit-last-name">
                  Last name
                </label>
                <Input
                  id="edit-last-name"
                  className={USER_INPUT_CLASS}
                  value={editUser.last_name ?? ''}
                  onChange={(e) =>
                    setEditUser((u) => (u ? { ...u, last_name: e.target.value } : u))
                  }
                />
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS} htmlFor="edit-email">
                  Email
                </label>
                <Input
                  id="edit-email"
                  type="email"
                  className={USER_INPUT_CLASS}
                  value={editUser.email ?? ''}
                  onChange={(e) =>
                    setEditUser((u) => (u ? { ...u, email: e.target.value } : u))
                  }
                />
              </div>
              <div>
                <label className={USER_FIELD_LABEL_CLASS}>Platform roles</label>
                <p className="text-xs text-slate-500 mb-2">
                  Assignable under your Tier-1 roles (
                  {tier1Roles.length > 0 ? tier1Roles.join(', ') : 'none on JWT'})
                </p>
                <PlatformRolePicker
                  roleCatalog={roleCatalog}
                  selected={editUser.platform_roles}
                  onChange={(platform_roles) =>
                    setEditUser((u) => (u ? { ...u, platform_roles } : u))
                  }
                  assignerTier1Roles={tier1Roles}
                />
              </div>
              {editError && <p className="text-sm text-red-400">{editError}</p>}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className={USER_PRIMARY_BUTTON_CLASS}
                  disabled={editSaving}
                  onClick={submitEdit}
                >
                  {editSaving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!auditUser} onOpenChange={(open) => !open && setAuditUser(null)}>
        <SheetContent side="right" className={USER_SHEET_CONTENT_CLASS}>
          <SheetHeader className={USER_SHEET_HEADER_CLASS}>
            <SheetTitle className={USER_SHEET_TITLE_CLASS} style={USER_SHEET_TITLE_STYLE}>
              Audit — {auditUser ? displayName(auditUser) : ''}
            </SheetTitle>
          </SheetHeader>
          <div className={`${USER_SHEET_BODY_CLASS} pt-0`}>
            {auditLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : auditItems.length === 0 ? (
              <p className="text-slate-500 text-sm">No history rows yet</p>
            ) : (
              auditItems.map((row) => (
                <div
                  key={row.history_uuid ?? row.changed_at}
                  className="rounded border border-slate-800 p-3 text-xs text-slate-400"
                >
                  <div className="text-slate-300 mb-1">
                    {new Date(row.changed_at).toLocaleString()} —{' '}
                    {row.change_type === 1 ? 'created' : row.change_type === 2 ? 'updated' : 'deleted'}
                  </div>
                  <div>Actor: {row.changed_by_uuid}</div>
                  <div>Roles: {(row.platform_roles ?? []).join(', ') || '—'}</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
