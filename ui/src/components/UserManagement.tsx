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
import {
  AuditHistorySheet,
  type UserAuditItem,
} from '@/components/AuditHistorySheet';
import PlatformRolePicker from '@/components/PlatformRolePicker';
import type { RoleCatalogSnapshot } from '@/lib/roleCatalogApi';
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
const AUDIT_PAGE_SIZE = 10;

interface TenantSummary {
  uuid: string;
  name: string;
  display_code?: string | null;
  idp_id: string;
}

interface UserRecord {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
}

function formatTenantLabel(name: string, displayCode?: string | null): string {
  const code = displayCode?.trim();
  return code ? `${name} (${code})` : name;
}

interface UserListResponse {
  items: UserRecord[];
  total: number;
  page: number;
  page_size: number;
}

interface AuditResponse {
  total: number;
  page: number;
  page_size: number;
  items: UserAuditItem[];
}

interface Props {
  token: string;
  activeActor: string;
  /** Selected tier-2 org role (e.g. cro.clinical-ops) for study-scoped API calls. */
  activeOrgRole?: string;
  /** All Tier-1 JWT roles (operator, clinician, patient) for role assignment. */
  sessionActors: string[];
  roleCatalog?: RoleCatalogSnapshot | null;
  profileUuid?: string;
  /** Refetch session profile + role catalog after the signed-in user updates their own roles. */
  onSelfRolesUpdated?: () => void;
  sessionTenantUuid?: string | null;
}

function displayName(user: UserRecord): string {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || user.idp_id;
}

export default function UserManagement({
  token,
  activeActor,
  activeOrgRole = '',
  sessionActors,
  roleCatalog: roleCatalogSnapshot,
  profileUuid,
  onSelfRolesUpdated,
  sessionTenantUuid,
}: Props) {
  const [items, setItems] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<string[]>(
    roleCatalogSnapshot?.roles ?? [],
  );
  const [roleDefinitions, setRoleDefinitions] = useState(
    roleCatalogSnapshot?.role_definitions ?? [],
  );
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});

  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [auditUser, setAuditUser] = useState<UserRecord | null>(null);
  const [auditItems, setAuditItems] = useState<UserAuditItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const authHeaders = useCallback(
    () => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'X-Active-Actor': activeActor,
        'Content-Type': 'application/json',
      };
      if (activeOrgRole) {
        headers['X-Active-Org-Role'] = activeOrgRole;
      }
      return headers;
    },
    [token, activeActor, activeOrgRole],
  );

  useEffect(() => {
    if (roleCatalogSnapshot) {
      setAssignableRoles(roleCatalogSnapshot.roles ?? []);
      setRoleDefinitions(roleCatalogSnapshot.role_definitions ?? []);
    }
  }, [roleCatalogSnapshot]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch(`${USER_API}/api/v1/roles`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = (await res.json()) as RoleCatalogSnapshot;
    setAssignableRoles(data.roles ?? []);
    setRoleDefinitions(data.role_definitions ?? []);
  }, [authHeaders]);

  const resolveTenantName = useCallback(
    async (tenantUuid: string) => {
      if (!tenantUuid) return;
      const res = await fetch(`${AUTH_API}/api/v1/tenants/${tenantUuid}`, { headers: authHeaders() });
      if (!res.ok) return;
      const tenant: TenantSummary = await res.json();
      setTenantNames((prev) => {
        if (prev[tenant.uuid]) return prev;
        return { ...prev, [tenant.uuid]: formatTenantLabel(tenant.name, tenant.display_code) };
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
    setEditUser({ ...user, roles: [...user.roles] });
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
          display_code: editUser.display_code,
          roles: editUser.roles,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
      const savedUuid = editUser.uuid;
      setEditUser(null);
      fetchUsers();
      if (profileUuid && savedUuid === profileUuid) {
        onSelfRolesUpdated?.();
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const loadAudits = async (user: UserRecord, pageNum: number, reset: boolean) => {
    setAuditUser(user);
    setAuditLoading(true);
    setAuditError(null);
    if (reset) {
      setAuditItems([]);
      setAuditTotal(0);
    }
    try {
      const res = await fetch(
        `${USER_API}/api/v1/users/${user.uuid}/audits?page=${pageNum}&page_size=${AUDIT_PAGE_SIZE}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuditResponse = await res.json();
      setAuditItems(data.items ?? []);
      setAuditPage(data.page ?? pageNum);
      setAuditTotal(data.total ?? 0);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'Failed to load audit history');
    } finally {
      setAuditLoading(false);
    }
  };

  const openAudits = (user: UserRecord) => {
    setAuditPage(1);
    void loadAudits(user, 1, true);
  };

  const handleAuditPageChange = (newPage: number) => {
    if (auditUser && !auditLoading) {
      void loadAudits(auditUser, newPage, false);
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
              placeholder="Search name, email, display code, idp id…"
              className="pl-9 bg-slate-900 border-slate-700"
            />
          </div>
          {listError && <p className="text-sm text-red-400">{listError}</p>}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-500 bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Display code</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Roles</th>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Users appear after first login
                    </td>
                  </tr>
                ) : (
                  items.map((user) => (
                    <tr key={user.uuid} className="border-t border-slate-800 hover:bg-slate-900/50">
                      <td className="px-3 py-2 text-white">{displayName(user)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">
                        {user.display_code ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{user.email ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400 max-w-xs truncate">
                        {user.roles.join(', ') || '—'}
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
                            onClick={() => openAudits(user)}
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
                <label className={USER_FIELD_LABEL_CLASS} htmlFor="edit-display-code">
                  Display code
                </label>
                <Input
                  id="edit-display-code"
                  className={USER_INPUT_CLASS}
                  placeholder="e.g. DET-4035"
                  value={editUser.display_code ?? ''}
                  onChange={(e) =>
                    setEditUser((u) =>
                      u ? { ...u, display_code: e.target.value || null } : u,
                    )
                  }
                />
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
                  {sessionActors.length > 0 ? sessionActors.join(', ') : 'none on JWT'})
                </p>
                <PlatformRolePicker
                  roleCatalog={assignableRoles}
                  roleDefinitions={roleDefinitions}
                  selected={editUser.roles}
                  onChange={(roles) =>
                    setEditUser((u) => (u ? { ...u, roles } : u))
                  }
                  assignerActors={sessionActors}
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

      <AuditHistorySheet
        open={!!auditUser}
        onOpenChange={(open) => !open && setAuditUser(null)}
        title={(
          <>
            Audit history —{' '}
            {auditUser ? (
              <>
                <span className="normal-case text-slate-300">{displayName(auditUser)}</span>{' '}
                <span className="font-mono normal-case text-slate-600">({auditUser.uuid})</span>
              </>
            ) : null}
          </>
        )}
        sections={[
          {
            key: 'user',
            rows: auditError ? null : auditLoading && auditItems.length === 0 ? null : auditItems,
            loading: auditLoading && auditItems.length === 0,
            emptyMessage: 'No history rows yet',
            errorMessage: auditError ?? 'Failed to load audit history.',
            total: auditTotal,
            page: auditPage,
            pageSize: AUDIT_PAGE_SIZE,
            onPageChange: handleAuditPageChange,
            kind: 'user',
          },
        ]}
      />
    </div>
  );
}
