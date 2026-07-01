import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AuditHistorySheet,
  type UserAuditItem,
} from '@/shared/audit/AuditHistorySheet';
import RemoteListPagination from '@/shared/pagination/RemoteListPagination';
import UserRegistryEditSheet, {
  userToRegistryEditDraft,
  type UserRegistryEditDraft,
} from '@/shared/forms/UserRegistryEditSheet';
import { USER_API } from '@/shared/platform/apiBases';
import { fetchAuthTenant } from '@/shared/auth/authenticationApi';
import { buildAuditSection } from '@/shared/audit/buildAuditSection';
import { downloadUserAuditCsv } from '@/shared/audit/downloadAuditCsv';
import { usePaginatedAudit } from '@/shared/audit/usePaginatedAudit';
import { rolesInNamespace, rolesOutsideNamespace } from '@/shared/user-registry/roleNamespace';
import { uiResource } from '@/shared/core/uiCapability';
import { usePaginatedRemoteList } from '@/shared/pagination/usePaginatedRemoteList';
import { fetchRoleCatalog, roleCatalogForUi, type RoleCatalogSnapshot } from '@/shared/user-registry/roleCatalogApi';
import type { components } from '@/shared/api/generated/user.schema';
import { toUserFacingError, swallowOptionalEnrichmentError } from '@/shared/core/userFacingError';

type User = components['schemas']['User'];

import {
  fetchUserAudits,
  fetchUserListPage,
  updateUser,
  usesPlatformUserCatalog,
} from '@/shared/user-registry/userRegistryApi';
import { useUserFormStyles } from '@/components/userFormStyles';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

const PAGE_SIZE = 15;

function formatTenantLabel(name: string, displayCode?: string | null): string {
  const code = displayCode?.trim();
  return code ? `${name} (${code})` : name;
}

interface Props {
  token: string;
  activeActor: string;
  /** All Tier-1 JWT roles (operator, clinician, patient) for role assignment. */
  sessionActors: string[];
  roleCatalog?: RoleCatalogSnapshot | null;
  profileUuid?: string;
  /** Refetch session profile + role catalog after the signed-in user updates their own roles. */
  onSelfRolesUpdated?: () => void;
  sessionTenantUuid?: string | null;
  /** Capabilities entitlements for the active Tier-1 actor (ui::Feature tenant-user gates). */
  entitlements?: Record<string, boolean>;
}

function displayName(user: User): string {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || user.idp_id;
}

