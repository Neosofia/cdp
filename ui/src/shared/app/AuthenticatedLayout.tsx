import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import RouteLoadingFallback from '@/shared/app/RouteLoadingFallback';
import { cn } from '@/shared/core/utils';
import { clinicianPatientUuidFromPath, isPatientPath, patientActionFromPath } from '@/shared/app/appRoutes';

export default function AuthenticatedLayout() {
  const { pathname } = useLocation();
  const fillViewport =
    (isPatientPath(pathname) && patientActionFromPath(pathname) === 'Chat') ||
    Boolean(clinicianPatientUuidFromPath(pathname));

  return (
    <AppShell>
      <div
        className={cn(
          'w-full',
          fillViewport && 'flex min-h-0 flex-1 flex-col overflow-hidden',
        )}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </AppShell>
  );
}
