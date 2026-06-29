import { lazy } from 'react';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';

const ServiceManagement = lazy(() => import('@/features/admin/components/ServiceManagement'));
const UserManagement = lazy(() => import('@/features/admin/components/UserManagement'));

function useAdminSession() {
  const { session } = useAuthenticatedSession();
  if (!session.tokenInfo) {
    return null;
  }
  return session;
}

export function AdminServicesPage() {
  const session = useAdminSession();
  if (!session) {
    return null;
  }

  return (
    <ServiceManagement token={session.tokenInfo!.raw} activeActor={session.activeActor} />
  );
}

export function AdminUsersPage() {
  const session = useAdminSession();
  if (!session) {
    return null;
  }

  return (
    <UserManagement
      token={session.tokenInfo!.raw}
      activeActor={session.activeActor}
      sessionActors={session.sessionActors}
      roleCatalog={session.roleCatalog}
      profileUuid={session.profile?.uuid}
      onSelfRolesUpdated={() => {
        void session.fetchSessionData();
      }}
      sessionTenantUuid={session.sessionTenantUuid}
      entitlements={session.activeRoleEntitlements}
    />
  );
}