export default function UserManagement({
  token,
  activeActor,
  sessionActors,
  roleCatalog: roleCatalogSnapshot,
  profileUuid,
  onSelfRolesUpdated,
  sessionTenantUuid,
  entitlements = {},
}: Props) {
  const formStyles = useUserFormStyles();
  const adminStyles = usePatientViewStyles();
  const usePlatformCatalog = usesPlatformUserCatalog(activeActor);
  const canUpdateRoles =
    activeActor === 'operator' && Boolean(entitlements[uiResource('Feature', 'tenant-user:update-roles')]);
  const canViewAudit = Boolean(entitlements[uiResource('Feature', 'tenant-user:audit')]);
  const showRowActions = canUpdateRoles || canViewAudit;

  const canEditUser = useCallback(
    (user: User) =>
      canUpdateRoles &&
      Boolean(sessionTenantUuid) &&
      user.tenant_uuid === sessionTenantUuid,
    [canUpdateRoles, sessionTenantUuid],
  );

  const canAuditUser = useCallback(
    (user: User) =>
      canViewAudit &&
      Boolean(sessionTenantUuid) &&
      user.tenant_uuid === sessionTenantUuid,
    [canViewAudit, sessionTenantUuid],
  );

  const fetchUserPage = useCallback(
    async (pageNum: number, pageSize: number, searchQuery: string) => {
      if (!usePlatformCatalog && !sessionTenantUuid) {
        throw new Error('Missing tenant context. Sign in again or switch organization role.');
      }
      try {
        return await fetchUserListPage(token, activeActor, {
          tenantUuid: sessionTenantUuid,
          page: pageNum,
          pageSize,
          search: searchQuery,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load users';
        if (message === 'Failed to fetch') {
          throw new Error(
            `Cannot reach user service at ${USER_API} (start cdp-user via docker-compose.local.yml)`,
            { cause: error },
          );
        }
        throw error instanceof Error ? error : new Error(message);
      }
    },
    [token, activeActor, sessionTenantUuid, usePlatformCatalog],
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
    reload: reloadUsers,
  } = usePaginatedRemoteList({
    pageSize: PAGE_SIZE,
    fetchPage: fetchUserPage,
  });

  const [assignableRoles, setAssignableRoles] = useState<string[]>(
    roleCatalogSnapshot?.roles ?? [],
  );
  const [roleDefinitions, setRoleDefinitions] = useState(
    roleCatalogSnapshot?.role_definitions ?? [],
  );
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});

  const [editDraft, setEditDraft] = useState<UserRegistryEditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [auditUser, setAuditUser] = useState<User | null>(null);
  const [auditDownloading, setAuditDownloading] = useState(false);
  const pendingTenantFetches = useRef(new Set<string>());

  const fetchUserAuditPage = useCallback(
    async (pageNum: number, pageSize: number) => {
      if (!auditUser) {
        return { items: [], total: 0, page: pageNum, page_size: pageSize };
      }
      return fetchUserAudits(token, activeActor, auditUser.uuid, pageNum, pageSize);
    },
    [token, activeActor, auditUser],
  );

  const userAudits = usePaginatedAudit<UserAuditItem>({
    fetchPage: fetchUserAuditPage,
  });

  useEffect(() => {
    if (auditUser) {
      void userAudits.reload();
    } else {
      userAudits.reset();
    }
  }, [auditUser?.uuid]);

  const resolveTenantName = useCallback(
    async (tenantUuid: string) => {
      if (!tenantUuid || pendingTenantFetches.current.has(tenantUuid)) {
        return;
      }
      pendingTenantFetches.current.add(tenantUuid);
      try {
        const tenant = await fetchAuthTenant(token, activeActor, tenantUuid);
        setTenantNames((prev) => {
          if (prev[tenant.uuid]) return prev;
          return { ...prev, [tenant.uuid]: formatTenantLabel(tenant.name, tenant.display_code) };
        });
      } catch (error) {
        swallowOptionalEnrichmentError(error);
      } finally {
        pendingTenantFetches.current.delete(tenantUuid);
      }
    },
    [token, activeActor],
  );

  useEffect(() => {
    if (roleCatalogSnapshot) {
      setAssignableRoles(roleCatalogSnapshot.roles ?? []);
      setRoleDefinitions(roleCatalogSnapshot.role_definitions ?? []);
    }
  }, [roleCatalogSnapshot]);

  const fetchRoles = useCallback(async () => {
    if (!canUpdateRoles) {
      return;
    }
    try {
      const data = roleCatalogForUi(await fetchRoleCatalog(token, activeActor));
      setAssignableRoles(data.roles ?? []);
      setRoleDefinitions(data.role_definitions ?? []);
    } catch (error) {
      swallowOptionalEnrichmentError(error);
    }
  }, [token, activeActor, canUpdateRoles]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (sessionTenantUuid) {
      void resolveTenantName(sessionTenantUuid);
    }
  }, [sessionTenantUuid, resolveTenantName]);

  useEffect(() => {
    const unique = [...new Set(items.map((user) => user.tenant_uuid).filter(Boolean))];
    unique
      .filter((tenantUuid) => !tenantNames[tenantUuid])
      .forEach((tenantUuid) => {
        void resolveTenantName(tenantUuid);
      });
  }, [items, resolveTenantName, tenantNames]);

  const openEdit = (user: User) => {
    if (!canEditUser(user)) {
      return;
    }
    setEditDraft(userToRegistryEditDraft(user));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditDraft(null);
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editDraft) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const foreignRoles = rolesOutsideNamespace(editDraft.roles, 'platform');
      await updateUser(token, activeActor, editDraft.uuid, {
        first_name: editDraft.first_name,
        last_name: editDraft.last_name,
        email: editDraft.email,
        display_code: editDraft.display_code,
        roles: foreignRoles.length === 0 ? rolesInNamespace(editDraft.roles, 'platform') : undefined,
      });
      const savedUuid = editDraft.uuid;
      closeEdit();
      void reloadUsers();
      if (profileUuid && savedUuid === profileUuid) {
        onSelfRolesUpdated?.();
      }
    } catch (error) {
      setEditError(toUserFacingError(error, 'Update failed'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleAuditDownload = async () => {
    if (!auditUser) return;
    setAuditDownloading(true);
    try {
      downloadUserAuditCsv(await userAudits.exportAll(), auditUser.uuid);
    } finally {
      setAuditDownloading(false);
    }
  };

  const openAudits = (user: User) => {
    if (!canAuditUser(user)) {
      return;
    }
    setAuditUser(user);
  };

  const listTitle = usePlatformCatalog ? 'Platform users' : 'Organization users';
  const listSubtitle = (() => {
    if (canUpdateRoles) {
      return usePlatformCatalog
        ? 'Cross-tenant registry view. Edit and role assignment apply only within your tenant.'
        : 'Edit users in your organization.';
    }
    if (canViewAudit) {
      return usePlatformCatalog
        ? 'Read-only registry view. Audit history is available for users in your tenant.'
        : 'Read-only directory. Open audit history per user when available.';
    }
    return 'Read-only directory of people in your organization.';
  })();

  return (
    <div className="space-y-4">
      <Card className={adminStyles.adminCardClass}>
        <CardHeader>
          <CardTitle className={adminStyles.adminTitleClass}>
            {listTitle}
          </CardTitle>
          <p className={adminStyles.adminSubtitleClass}>
            {listSubtitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, display code, idp id…"
              className={cn('pl-9', adminStyles.inputClass)}
            />
          </div>
          {listError && <p className="text-sm text-red-400">{listError}</p>}
          <div className={adminStyles.adminTableWrapClass}>
            <table className={adminStyles.adminTableClass}>
              <thead className={adminStyles.adminTheadClass}>
                <tr>
                  <th className={adminStyles.adminThClass}>Name</th>
                  <th className={adminStyles.adminThClass}>Display code</th>
                  <th className={adminStyles.adminThClass}>Email</th>
                  <th className={adminStyles.adminThClass}>Roles</th>
                  <th className={adminStyles.adminThClass}>Tenant</th>
                  {showRowActions ? <th className={adminStyles.adminThClass} /> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showRowActions ? 6 : 5} className={adminStyles.adminEmptyCellClass}>
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={showRowActions ? 6 : 5} className={adminStyles.adminEmptyCellClass}>
                      Users appear after first login
                    </td>
                  </tr>
                ) : (
                  items.map((user) => (
                    <tr key={user.uuid} className={adminStyles.adminTrClass}>
                      <td className={adminStyles.adminTdPrimaryClass}>{displayName(user)}</td>
                      <td className={adminStyles.adminTdMonoClass}>
                        {user.display_code ?? '—'}
                      </td>
                      <td className={adminStyles.adminTdMutedClass}>{user.email ?? '—'}</td>
                      <td className={cn(adminStyles.adminTdMutedClass, 'max-w-xs truncate')}>
                        {user.roles.join(', ') || '—'}
                      </td>
                      <td className={adminStyles.adminTdMutedClass}>
                        {tenantNames[user.tenant_uuid] ?? `${user.tenant_uuid.slice(0, 8)}…`}
                      </td>
                      {showRowActions ? (
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {canAuditUser(user) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Audit history"
                                onClick={() => openAudits(user)}
                              >
                                <ClockIcon className="size-4" />
                              </Button>
                            ) : null}
                            {canEditUser(user) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Edit user"
                                onClick={() => openEdit(user)}
                              >
                                <PencilSquareIcon className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <RemoteListPagination
            total={total}
            totalLabel={total === 1 ? 'user' : 'users'}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <UserRegistryEditSheet
        open={editDraft !== null}
        draft={editDraft}
        tenantLabel={
          editDraft
            ? tenantNames[editDraft.tenant_uuid] ?? editDraft.tenant_uuid
            : ''
        }
        saving={editSaving}
        error={editError}
        assignableRoles={assignableRoles}
        roleDefinitions={roleDefinitions}
        sessionActors={sessionActors}
        onOpenChange={(open) => {
          if (!open) {
            closeEdit();
          }
        }}
        onDraftChange={(patch) =>
          setEditDraft((current) => (current ? { ...current, ...patch } : current))
        }
        onSubmit={() => void submitEdit()}
      />

      <AuditHistorySheet
        open={!!auditUser}
        onOpenChange={(open) => !open && setAuditUser(null)}
        title={(
          <>
            Audit history —{' '}
            {auditUser ? (
              <>
                <span className={cn('normal-case', formStyles.bodyTextClass)}>{displayName(auditUser)}</span>{' '}
                <span className={cn('font-mono normal-case', formStyles.mutedTextClass)}>({auditUser.uuid})</span>
              </>
            ) : null}
          </>
        )}
        sections={[
          buildAuditSection(
            {
              key: 'user',
              kind: 'user',
              actions: userAudits.total > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={formStyles.sheetCancelButtonClass}
                  disabled={auditDownloading}
                  onClick={() => void handleAuditDownload()}
                >
                  <ArrowDownTrayIcon className="size-4" />
                  {auditDownloading ? 'Exporting…' : 'Download CSV'}
                </Button>
              ) : undefined,
              emptyMessage: 'No history rows yet',
              errorMessage: 'Failed to load audit history.',
            },
            userAudits,
          ),
        ]}
      />
    </div>
  );
}
