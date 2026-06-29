import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import StarField from '@/components/StarField';
import { AuthenticatedSessionProvider } from '@/shared/session/AuthenticatedSessionContext';
import { AppShellTrailingProvider } from '@/shared/app/AppShellTrailingContext';
import { usePostCareEnrollment } from '@/features/clinician/lib/usePostCareEnrollment';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';
import { useAppNavigation } from '@/shared/app/useAppNavigation';
import { useDebugApiTest } from '@/shared/app/useDebugApiTest';
import type { useAuthSession } from '@/shared/session/useAuthSession';
import AuthenticatedLayout from '@/shared/app/AuthenticatedLayout';
import DashboardPage from '@/shared/app/DashboardPage';
import DebugPage, { UnknownRouteRedirect } from '@/shared/app/DebugPage';
import PatientPage from '@/features/patient/routes/PatientPage';
import ClinicianPatientsPage from '@/features/clinician/routes/ClinicianPatientsPage';
import { AdminServicesPage, AdminUsersPage } from '@/features/admin/routes/AdminPages';
import type { MutableRefObject } from 'react';

type AuthSession = ReturnType<typeof useAuthSession>;

export interface AuthenticatedAppProps {
  session: AuthSession;
  clearTestResultRef: MutableRefObject<() => void>;
}

export default function AuthenticatedApp({ session, clearTestResultRef }: AuthenticatedAppProps) {
  const { isCorporate } = useUiTheme();

  const {
    tokenInfo,
    profile,
    activeActor,
  } = session;

  const navigation = useAppNavigation({
    onBeforeNavigate: () => clearTestResultRef.current(),
  });

  const [rosterRevision, setRosterRevision] = useState(0);
  const bumpRoster = useCallback(() => {
    setRosterRevision((value) => value + 1);
  }, []);

  const enrollInPostCare = usePostCareEnrollment(tokenInfo?.raw, activeActor, bumpRoster);

  const { testResult, clearTestResult, runDebugTest } = useDebugApiTest({
    token: tokenInfo?.raw,
    activeActor,
    fetchSessionData: session.fetchSessionData,
    goToDebugApi: navigation.goToDebugApi,
  });

  useEffect(() => {
    clearTestResultRef.current = clearTestResult;
  }, [clearTestResult, clearTestResultRef]);

  if (!tokenInfo || !profile) {
    return null;
  }

  return (
    <AppShellTrailingProvider>
      <AuthenticatedSessionProvider
        value={{
          session,
          rosterRevision,
          bumpRoster,
          enrollInPostCare,
          navigation,
          testResult,
          runDebugTest,
          isCorporate,
        }}
      >
        <div
          className={cn(
            'relative flex h-dvh min-h-0 w-full flex-col overflow-hidden font-sans',
            isCorporate ? 'bg-white text-slate-900' : undefined,
          )}
          style={isCorporate ? undefined : { background: '#05050f' }}
        >
          {!isCorporate ? (
            <div className="fixed inset-0 pointer-events-none z-0">
              <StarField />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.05) 50%, transparent 80%)',
                }}
              />
            </div>
          ) : null}

          <Routes>
            <Route element={<AuthenticatedLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="patient/:patientAction" element={<PatientPage />} />
              <Route path="clinician/patients" element={<ClinicianPatientsPage />} />
              <Route path="clinician/patients/:patientUuid" element={<ClinicianPatientsPage />} />
              <Route path="admin/services" element={<AdminServicesPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="debug/api" element={<DebugPage />} />
              <Route path="*" element={<UnknownRouteRedirect />} />
            </Route>
          </Routes>
        </div>
      </AuthenticatedSessionProvider>
    </AppShellTrailingProvider>
  );
}
